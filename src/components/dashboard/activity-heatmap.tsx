"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface HeatmapProps {
    data?: { date: string, count: number }[]
    username?: string // Used for public profile
}

export function ActivityHeatmap({ data, username }: HeatmapProps) {
    const [heatmapData, setHeatmapData] = useState<{ date: string, count: number }[]>([])
    const [loading, setLoading] = useState(true)
    const { theme } = useTheme()
    const isDark = theme === "dark" || theme === "system"

    useEffect(() => {
        if (data) {
            setHeatmapData(data)
            setLoading(false)
            return
        }

        const fetchData = async () => {
            try {
                const url = username ? '/api/heatmap' : '/api/heatmap'
                const method = username ? 'POST' : 'GET'
                const body = username ? JSON.stringify({ username }) : undefined

                const res = await fetch(url, { method, body })
                if (res.ok) {
                    const result = await res.json()
                    setHeatmapData(result)
                }
            } catch (e) {
                console.error("Failed to fetch heatmap data")
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [data, username])

    // Process data into a grid of 52 weeks x 7 days
    const today = new Date()
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(today.getFullYear() - 1)

    // Align start date to Sunday
    while (oneYearAgo.getDay() !== 0) {
        oneYearAgo.setDate(oneYearAgo.getDate() - 1)
    }

    const days = []
    const dataMap = new Map(heatmapData.map(d => [d.date, d.count]))

    let currentDate = new Date(oneYearAgo)
    while (currentDate <= today) {
        const dateStr = currentDate.toISOString().split('T')[0]
        days.push({
            date: dateStr,
            count: dataMap.get(dateStr) || 0
        })
        currentDate.setDate(currentDate.getDate() + 1)
    }

    // Calculate colors based on contribution count
    // Calculate colors matching authentic GitHub dark mode with added glow for high activity
    const getColor = (count: number) => {
        if (count === 0) return isDark ? 'bg-[#161b22] border-[0.5px] border-white/5' : 'bg-gray-100'
        if (count <= 3) return isDark ? 'bg-[#0e4429]' : 'bg-emerald-200'
        if (count <= 6) return isDark ? 'bg-[#006d32]' : 'bg-emerald-400'
        if (count <= 10) return isDark ? 'bg-[#26a641]' : 'bg-emerald-600'
        return isDark ? 'bg-[#39d353] shadow-[0_0_10px_rgba(57,211,83,0.5)]' : 'bg-emerald-800'
    }

    // Group into weeks
    const weeks = []
    for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7))
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    if (loading) {
        return (
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Activity Heatmap</CardTitle>
                    <CardDescription>Loading contribution graph...</CardDescription>
                </CardHeader>
                <CardContent className="h-[200px] flex items-center justify-center">
                    <div className="animate-pulse flex gap-1 overflow-hidden">
                        {[...ArrayInstance50].map((_, i) => (
                            <div key={i} className="flex flex-col gap-1">
                                {[...ArrayInstance7].map((_, j) => (
                                    <div key={j} className="w-[10px] h-[10px] rounded-sm bg-muted" />
                                ))}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="col-span-4 overflow-hidden dark:bg-black/60 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl transition-all duration-300">
            <CardHeader>
                <CardTitle>Activity Heatmap</CardTitle>
                <CardDescription>
                    {heatmapData.reduce((acc, curr) => acc + curr.count, 0)} contributions in the last year
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col pb-4 overflow-x-auto custom-scrollbar">
                    <div className="flex text-xs text-muted-foreground mb-2 ml-8 gap-x-[3.2rem]">
                        {months.map((m, i) => <span key={i}>{m}</span>)}
                    </div>

                    <div className="flex gap-1 relative">
                        <div className="flex flex-col text-[10px] text-muted-foreground justify-between py-1 pr-2 absolute -left-8 h-full">
                            <span>Mon</span>
                            <span>Wed</span>
                            <span>Fri</span>
                        </div>

                        <TooltipProvider delayDuration={0}>
                            {weeks.map((week, weekIndex) => (
                                <div key={weekIndex} className="flex flex-col gap-1 z-10">
                                    {week.map((day, dayIndex) => (
                                        <Tooltip key={day.date}>
                                            <TooltipTrigger asChild>
                                                <div
                                                    className={`w-[12px] h-[12px] rounded-sm transition-colors cursor-pointer hover:ring-1 hover:ring-primary ${getColor(day.count)}`}
                                                />
                                            </TooltipTrigger>
                                            <TooltipContent side="top">
                                                <p>{day.count} contributions on {new Date(day.date).toDateString()}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    ))}
                                </div>
                            ))}
                        </TooltipProvider>
                    </div>

                    <div className="mt-4 flex items-center justify-end text-xs text-muted-foreground gap-2">
                        <span>Less</span>
                        <div className={`w-[12px] h-[12px] rounded-sm ${getColor(0)}`} />
                        <div className={`w-[12px] h-[12px] rounded-sm ${getColor(2)}`} />
                        <div className={`w-[12px] h-[12px] rounded-sm ${getColor(5)}`} />
                        <div className={`w-[12px] h-[12px] rounded-sm ${getColor(8)}`} />
                        <div className={`w-[12px] h-[12px] rounded-sm ${getColor(15)}`} />
                        <span>More</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

const ArrayInstance50 = Array.from({ length: 50 })
const ArrayInstance7 = Array.from({ length: 7 })
