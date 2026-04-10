export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const query = searchParams.get("q");

        if (!query || query.trim() === "") {
            return NextResponse.json({ users: [] });
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
        });

        return NextResponse.json({ users });
    } catch (error) {
        console.error("Search API Error:", error);
        return NextResponse.json(
            { error: "Failed to search users" },
            { status: 500 }
        );
    }
}
