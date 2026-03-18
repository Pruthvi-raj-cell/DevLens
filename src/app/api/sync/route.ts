import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
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
            headers: { Authorization: `Bearer ${account.access_token}` }
        })
        const userData = await userRes.json()
        const githubUsername = userData.login

        if (!githubUsername) {
            return new NextResponse("Could not fetch GitHub username", { status: 400 })
        }

        const githubService = new GitHubService(account.access_token, githubUsername)

        // 1. Sync Repositories
        const repos = await githubService.fetchRepositories()

        for (const repo of repos) {
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

            // Sync Languages for this repo
            if (repo.language) {
                try {
                    const languages = await githubService.fetchLanguages(repo.full_name)
                    for (const [name, bytes] of Object.entries(languages)) {
                        const existingLanguage = await prisma.language.findUnique({
                            where: {
                                userId_name: {
                                    userId: session.user.id,
                                    name: name
                                }
                            }
                        })

                        if (existingLanguage) {
                            await prisma.language.update({
                                where: { id: existingLanguage.id },
                                data: { bytes: existingLanguage.bytes + (bytes as number) }
                            })
                        } else {
                            await prisma.language.create({
                                data: {
                                    name,
                                    bytes: bytes as number,
                                    userId: session.user.id,
                                    // Add a default color mapping logic here if needed
                                }
                            })
                        }
                    }
                } catch (e) {
                    console.error(`Failed to fetch languages for ${repo.full_name}`)
                }
            }
        }

        // 2. Sync Commits
        const commits = await githubService.fetchUserCommits()

        for (const commit of commits) {
            // Find the repository in our DB first
            const dbRepo = await prisma.repository.findUnique({
                where: { githubId: commit.repositoryId }
            })

            if (dbRepo) {
                await prisma.commit.upsert({
                    where: { sha: commit.sha },
                    update: {}, // Don't update existing commits, they don't change
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
        }

        // 3. Update sync timestamp and GitHub info on user
        await prisma.user.update({
            where: { id: session.user.id },
            data: { 
                lastSyncAt: new Date(),
                githubUsername: githubUsername,
                githubId: userData.id
            }
        })

        return NextResponse.json({ success: true, message: "Sync completed" })
    } catch (error) {
        console.error("[SYNC_ERROR]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
