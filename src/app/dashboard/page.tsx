import { requireAuth } from "@/lib/session"
import { calculateUserStats } from "@/services/analytics"
import { prisma } from "@/lib/prisma"

import { StatsGrid } from "@/components/dashboard/stats-grid"
import { CommitChart } from "@/components/dashboard/commit-chart"
import { LanguageBreakdown } from "@/components/dashboard/language-breakdown"
import { RecentRepos } from "@/components/dashboard/recent-repos"
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap"
import { SyncButton } from "@/components/dashboard/sync-button"
import { ProfileVisibilityToggle } from "@/components/dashboard/profile-visibility-toggle"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function DashboardPage() {
    const user = await requireAuth()

    // Get full user data
    const dbUser = await prisma.user.findUnique({
        where: { id: user.id }
    })

    // Calculate stats
    const stats = await calculateUserStats(user.id)

    // Get recent repos
    const recentRepos = await prisma.repository.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        take: 6,
    })

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
                <div className="flex items-center space-x-2">
                    <SyncButton lastSyncAt={dbUser?.lastSyncAt || null} />
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-4">
                    <StatsGrid stats={stats} />

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <CommitChart data={stats.chartData} />
                        <LanguageBreakdown data={stats.languages} />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <ActivityHeatmap />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <RecentRepos repos={recentRepos} />
                    </div>
                </TabsContent>
                <TabsContent value="settings" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <ProfileVisibilityToggle
                            isPublic={dbUser?.publicProfile || false}
                            username={dbUser?.githubUsername}
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
