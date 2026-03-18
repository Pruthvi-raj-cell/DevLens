import { NextResponse } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const body = await req.json()
        const { isPublic } = body

        if (typeof isPublic !== "boolean") {
            return new NextResponse("Invalid request", { status: 400 })
        }

        const user = await prisma.user.update({
            where: { id: session.user.id },
            data: { publicProfile: isPublic }
        })

        return NextResponse.json({ success: true, isPublic: user.publicProfile })
    } catch (error) {
        console.error("[VISIBILITY_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
