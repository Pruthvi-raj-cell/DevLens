import { requireAuth } from "@/lib/session"
import { Sidebar } from "@/components/dashboard/sidebar"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    await requireAuth()

    return (
        <div className="h-full relative">
            <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80]">
                <Sidebar />
            </div>
            <main className="md:pl-72 h-full">
                {children}
            </main>
        </div>
    )
}
