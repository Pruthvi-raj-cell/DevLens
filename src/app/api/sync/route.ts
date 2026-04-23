import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { revalidatePath } from "next/cache";

export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

        const userId = session.user.id;
        const account = await prisma.account.findFirst({
            where: { userId, provider: "github" },
        });

        if (!account?.access_token) return new NextResponse("No GitHub account linked", { status: 400 });
        const token = account.access_token;

        // Clean slate tracking prior to handing off to background worker
        await prisma.user.update({
             where: { id: userId },
             data: { syncStatus: "pending", syncProgress: 0, syncError: null }
        });

        // Fire and Forget Inngest Background Job triggering
        await inngest.send({
            name: "github/sync",
            data: { userId, token }
        });

        // Invalidate caching
        revalidatePath('/dashboard');

        return NextResponse.json({ success: true, message: "Sync started" }, { status: 200 });
    } catch (error: any) {
        console.error("[SYNC_FIRE_ERROR]", error);
        return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
    }
}
