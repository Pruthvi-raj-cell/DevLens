import { NextResponse } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Get heatmap for authenticated user
export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const commits = await prisma.commit.findMany({
            where: { userId: session.user.id },
            select: { date: true },
            orderBy: { date: 'asc' }
        })

        const heatmapData = processHeatmapData(commits)

        return NextResponse.json(heatmapData)
    } catch (error) {
        console.error("[HEATMAP_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

// Get heatmap for public profile
export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { username } = body

        if (!username) {
            return new NextResponse("Username missing", { status: 400 })
        }

        const user = await prisma.user.findUnique({
            where: { githubUsername: username }
        })

        if (!user || (!user.publicProfile && user.githubUsername !== username)) {
            return new NextResponse("Not found or private", { status: 404 })
        }

        const commits = await prisma.commit.findMany({
            where: { userId: user.id },
            select: { date: true },
            orderBy: { date: 'asc' }
        })

        const heatmapData = processHeatmapData(commits)

        return NextResponse.json(heatmapData)
    } catch (error) {
        console.error("[HEATMAP_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

function processHeatmapData(commits: { date: Date }[]) {
    const countsByDate = new Map<string, number>()

    // Only look at the last year (52 weeks)
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    commits.forEach(commit => {
        if (commit.date >= oneYearAgo) {
            const dateStr = commit.date.toISOString().split('T')[0]
            countsByDate.set(dateStr, (countsByDate.get(dateStr) || 0) + 1)
        }
    })

    return Array.from(countsByDate.entries()).map(([date, count]) => ({
        date,
        count
    }))
}
