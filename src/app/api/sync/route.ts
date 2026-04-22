import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Global Timeout limit
export const maxDuration = 10;
const GLOBAL_TIMEOUT_MS = 4500;
const BATCH_SIZE = 5;
const REQUEST_TIMEOUT_MS = 5000;

// ----------------------------------------------------------------------
// Core Abstractions for Future Async Export
// ----------------------------------------------------------------------

async function ghFetchWithTimeout(endpoint: string, token: string) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    
    try {
        const res = await fetch(`https://api.github.com${endpoint}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json",
                "User-Agent": "DevLens-App",
            },
            signal: controller.signal
        })
        if (!res.ok) throw new Error(`GitHub ${res.status}: ${res.statusText}`)
        return await res.json()
    } finally {
        clearTimeout(timeoutId)
    }
}

async function processInBatches<T, R>(
    items: T[],
    batchSize: number,
    startTime: number,
    processFn: (item: T) => Promise<R>
): Promise<R[]> {
    const results: R[] = []
    for (let i = 0; i < items.length; i += batchSize) {
        if (Date.now() - startTime > GLOBAL_TIMEOUT_MS) {
            console.warn("Global timeout reached. Bailing batch loop prematurely.");
            break;
        }
        const batch = items.slice(i, i + batchSize)
        const batchResults = await Promise.allSettled(batch.map(processFn))
        
        for (const res of batchResults) {
            if (res.status === 'fulfilled' && res.value !== undefined) {
                results.push(res.value)
            }
        }
    }
    return results
}

// ----------------------------------------------------------------------
// Modular Sync Steps
// ----------------------------------------------------------------------

async function fetchAndStoreProfile(userId: string, token: string) {
    const userData = await ghFetchWithTimeout("/user", token)
    if (!userData.login) throw new Error("Missing GitHub username")
    
    await prisma.user.update({
        where: { id: userId },
        data: { githubUsername: userData.login, githubId: userData.id },
    })
    return userData.login
}

async function fetchAndStoreRepos(userId: string, token: string) {
    const repos: any[] = await ghFetchWithTimeout(
        "/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator",
        token
    )

    // Fast batch upsert for standard repo metadata
    await prisma.$transaction(
        repos.map((repo: any) =>
            prisma.repository.upsert({
                where: { githubId: repo.id },
                update: {
                    name: repo.name,
                    fullName: repo.full_name,
                    description: repo.description,
                    url: repo.html_url,
                    stars: repo.stargazers_count,
                    forks: repo.forks_count,
                    language: repo.language,
                    updatedAt: new Date(repo.updated_at),
                },
                create: {
                    githubId: repo.id,
                    name: repo.name,
                    fullName: repo.full_name,
                    description: repo.description,
                    url: repo.html_url,
                    stars: repo.stargazers_count,
                    forks: repo.forks_count,
                    language: repo.language,
                    userId,
                },
            })
        )
    )
    
    return repos
}

async function syncPreciseLanguages(userId: string, repos: any[], token: string, startTime: number) {
    const languageMap = new Map<string, number>()
    
    await processInBatches(repos, BATCH_SIZE, startTime, async (repo) => {
        const url = repo.languages_url.replace("https://api.github.com", "")
        const data = await ghFetchWithTimeout(url, token)
        Object.entries(data).forEach(([langName, bytes]: [string, any]) => {
            languageMap.set(langName, (languageMap.get(langName) || 0) + bytes)
        })
    })

    if (languageMap.size > 0) {
        await prisma.$transaction([
            prisma.language.deleteMany({ where: { userId } }),
            ...Array.from(languageMap.entries()).map(([name, bytes]) =>
                prisma.language.create({ data: { name, bytes, userId } })
            ),
        ])
    }
    
    return languageMap.size
}

async function syncCommits(userId: string, githubUsername: string, repos: any[], token: string, startTime: number) {
    const since = new Date()
    since.setFullYear(since.getFullYear() - 1)
    const sinceISO = since.toISOString()

    const commitGroups = await processInBatches(repos, BATCH_SIZE, startTime, async (repo) => {
        const data = await ghFetchWithTimeout(
            `/repos/${repo.full_name}/commits?author=${githubUsername}&since=${sinceISO}&per_page=100`,
            token
        )
        return data.map((c: any) => ({
            sha: c.sha,
            message: c.commit?.message || "",
            date: c.commit?.author?.date || new Date().toISOString(),
            url: c.html_url || "",
            repoGithubId: repo.id,
        }))
    })

    const allCommits = commitGroups.flat()
    
    if (allCommits.length > 0) {
        const repoGithubIds = Array.from(new Set(allCommits.map((c) => c.repoGithubId)))
        const dbRepos = await prisma.repository.findMany({
            where: { githubId: { in: repoGithubIds } },
            select: { id: true, githubId: true },
        })
        const repoIdMap = new Map(dbRepos.map((r) => [r.githubId, r.id]))

        const validCommits = allCommits.filter((c) => repoIdMap.has(c.repoGithubId))
        
        // Only run the db insert if we haven't blown completely past the global timeout limit
        if (Date.now() - startTime < GLOBAL_TIMEOUT_MS + 2000) {
            await prisma.$transaction(
                validCommits.map((commit) =>
                    prisma.commit.upsert({
                        where: { sha: commit.sha },
                        update: {},
                        create: {
                            sha: commit.sha,
                            message: commit.message.substring(0, 500),
                            date: new Date(commit.date),
                            url: commit.url,
                            userId,
                            repositoryId: repoIdMap.get(commit.repoGithubId)!,
                        },
                    })
                )
            )
        }
    }

    return allCommits.length
}

// ----------------------------------------------------------------------
// API Route
// ----------------------------------------------------------------------

export async function POST() {
    const startTime = Date.now();
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })

        const userId = session.user.id
        const account = await prisma.account.findFirst({
            where: { userId, provider: "github" },
        })

        if (!account?.access_token) return new NextResponse("No GitHub account linked", { status: 400 })
        const token = account.access_token

        // 1. Profile Sync
        let githubUsername: string;
        try {
            githubUsername = await fetchAndStoreProfile(userId, token)
        } catch {
            return NextResponse.json(
                { error: "GitHub token invalid. Please sign out and sign back in." },
                { status: 401 }
            )
        }

        // Bail out randomly if GitHub took too long
        if (Date.now() - startTime > GLOBAL_TIMEOUT_MS) throw new Error("Timeout early on");

        // 2. Repos Sync (Baseline)
        const repos = await fetchAndStoreRepos(userId, token)

        // Dynamically select Top 20 repos by Recent Activity to heavily optimize deep-syncing 
        const topReposForSync = repos
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            .slice(0, 20)

        // 3. Deep Sync Languages (Batched & Timeout-Aware)
        const langCount = await syncPreciseLanguages(userId, topReposForSync, token, startTime)

        // 4. Deep Sync Commits (Batched & Timeout-Aware)
        const totalCommitsProcessed = await syncCommits(userId, githubUsername, topReposForSync, token, startTime)

        // 5. Success Tracking
        await prisma.user.update({
            where: { id: userId },
            data: { lastSyncAt: new Date() },
        })

        const endTime = Date.now()

        return NextResponse.json({
            success: true,
            message: "Sync completed",
            stats: {
                repos: repos.length,
                topReposDeepScanned: topReposForSync.length,
                languagesProcessed: langCount,
                commitsProcessed: totalCommitsProcessed,
                executionTimeMs: endTime - startTime
            },
        })
    } catch (error) {
        console.error("[SYNC_ERROR]", error)
        return NextResponse.json(
            { error: "Sync failed completely, likely severe timeout or db outage." },
            { status: 500 }
        )
    }
}
