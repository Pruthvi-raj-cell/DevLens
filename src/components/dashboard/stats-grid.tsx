"use client"

import { Activity, GitCommit, Search, Star, BookMarked, GitFork, Flame, Trophy } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion, Variants } from "framer-motion"

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

    const containerStyle: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    }
    
    const itemStyle: Variants = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    }

    return (
        <motion.div variants={containerStyle} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
                <motion.div key={card.title} variants={itemStyle} whileHover={{ scale: 1.02, y: -2 }} transition={{ duration: 0.2 }}>
                    <Card className="h-full transition-shadow hover:shadow-md dark:hover:shadow-[0_0_15px_rgba(255,255,255,0.07)] border hover:border-primary/30">
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
                </motion.div>
            ))}
        </motion.div>
    )
}
