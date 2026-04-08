"use client"

import { useState } from "react"
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SyncButton({ lastSyncAt }: { lastSyncAt: Date | null }) {
    const [isSyncing, setIsSyncing] = useState(false)
    const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle')

    const handleSync = async () => {
        try {
            setIsSyncing(true)
            setSyncStatus('idle')
            const res = await fetch("/api/sync", { method: "POST" })
            
            if (!res.ok) {
                const errorText = await res.text()
                console.error("Sync failed:", errorText)
                setSyncStatus('error')
                return
            }

            setSyncStatus('success')
            
            // Brief delay to show success state, then reload
            setTimeout(() => {
                window.location.reload()
            }, 1500)
        } catch (error) {
            console.error("Sync error:", error)
            setSyncStatus('error')
        } finally {
            setIsSyncing(false)
        }
    }

    const getButtonContent = () => {
        if (isSyncing) {
            return (
                <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Syncing Data...
                </>
            )
        }
        if (syncStatus === 'success') {
            return (
                <>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                    Sync Complete!
                </>
            )
        }
        if (syncStatus === 'error') {
            return (
                <>
                    <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                    Sync Failed - Retry?
                </>
            )
        }
        return (
            <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync GitHub Data
            </>
        )
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
                variant={syncStatus === 'error' ? 'destructive' : 'outline'}
                size="sm"
            >
                {getButtonContent()}
            </Button>
        </div>
    )
}
