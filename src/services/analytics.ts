import { prisma } from "@/lib/prisma"

export async function calculateUserStats(userId: string) {
    // 1. Total Commits
    const totalCommits = await prisma.commit.count({
        where: { userId }
    })

    // 2. Repositories Contributed To
    const reposCount = await prisma.repository.count({
        where: { userId }
    })

    // 3. Most Active Repository
    const repos = await prisma.repository.findMany({
        where: { userId },
        select: { stars: true, forks: true }
    })

    const totalStars = repos.reduce((acc: number, repo: { stars: number | null }) => acc + (repo.stars || 0), 0)
    const totalForks = repos.reduce((acc: number, repo: { forks: number | null }) => acc + (repo.forks || 0), 0)

    // 4. Most Active Repository
    const reposWithCommits = await prisma.repository.findMany({
        where: { userId },
        include: {
            _count: {
                select: { commits: true }
            }
        },
        orderBy: {
            commits: { _count: 'desc' }
        },
        take: 1
    })

    const mostActiveRepo = reposWithCommits[0]?.name || "None"

    // 4. Calculate Current Streak
    const userCommits = await prisma.commit.findMany({
        where: { userId },
        select: { date: true },
        orderBy: { date: 'desc' }
    })

    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0

    if (userCommits.length > 0) {
        // Extract unique dates
        const uniqueDates = (Array.from(new Set(userCommits.map((c: { date: Date }) => c.date.toISOString().split('T')[0]))) as string[])
            .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())

        // Calculate current streak
        const today = new Date().toISOString().split('T')[0]
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]

        let checkDate = new Date()
        if (uniqueDates[0] === today || uniqueDates[0] === yesterdayStr) {
            if (uniqueDates[0] === today) {
                currentStreak = 1
                checkDate = new Date(today)
            } else {
                currentStreak = 1
                checkDate = new Date(yesterdayStr)
            }

            for (let i = 1; i < uniqueDates.length; i++) {
                checkDate.setDate(checkDate.getDate() - 1)
                const expectedDateStr = checkDate.toISOString().split('T')[0]

                if (uniqueDates[i] === expectedDateStr) {
                    currentStreak++
                } else {
                    break
                }
            }
        }

        // Calculate longest streak
        tempStreak = 1
        longestStreak = 1
        for (let i = 0; i < uniqueDates.length - 1; i++) {
            const d1 = new Date(uniqueDates[i] as string)
            const d2 = new Date(uniqueDates[i + 1] as string)
            const diffTime = Math.abs(d1.getTime() - d2.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

            if (diffDays === 1) {
                tempStreak++
                if (tempStreak > longestStreak) {
                    longestStreak = tempStreak
                }
            } else {
                tempStreak = 1
            }
        }
    }

    // Calculate languages breakdown
    const languages = await prisma.language.findMany({
        where: { userId },
        orderBy: { bytes: 'desc' }
    })

    const topLanguage = languages.length > 0 ? languages[0].name : "N/A"

    // Format chart data (last 30 days of commits)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentCommits = userCommits.filter((c: { date: Date }) => c.date >= thirtyDaysAgo)

    // Initialize map with all 30 days
    const commitCountsByDate = new Map()
    for (let i = 29; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        commitCountsByDate.set(d.toISOString().split('T')[0], 0)
    }

    // Populate actual counts
    recentCommits.forEach((c: { date: Date }) => {
        const dateStr = c.date.toISOString().split('T')[0]
        if (commitCountsByDate.has(dateStr)) {
            commitCountsByDate.set(dateStr, commitCountsByDate.get(dateStr) + 1)
        }
    })

    const chartData = Array.from(commitCountsByDate.entries()).map(([date, count]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        commits: count
    }))

    return {
        totalCommits,
        reposCount,
        mostActiveRepo,
        topLanguage,
        currentStreak,
        longestStreak,
        chartData,
        languages,
        totalStars,
        totalForks
    }
}
