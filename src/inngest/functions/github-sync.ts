import { inngest } from "../client";
import { prisma } from "@/lib/prisma";

const REQUEST_TIMEOUT_MS = 5000;
const BATCH_SIZE_DB = 50;
const MAX_CONCURRENCY = 5;

// Helper to chunk an array
function chunkArray<T>(array: T[], size: number): T[][] {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

// Fetch helper with AbortController based timeout
async function ghFetchWithTimeout(endpoint: string, token: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`https://api.github.com${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "DevLens-App",
      },
      signal: controller.signal,
    });
    
    if (!res.ok) {
      if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0") {
         throw new Error("GitHub rate limit exceeded");
      }
      throw new Error(`GitHub ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

// Concurrency helper (Executes map asynchronously with a hard limit on promises)
async function mapConcurrent<T, R>(items: T[], maxConcurrency: number, fn: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  let index = 0;
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  
  const worker = async () => {
    while (index < items.length) {
      const currentIndex = index++;
      try {
        const val = await fn(items[currentIndex]);
        results[currentIndex] = { status: "fulfilled", value: val };
      } catch (err) {
        results[currentIndex] = { status: "rejected", reason: err };
      }
    }
  };
  
  const workers = [];
  for (let i = 0; i < maxConcurrency; i++) {
    workers.push(worker());
  }
  await Promise.allSettled(workers);
  
  return results;
}

export const githubSyncJob = inngest.createFunction(
  { 
    id: "github-sync",
    triggers: [{ event: "github/sync" }],
    retries: 3 // Enable up to 3 retries locally
  },
  async ({ event, step }) => {
    const { userId, token } = event.data;

    await step.run("Mark Sync Running", async () => {
       await prisma.user.update({
         where: { id: userId },
         data: { syncStatus: "running", syncProgress: 0, syncError: null }
       });
    });

    try {
      // Step 1: Profile
      const profile = await step.run("Fetch Profile", async () => {
        console.log("[SYNC] Fetch profile");
        const userData = await ghFetchWithTimeout("/user", token);
        if (!userData.login) throw new Error("Missing GitHub username");
        
        await prisma.user.update({
          where: { id: userId },
          data: { 
            githubUsername: userData.login,
            githubId: userData.id,
            syncProgress: 20
          },
        });
        return userData;
      });

      // Step 2: Repos
      const repos = await step.run("Fetch Repos", async () => {
        console.log("[SYNC] Fetch repos");
        const reposData: any[] = await ghFetchWithTimeout(
          "/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator",
          token
        );

        console.log(`[SYNC] Processing ${reposData.length} repos...`);
        const repoChunks = chunkArray(reposData, BATCH_SIZE_DB);
        
        for (let i = 0; i < repoChunks.length; i++) {
           console.log(`[SYNC] Processing batch ${i + 1}/${repoChunks.length}`);
           const chunk = repoChunks[i];
           
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
           );
        }

        await prisma.user.update({
          where: { id: userId },
          data: { syncProgress: 40 },
        });

        // Limit to top 20 mostly recently updated ones for deep syncs (like previous architecture)
        return reposData.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 20);
      });

      // Step 3: Languages
      await step.run("Fetch Languages", async () => {
        console.log(`[SYNC] Fetch languages for ${repos.length} top repos`);
        const languageMap = new Map<string, number>();

        const results = await mapConcurrent(repos, MAX_CONCURRENCY, repo => {
             const url = repo.languages_url.replace("https://api.github.com", "");
             return ghFetchWithTimeout(url, token);
        });

        results.forEach((res) => {
           if (res.status === 'fulfilled' && res.value) {
               Object.entries(res.value).forEach(([langName, bytes]: [string, any]) => {
                   languageMap.set(langName, (languageMap.get(langName) || 0) + bytes)
               })
           } else if (res.status === 'rejected') {
               console.warn(`[SYNC] Repo language fetch failed:`, res.reason);
           }
        });

        if (languageMap.size > 0) {
            console.log(`[SYNC] Writing ${languageMap.size} unique languages to database...`);
            const langEntries = Array.from(languageMap.entries());
            const chunks = chunkArray(langEntries, BATCH_SIZE_DB);
            for(const chunk of chunks) {
                await prisma.$transaction(
                    chunk.map(([name, bytes]) => 
                        prisma.language.upsert({
                            where: {
                                userId_name: {
                                    userId,
                                    name
                                }
                            },
                            update: { bytes },
                            create: { name, bytes, userId }
                        })
                    )
                );
            }
        }

        await prisma.user.update({
          where: { id: userId },
          data: { syncProgress: 70 },
        });
      });

      // Step 4: Commits
      await step.run("Fetch Commits", async () => {
        console.log(`[SYNC] Fetch commits for ${repos.length} repos`);
        const since = new Date();
        since.setFullYear(since.getFullYear() - 1);
        const sinceISO = since.toISOString();

        const dbRepos = await prisma.repository.findMany({
            where: { githubId: { in: repos.map(r => r.id) } },
            select: { id: true, githubId: true }
        });
        const repoIdsMap = new Map<number, string>();
        dbRepos.forEach(r => repoIdsMap.set(r.githubId, r.id));

        const results = await mapConcurrent(repos, MAX_CONCURRENCY, repo => {
            return ghFetchWithTimeout(
                `/repos/${repo.full_name}/commits?author=${profile.login}&since=${sinceISO}&per_page=100`,
                token
            ).then(data => (Array.isArray(data) ? data : []).map((c: any) => ({
                sha: c.sha,
                message: (c.commit?.message || "").substring(0, 500),
                date: new Date(c.commit?.author?.date || new Date().toISOString()),
                url: c.html_url || "",
                repoGithubId: repo.id,
            })));
        });

        const allCommits = [];
        for (const res of results) {
            if (res.status === 'fulfilled' && res.value) {
                allCommits.push(...res.value);
            } else if (res.status === 'rejected') {
                console.warn(`[SYNC] Commits fetch failed:`, res.reason);
            }
        }

        const validCommits = allCommits.filter(c => repoIdsMap.has(c.repoGithubId));
        console.log(`[SYNC] Found ${validCommits.length} commits total`);

        const commitChunks = chunkArray(validCommits, BATCH_SIZE_DB);
        for(let j = 0; j < commitChunks.length; j++) {
            const chunk = commitChunks[j];
            console.log(`[SYNC] Inserted ${chunk.length} commits (${j+1}/${commitChunks.length})`);
            await prisma.$transaction(
                chunk.map((commit: any) => 
                    prisma.commit.upsert({
                        where: { sha: commit.sha },
                        update: {}, // Does NOT duplicate, just ignores existing
                        create: {
                            sha: commit.sha,
                            message: commit.message,
                            date: commit.date,
                            url: commit.url,
                            userId,
                            repositoryId: repoIdsMap.get(commit.repoGithubId)!,
                        }
                    })
                )
            );
        }

        await prisma.user.update({
          where: { id: userId },
          data: { syncProgress: 100, syncStatus: "completed", lastSyncAt: new Date() },
        });
        console.log("[SYNC] Sync completed safely and securely!");
      });

      return { success: true };
    } catch (error: any) {
      console.error("[SYNC] Sync Failed:", error);
      
      // Update DB with failure state (outside of the step scope so we guarantee it logs if any step throws)
      await step.run("Mark Sync Failed", async () => {
         await prisma.user.update({
           where: { id: userId },
           data: { syncStatus: "failed", syncError: error.message || String(error) }
         });
      });

      // Rethrow so Inngest handles retries
      throw error;
    }
  }
);
