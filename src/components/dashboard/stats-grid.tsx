"use client"

import { Activity, GitCommit, Search, Star, BookMarked, GitFork, Flame, Trophy } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface StatsGridProps {
    stats: {
        totalCommits: number
        reposCount: number
        mostActiveRepo: string
        topLanguage: string
        currentStreak: number
        longestStreak: number
        totalStars: number
        totalForks: number
    }
}

export function StatsGrid({ stats }: StatsGridProps) {
    const cards = [
        {
            title: "Total Commits",
            value: (stats.totalCommits || 0).toLocaleString(),
            icon: GitCommit,
            color: "text-blue-500",
        },
        {
            title: "Repositories Contributed",
            value: stats.reposCount,
            icon: BookMarked,
            color: "text-indigo-500",
        },
        {
            title: "Most Active Repo",
            value: stats.mostActiveRepo,
            icon: Activity,
            color: "text-green-500",
        },
        {
            title: "Top Language",
            value: stats.topLanguage,
            icon: Search,
            color: "text-purple-500",
        },
        {
            title: "Current Streak",
            value: `${stats.currentStreak} days`,
            icon: Flame,
            color: "text-orange-500",
        },
        {
            title: "Longest Streak",
            value: `${stats.longestStreak} days`,
            icon: Trophy,
            color: "text-yellow-500",
        },
        {
            title: "Total Stars Earned",
            value: (stats.totalStars || 0).toLocaleString(),
            icon: Star,
            color: "text-yellow-400",
        },
        {
            title: "Total Forks Created",
            value: (stats.totalForks || 0).toLocaleString(),
            icon: GitFork,
            color: "text-slate-500",
        },
    ]

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
                <Card key={card.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {card.title}
                        </CardTitle>
                        <card.icon className={`h-4 w-4 ${card.color}`} />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{card.value}</div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
