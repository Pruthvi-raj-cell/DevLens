import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createRateLimiter } from "@/lib/rate-limit"

const rateLimiter = createRateLimiter("search-api", {
    limit: 30, // 30 requests...
    windowMs: 60000, // ...per 1 minute
})

export async function GET(req: NextRequest) {
    try {
        // Implement Rate Limiting
        const ip = req.ip ?? req.headers.get("x-forwarded-for") ?? "unknown"
        const { success } = rateLimiter(ip)
        
        if (!success) {
            return NextResponse.json(
                { error: "Too many requests. Please try again later." },
                { status: 429 }
            )
        }

        const searchParams = req.nextUrl.searchParams
        const query = searchParams.get("q")

        if (!query || query.trim() === "") {
            return NextResponse.json({ users: [] })
        }

        const users = await prisma.user.findMany({
            where: {
                publicProfile: true,
                OR: [
                    {
                        githubUsername: {
                            contains: query,
                            mode: "insensitive",
                        },
                    },
                    {
                        name: {
                            contains: query,
                            mode: "insensitive",
                        },
                    },
                ],
            },
            select: {
                id: true,
                name: true,
                githubUsername: true,
                image: true,
            },
            take: 5,
        })

        return NextResponse.json({ users })
    } catch (error) {
        console.error("Search API Error:", error)
        return NextResponse.json({ error: "Failed to search users" }, { status: 500 })
    }
}
