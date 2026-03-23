"use client"

import Link from "next/link"
import { Star, GitFork, BookMarked, ExternalLink } from "lucide-react"
import { motion } from "framer-motion"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface RecentReposProps {
    repos: {
        id: string
        name: string
        description: string | null
        url: string
        language: string | null
        stars: number
        forks: number
        updatedAt: Date
    }[]
}

export function RecentRepos({ repos }: RecentReposProps) {
    return (
        <Card className="col-span-4">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Recently Updated Repositories</CardTitle>
                    <CardDescription>
                        The projects you&apos;ve been working on lately.
                    </CardDescription>
                </div>
                <Link href="/dashboard/repositories" className="text-sm text-primary hover:underline">
                    View All
                </Link>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {repos.map((repo, i) => (
                        <motion.div 
                            key={repo.id} 
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1, duration: 0.4 }}
                            whileHover={{ scale: 1.02, y: -2 }}
                            className="rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col p-4 hover:border-primary/50 hover:shadow-md dark:hover:shadow-[0_0_15px_rgba(255,255,255,0.07)] transition-colors duration-200"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    <BookMarked className="h-4 w-4 text-muted-foreground" />
                                    <a href={repo.url} target="_blank" rel="noreferrer" className="font-semibold hover:underline flex items-center gap-1 group">
                                        <span className="truncate max-w-[150px]">{repo.name}</span>
                                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                </div>
                                {repo.language && (
                                    <Badge variant="secondary" className="text-xs font-normal">
                                        {repo.language}
                                    </Badge>
                                )}
                            </div>

                            <div className="mt-2 text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                                {repo.description || "No description provided."}
                            </div>

                            <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Star className="h-4 w-4" />
                                    <span>{repo.stars}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <GitFork className="h-4 w-4" />
                                    <span>{repo.forks}</span>
                                </div>
                                <div className="ml-auto text-xs">
                                    {new Date(repo.updatedAt).toLocaleDateString()}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    {repos.length === 0 && (
                        <div className="col-span-full py-8 text-center text-muted-foreground border border-dashed rounded-lg">
                            No repositories found. Hit &quot;Sync GitHub Data&quot; to fetch them.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
