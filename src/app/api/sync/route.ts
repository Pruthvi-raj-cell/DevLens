import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

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

// ----------------------------------------------------------------------
// Modular Sync Steps
// ----------------------------------------------------------------------

async function fetchAndStoreProfile(userId: string, token: string) {
    console.log("[SYNC] Step 1: Fetching profile...");
    const userData = await ghFetchWithTimeout("/user", token)
    if (!userData.login) throw new Error("Missing GitHub username")
    
    await prisma.user.update({
        where: { id: userId },
        data: { githubUsername: userData.login, githubId: userData.id },
    })
    console.log("[SYNC] Step 1: Profile synced.");
    return userData.login
}

async function fetchAndStoreRepos(userId: string, token: string) {
    console.log("[SYNC] Step 2: Fetching repositories...");
    const repos: any[] = await ghFetchWithTimeout(
        "/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator",
        token
    )

    console.log(`[SYNC] Step 2: Preparing ${repos.length} Repos for DB batch insertion...`);

    // Batch insert repos in chunks of 50 to prevent DB locks
    const repoChunks = [];
    for (let i = 0; i < repos.length; i += 50) {
        repoChunks.push(repos.slice(i, i + 50));
    }

    let b = 1;
    for (const chunk of repoChunks) {
        console.log(`[SYNC] Step 2: Inserting Repos batch ${b++}/${repoChunks.length}`);
        await prisma.$transaction(
            chunk.map((repo: any) =>
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
    }
    console.log("[SYNC] Step 2: Repositories synced.");
    return repos
}

async function syncPreciseLanguages(userId: string, repos: any[], token: string, startTime: number) {
    console.log(`[SYNC] Step 3: Fetching precise languages for ${repos.length} dynamic repos...`);
    const languageMap = new Map<string, number>()
    
    let processed = 0;
    for (let i = 0; i < repos.length; i += BATCH_SIZE) {
        if (Date.now() - startTime > GLOBAL_TIMEOUT_MS) {
            console.warn("[SYNC] Global timeout reached during language fetch.");
            break;
        }
        const batch = repos.slice(i, i + BATCH_SIZE)
        console.log(`[SYNC] Step 3: Fetching languages batch ${Math.ceil(i/BATCH_SIZE) + 1}/${Math.ceil(repos.length/BATCH_SIZE)}`);
        
        const batchResults = await Promise.allSettled(
            batch.map(repo => {
                const url = repo.languages_url.replace("https://api.github.com", "")
                return ghFetchWithTimeout(url, token)
            })
        )
        
        for (const res of batchResults) {
            if (res.status === 'fulfilled' && res.value) {
                Object.entries(res.value).forEach(([langName, bytes]: [string, any]) => {
                    languageMap.set(langName, (languageMap.get(langName) || 0) + bytes)
                })
                processed++;
            }
        }
    }

    if (languageMap.size > 0) {
        console.log(`[SYNC] Step 3: Writing ${languageMap.size} unique languages to database...`);
        // We delete manually instead of upserting completely fresh because user could have multiple language sources in theory,
        // though typically they wipe and recreate safely
        await prisma.$transaction([
            prisma.language.deleteMany({ where: { userId } }),
            ...Array.from(languageMap.entries()).map(([name, bytes]) =>
                prisma.language.create({ data: { name, bytes, userId } })
            ),
        ])
    }
    console.log("[SYNC] Step 3: Languages synced.");
    return processed
}

async function syncCommits(userId: string, githubUsername: string, repos: any[], token: string, startTime: number) {
    console.log(`[SYNC] Step 4: Syncing commits for ${repos.length} dynamic repos...`);
    const since = new Date()
    since.setFullYear(since.getFullYear() - 1)
    const sinceISO = since.toISOString()

    // Pre-map the repo ids (1 fast query)
    const repoIdsMap = new Map<number, string>();
    const dbRepos = await prisma.repository.findMany({
        where: { githubId: { in: repos.map(r => r.id) } },
        select: { id: true, githubId: true }
    });
    dbRepos.forEach(r => repoIdsMap.set(r.githubId, r.id));

    let commitsInserted = 0;

    // Streaming commits mapping (process by batch, then immediately DB bulk-upsert avoiding high-memory usage)
    for (let i = 0; i < repos.length; i += BATCH_SIZE) {
        if (Date.now() - startTime > GLOBAL_TIMEOUT_MS) {
            console.warn("[SYNC] Global timeout reached during commits fetch.");
            break;
        }

        const batchNum = Math.ceil(i/BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(repos.length/BATCH_SIZE);
        console.log(`[SYNC] Step 4: Fetching commits batch ${batchNum}/${totalBatches}`);

        const batch = repos.slice(i, i + BATCH_SIZE)
        const batchResults = await Promise.allSettled(
            batch.map(repo => 
                ghFetchWithTimeout(
                    `/repos/${repo.full_name}/commits?author=${githubUsername}&since=${sinceISO}&per_page=100`,
                    token
                ).then(data => data.map((c: any) => ({
                    sha: c.sha,
                    message: (c.commit?.message || "").substring(0, 500),
                    date: new Date(c.commit?.author?.date || new Date().toISOString()),
                    url: c.html_url || "",
                    repoGithubId: repo.id,
                })))
            )
        )

        // Flatten valid commits in this batch
        const batchCommits = []
        for (const res of batchResults) {
            if (res.status === 'fulfilled' && res.value) {
                batchCommits.push(...res.value)
            } else if (res.status === 'rejected') {
                console.warn(`[SYNC] Commits fetch partially failed in batch ${batchNum}:`, res.reason);
            }
        }

        // Filter id and build upsert queries
        const validCommits = batchCommits.filter(c => repoIdsMap.has(c.repoGithubId));
        if (validCommits.length === 0) continue;

        // Sub-chunk DB inserts inside the batch (Max 50 atomic upserts at a time to prevent DB lock)
        console.log(`[SYNC] Step 4: Found ${validCommits.length} commits in batch ${batchNum}, inserting...`);
        for (let j = 0; j < validCommits.length; j += 50) {
            const chunk = validCommits.slice(j, j + 50);
            await prisma.$transaction(
                chunk.map((commit: any) =>
                    prisma.commit.upsert({
                        where: { sha: commit.sha }, // Ensures exact idempotency
                        update: {}, // Avoids touching if it already exists
                        create: {
                            sha: commit.sha,
                            message: commit.message,
                            date: commit.date,
                            url: commit.url,
                            userId,
                            repositoryId: repoIdsMap.get(commit.repoGithubId)!,
                        },
                    })
                )
            )
        }
        commitsInserted += validCommits.length;
    }
    
    console.log(`[SYNC] Step 4: Commits synced. Total: ${commitsInserted}`);
    return commitsInserted
}

// ----------------------------------------------------------------------
// API Route
// ----------------------------------------------------------------------

export async function POST() {
    const startTime = Date.now();
    console.log("[SYNC] Starting GitHub Sync...");
    
    const structuredResponse: any = {
        success: false,
        profile: "pending",
        repos: "pending",
        languages: "pending",
        commits: "pending"
    };

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
            structuredResponse.profile = "done";
        } catch (error) {
            console.error("[SYNC_ERROR] Profile Fetch Failed:", error);
            structuredResponse.profile = "failed";
            throw new Error(`Profile sync failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        if (Date.now() - startTime > GLOBAL_TIMEOUT_MS) {
            console.warn("[SYNC] Global timeout triggered after Profile Auth.");
            structuredResponse.error = "Timeout constraint triggered";
            return NextResponse.json(structuredResponse, { status: 200 })
        }

        // 2. Repos Sync (Baseline)
        let repos: any[] = [];
        try {
            repos = await fetchAndStoreRepos(userId, token)
            structuredResponse.repos = "done";
            structuredResponse.insertedReposCount = repos.length;
        } catch (error) {
            console.error("[SYNC_ERROR] Repos Fetch Failed:", error);
            structuredResponse.repos = "failed";
            throw new Error(`Repos sync failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        // Dynamically select Top 20 repos by Recent Activity to heavily optimize deep-syncing 
        const topReposForSync = repos
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            .slice(0, 20)

        // 3. Deep Sync Languages (Batched & Timeout-Aware)
        try {
            const langCount = await syncPreciseLanguages(userId, topReposForSync, token, startTime)
            structuredResponse.languages = "done";
            structuredResponse.insertedLanguagesCount = langCount;
        } catch (error) {
            console.error("[SYNC_ERROR] Languages Sync Partial Failure:", error);
            structuredResponse.languages = "partial/failed";
        }

        // 4. Deep Sync Commits (Batched & Memory/Streaming DB inserts)
        try {
            const commitsCount = await syncCommits(userId, githubUsername, topReposForSync, token, startTime)
            structuredResponse.commits = "done";
            structuredResponse.insertedCommitsCount = commitsCount;
        } catch (error) {
            console.error("[SYNC_ERROR] Commits Sync Partial Failure:", error);
            structuredResponse.commits = "partial/failed";
        }

        // 5. Success Tracking
        await prisma.user.update({
            where: { id: userId },
            data: { lastSyncAt: new Date() },
        })

        // Force Purge Next.js Server Routing Cache
        revalidatePath('/dashboard')

        const endTime = Date.now()
        console.log(`[SYNC:SUCCESS] Processed completely and cache purged in ${endTime - startTime}ms`);

        structuredResponse.success = true;
        structuredResponse.executionTimeMs = endTime - startTime;
        structuredResponse.userIdUsed = userId;

        console.log(`[SYNC:FINAL] insertedReposCount: ${structuredResponse.insertedReposCount || 0}, insertedCommitsCount: ${structuredResponse.insertedCommitsCount || 0}, insertedLanguagesCount: ${structuredResponse.insertedLanguagesCount || 0}, userIdUsed: ${structuredResponse.userIdUsed}`);

        return NextResponse.json(structuredResponse)
    } catch (error: any) {
        console.error("[SYNC_CRITICAL_ERROR]", error)
        structuredResponse.error = error.message || String(error);
        // We return 500 only if critical phases (Auth/Repos) totally fail. Otherwise structure returns partial success.
        return NextResponse.json(structuredResponse, { status: 500 })
    }
}
