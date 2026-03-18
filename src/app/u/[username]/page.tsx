import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Metadata } from "next"

import { StatsGrid } from "@/components/dashboard/stats-grid"
import { CommitChart } from "@/components/dashboard/commit-chart"
import { LanguageBreakdown } from "@/components/dashboard/language-breakdown"
import { RecentRepos } from "@/components/dashboard/recent-repos"
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { calculateUserStats } from "@/services/analytics"
import { Badge } from "@/components/ui/badge"
import { Github } from "lucide-react"

interface ProfilePageProps {
    params: {
        username: string
    }
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
    const user = await prisma.user.findUnique({
        where: { githubUsername: params.username }
    })

    if (!user || !user.publicProfile) {
        return {
            title: "Profile Not Found - Devlens",
        }
    }

    return {
        title: `${user.name || params.username}'s Developer Profile | Devlens`,
        description: `Check out ${user.name || params.username}'s GitHub activity, top languages, and contribution heatmap on Devlens.`,
    }
}

export default async function PublicProfilePage({ params }: ProfilePageProps) {
    const user = await prisma.user.findUnique({
        where: { githubUsername: params.username }
    })

    // If user doesn't exist or hasn't made profile public, show 404
    if (!user || !user.publicProfile) {
        notFound()
    }

    // Calculate stats for this user
    const stats = await calculateUserStats(user.id)

    const recentRepos = await prisma.repository.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        take: 6,
    })

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center">
                    <div className="flex items-center gap-2 font-bold">
                        <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                            <span className="text-primary-foreground text-xs">D</span>
                        </div>
                        devlens
                    </div>
                    <div className="flex flex-1 items-center justify-end space-x-4">
                        <a
                            href="https://devlens-app.vercel.app"
                            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                        >
                            Get your own profile
                        </a>
                    </div>
                </div>
            </header>

            <main className="container py-8 space-y-8">
                {/* User Card */}
                <div className="flex flex-col md:flex-row gap-6 items-center md:items-start bg-card rounded-xl p-6 md:p-8 border shadow-sm">
                    <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-md">
                        <AvatarImage src={user.image || ""} alt={user.name || "User"} />
                        <AvatarFallback className="text-3xl">{user.name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col items-center md:items-start flex-1 gap-2 text-center md:text-left">
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                            {user.name}
                        </h1>
                        <a
                            href={`https://github.com/${user.githubUsername}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                        >
                            <Github className="h-4 w-4" />
                            <span>{user.githubUsername}</span>
                        </a>

                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
                            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                                {stats.topLanguage} Developer
                            </Badge>
                            <Badge variant="outline">
                                {stats.currentStreak} Day Streak 🔥
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Highlight Stats */}
                <StatsGrid stats={stats} />

                {/* Charts Section */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <CommitChart data={stats.chartData} />
                    <LanguageBreakdown data={stats.languages} />
                </div>

                {/* Heatmap Section */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <ActivityHeatmap username={user.githubUsername!} />
                </div>

                {/* Repos Section */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <RecentRepos repos={recentRepos} />
                </div>
            </main>

            <footer className="border-t py-6 md:py-0">
                <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
                    <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                        Built with 💜 using Next.js and Tailwind CSS. The source code is available on GitHub.
                    </p>
                </div>
            </footer>
        </div>
    )
}
