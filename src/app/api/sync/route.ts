import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const maxDuration = 60

// Lightweight GitHub fetch helper
async function ghFetch(endpoint: string, token: string) {
    const res = await fetch(`https://api.github.com${endpoint}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "DevLens-App",
        },
    })
    if (!res.ok) throw new Error(`GitHub ${res.status}: ${res.statusText}`)
    return res.json()
}

export async function POST() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const userId = session.user.id

        const account = await prisma.account.findFirst({
            where: { userId, provider: "github" },
        })

        if (!account?.access_token) {
            return new NextResponse("No GitHub account linked", { status: 400 })
        }

        const token = account.access_token

        // 1. Fetch GitHub user info
        let userData: any
        try {
            userData = await ghFetch("/user", token)
        } catch {
            return NextResponse.json(
                { error: "GitHub token invalid or expired. Please sign out and sign back in." },
                { status: 401 }
            )
        }

        const githubUsername = userData.login
        if (!githubUsername) {
            return new NextResponse("Could not fetch GitHub username", { status: 400 })
        }

        // 2. Update user profile immediately
        await prisma.user.update({
            where: { id: userId },
            data: { githubUsername, githubId: userData.id },
        })

        // 3. Fetch repos (single API call, limit to 30 most recent)
        const repos: any[] = await ghFetch(
            `/user/repos?sort=updated&per_page=30&affiliation=owner,collaborator`,
            token
        )

        // 4. Upsert repos in a single transaction (fast batch)
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

        // 5. Build language stats from repo primary languages (NO extra API calls)
        // Instead of fetching /repos/{name}/languages for each repo (N API calls),
        // we use the primary language field already returned in the repos list.
        // This gives a good approximation without the massive API overhead.
        const languageMap = new Map<string, number>()
        for (const repo of repos) {
            if (repo.language) {
                languageMap.set(
                    repo.language,
                    (languageMap.get(repo.language) || 0) + (repo.size || 1) * 1024
                )
            }
        }

        // Replace all languages in a single transaction
        await prisma.$transaction([
            prisma.language.deleteMany({ where: { userId } }),
            ...Array.from(languageMap.entries()).map(([name, bytes]) =>
                prisma.language.create({
                    data: { name, bytes, userId },
                })
            ),
        ])

        // 6. Fetch commits from top 5 repos only (5 API calls max, not 10)
        const since = new Date()
        since.setFullYear(since.getFullYear() - 1)
        const sinceISO = since.toISOString()

        const topRepos = repos.slice(0, 5)
        const commitResults = await Promise.allSettled(
            topRepos.map(async (repo: any) => {
                const commits = await ghFetch(
                    `/repos/${repo.full_name}/commits?author=${githubUsername}&since=${sinceISO}&per_page=50`,
                    token
                )
                return commits.map((c: any) => ({
                    sha: c.sha,
                    message: c.commit?.message || "",
                    date: c.commit?.author?.date || new Date().toISOString(),
                    url: c.html_url || "",
                    repoGithubId: repo.id,
                }))
            })
        )

        // Collect successful commits
        const allCommits: any[] = []
        for (const result of commitResults) {
            if (result.status === "fulfilled") {
                allCommits.push(...result.value)
            }
        }

        // 7. Build repo ID cache from DB in one query (not per-commit)
        const repoGithubIds = [...new Set(allCommits.map((c) => c.repoGithubId))]
        const dbRepos = await prisma.repository.findMany({
            where: { githubId: { in: repoGithubIds } },
            select: { id: true, githubId: true },
        })
        const repoIdMap = new Map(dbRepos.map((r) => [r.githubId, r.id]))

        // 8. Upsert commits in a single transaction
        const validCommits = allCommits.filter((c) => repoIdMap.has(c.repoGithubId))

        if (validCommits.length > 0) {
            // Process in a single transaction, limit to 100 most recent commits
            const sortedCommits = validCommits
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 100)

            await prisma.$transaction(
                sortedCommits.map((commit) =>
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

        // 9. Update sync timestamp
        await prisma.user.update({
            where: { id: userId },
            data: { lastSyncAt: new Date() },
        })

        return NextResponse.json({
            success: true,
            message: "Sync completed",
            stats: {
                repos: repos.length,
                languages: languageMap.size,
                commits: validCommits.length,
            },
        })
    } catch (error) {
        console.error("[SYNC_ERROR]", error)
        return NextResponse.json(
            { error: "Sync failed. Please try again." },
            { status: 500 }
        )
    }
}
