import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { GitHubService } from "@/services/github"

export async function POST() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const account = await prisma.account.findFirst({
            where: {
                userId: session.user.id,
                provider: "github"
            }
        })

        if (!account?.access_token) {
            return new NextResponse("No GitHub account linked", { status: 400 })
        }

        // Fetch the user's actual GitHub username dynamically
        const userRes = await fetch("https://api.github.com/user", {
            headers: { 
                "Authorization": `Bearer ${account.access_token}`,
                "User-Agent": "DevLens-App",
                "Accept": "application/vnd.github.v3+json"
            }
        })
        
        if (!userRes.ok) {
            console.error("[SYNC] Failed to fetch GitHub user:", await userRes.text())
            // Clear invalid token string from DB here or prompt user to re-link could be implemented
            return new NextResponse("GitHub token invalid or expired. Please re-authenticate.", { status: 401 })
        }
        
        const userData = await userRes.json()
        const githubUsername = userData.login

        if (!githubUsername) {
            return new NextResponse("Could not fetch GitHub username", { status: 400 })
        }

        // Immediately update basic GitHub info so the user is searchable
        // We do this before the slow syncing to prevent missing usernames on timeout
        await prisma.user.update({
            where: { id: session.user.id },
            data: { 
                githubUsername: githubUsername,
                githubId: userData.id
            }
        })

        const githubService = new GitHubService(account.access_token, githubUsername)

        // 1. Sync Repositories
        const repos = await githubService.fetchRepositories()
        
        // Reset languages to avoid duplicate counting across syncs
        await prisma.language.deleteMany({
            where: { userId: session.user.id }
        })

        for (const repo of repos) {
            try {
                await prisma.repository.upsert({
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
                        userId: session.user.id,
                    }
                })

                // Sync Languages for this repo sequentially
                if (repo.language) {
                    try {
                        const languages = await githubService.fetchLanguages(repo.full_name)
                        for (const [name, bytes] of Object.entries(languages)) {
                            await prisma.language.upsert({
                                where: {
                                    userId_name: {
                                        userId: session.user.id,
                                        name: name
                                    }
                                },
                                update: {
                                    bytes: { increment: bytes as number }
                                },
                                create: {
                                    name,
                                    bytes: bytes as number,
                                    userId: session.user.id,
                                }
                            })
                        }
                    } catch (e) {
                        console.error(`Failed to fetch languages for ${repo.full_name}`)
                    }
                }
            } catch (e) {
                console.error(`Failed to sync repository ${repo.full_name}`, e)
            }
        }

        // 2. Sync Commits
        const commits = await githubService.fetchUserCommits()

        for (const commit of commits) {
            try {
                const dbRepo = await prisma.repository.findUnique({
                    where: { githubId: commit.repositoryId }
                })

                if (dbRepo) {
                    await prisma.commit.upsert({
                        where: { sha: commit.sha },
                        update: {},
                        create: {
                            sha: commit.sha,
                            message: commit.commit.message,
                            date: new Date(commit.commit.author.date),
                            url: commit.html_url,
                            userId: session.user.id,
                            repositoryId: dbRepo.id
                        }
                    })
                }
            } catch (e) {
                console.error(`Failed to sync commit ${commit.sha}:`, e)
            }
        }

        // 3. Update sync timestamp on user
        await prisma.user.update({
            where: { id: session.user.id },
            data: { 
                lastSyncAt: new Date()
            }
        })

        return NextResponse.json({ success: true, message: "Sync completed" })
    } catch (error) {
        console.error("[SYNC_ERROR]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
