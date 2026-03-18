"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SyncButton({ lastSyncAt }: { lastSyncAt: Date | null }) {
    const [isSyncing, setIsSyncing] = useState(false)

    const handleSync = async () => {
        try {
            setIsSyncing(true)
            const res = await fetch("/api/sync", { method: "POST" })
            if (!res.ok) throw new Error("Sync failed")

            // Refresh page to show new data
            window.location.reload()
        } catch (error) {
            console.error(error)
        } finally {
            setIsSyncing(false)
        }
    }

    return (
        <div className="flex items-center gap-4">
            {lastSyncAt && (
                <span className="text-sm text-muted-foreground hidden md:inline-block">
                    Last synced: {new Date(lastSyncAt).toLocaleString()}
                </span>
            )}
            <Button
                onClick={handleSync}
                disabled={isSyncing}
                variant="outline"
                size="sm"
            >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing Data..." : "Sync GitHub Data"}
            </Button>
        </div>
    )
}
