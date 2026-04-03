/* eslint-disable @typescript-eslint/no-explicit-any */
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

        await Promise.allSettled(repos.map(async (repo: any) => {
            const dbRepo = await prisma.repository.upsert({
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

            // Sync Languages for this repo concurrently
            if (repo.language) {
                try {
                    const languages = await githubService.fetchLanguages(repo.full_name)
                    await Promise.allSettled(
                        Object.entries(languages).map(async ([name, bytes]) => {
                            const existingLanguage = await prisma.language.findUnique({
                                where: {
                                    userId_name: {
                                        userId: session.user.id,
                                        name: name
                                    }
                                }
                            })

                            if (existingLanguage) {
                                return prisma.language.update({
                                    where: { id: existingLanguage.id },
                                    data: { bytes: existingLanguage.bytes + (bytes as number) }
                                })
                            } else {
                                return prisma.language.create({
                                    data: {
                                        name,
                                        bytes: bytes as number,
                                        userId: session.user.id,
                                    }
                                })
                            }
                        })
                    )
                } catch (e) {
                    console.error(`Failed to fetch languages for ${repo.full_name}`)
                }
            }
        }))

        // 2. Sync Commits
        const commits = await githubService.fetchUserCommits()

        await Promise.allSettled(commits.map(async (commit: any) => {
            const dbRepo = await prisma.repository.findUnique({
                where: { githubId: commit.repositoryId }
            })

            if (dbRepo) {
                return prisma.commit.upsert({
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
        }))

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
