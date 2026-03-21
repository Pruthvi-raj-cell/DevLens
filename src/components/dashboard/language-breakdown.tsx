"use client"

import { useEffect, useState } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#a4de6c']

interface LanguageProps {
    data: {
        name: string
        bytes: number
    }[]
}

export function LanguageBreakdown({ data }: LanguageProps) {
    // Take top 5 and group rest into "Other"
    const topLangs = data.slice(0, 5)
    const otherBytes = data.slice(5).reduce((acc, lang) => acc + lang.bytes, 0)

    const displayData = [...topLangs]
    if (otherBytes > 0) {
        displayData.push({ name: "Other", bytes: otherBytes })
    }

    // Calculate percentages
    const total = displayData.reduce((acc, curr) => acc + curr.bytes, 0)
    const chartData = displayData.map(d => ({
        name: d.name,
        value: d.bytes,
        percentage: total > 0 ? ((d.bytes / total) * 100).toFixed(1) : "0.0"
    }))

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="col-span-4 lg:col-span-1"
        >
            <Card className="h-full transition-shadow hover:shadow-md dark:hover:shadow-[0_0_15px_rgba(255,255,255,0.07)] border hover:border-primary/30">
                <CardHeader>
                    <CardTitle>Languages</CardTitle>
                    <CardDescription>
                        Distribution of languages across your repositories.
                    </CardDescription>
                </CardHeader>
            <CardContent className="flex flex-col items-center">
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip
                                formatter={(value: any, name: any, props: any) => [`${props.payload.percentage}%`, name]}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 w-full grid grid-cols-2 gap-2 text-sm">
                    {chartData.map((lang, index) => (
                        <div key={lang.name} className="flex items-center">
                            <div
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="truncate">{lang.name}</span>
                            <span className="ml-auto text-muted-foreground text-xs">{lang.percentage}%</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
        </motion.div>
    )
}
