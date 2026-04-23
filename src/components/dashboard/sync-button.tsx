"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { RefreshCw, CheckCircle2, AlertCircle, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SyncButton({ lastSyncAt }: { lastSyncAt: Date | null }) {
    const [isSyncing, setIsSyncing] = useState(false)
    const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error' | 'auth_error'>('idle')
    const [syncProgress, setSyncProgress] = useState(0)
    const [errorMessage, setErrorMessage] = useState("")

    const router = useRouter()
    const hasAutoSynced = useRef(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        if (!hasAutoSynced.current) {
            hasAutoSynced.current = true
            // Auto sync if no sync has happened, or if the last sync was more than 5 minutes ago
            // to avoid infinite loops and GitHub API rate bans
            const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000)
            if (!lastSyncAt || new Date(lastSyncAt) < fiveMinsAgo) {
                handleSync(false)
            }
        }
    }, [lastSyncAt])

    const handleSync = async (isManual = true) => {
        try {
            setIsSyncing(true)
            setSyncStatus('idle')
            setErrorMessage("")
            const res = await fetch("/api/sync", { method: "POST" })
            
            if (!res.ok) {
                const errorText = await res.text()
                console.error("Sync failed:", res.status, errorText)
                
                if (res.status === 401) {
                    // Token expired or invalid — user needs to re-authenticate
                    setSyncStatus('auth_error')
                    setErrorMessage("GitHub token expired")
                } else {
                    setSyncStatus('error')
                    setErrorMessage(errorText || "Sync failed")
                }
                return
            }

            setSyncProgress(0)

            // Poll for status
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch("/api/sync/status")
                    if (statusRes.ok) {
                        const data = await statusRes.json()
                        setSyncProgress(data.syncProgress || 0)
                        
                        if (data.syncStatus === 'completed') {
                            clearInterval(pollInterval)
                            setSyncStatus('success')
                            setIsSyncing(false)
                            router.refresh()
                            
                            if (isManual) {
                                setTimeout(() => setSyncStatus('idle'), 3000)
                            }
                        } else if (data.syncStatus === 'failed') {
                            clearInterval(pollInterval)
                            setSyncStatus('error')
                            setErrorMessage(data.syncError || "Sync failed")
                            setIsSyncing(false)
                        }
                    }
                } catch (err) {
                    console.error("Polling error:", err)
                }
            }, 1000)

        } catch (error) {
            console.error("Sync error:", error)
            setSyncStatus('error')
            setErrorMessage("Network error")
            setIsSyncing(false)
        }
        // Notice we do NOT set setIsSyncing(false) in finally block anymore
        // because we wait for polling to finish it!
    }

    const handleReAuth = () => {
        // Force a new GitHub sign-in to get a fresh token with updated scopes
        signIn("github", { callbackUrl: "/dashboard" })
    }

    const getButtonContent = () => {
        if (isSyncing) {
            return (
                <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {syncProgress > 0 ? `Syncing (${syncProgress}%)...` : 'Starting Sync...'}
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
        if (syncStatus === 'auth_error') {
            return (
                <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Re-connect GitHub
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
            {mounted && lastSyncAt && (
                <span className="text-sm text-muted-foreground hidden md:inline-block">
                    Last synced: {new Date(lastSyncAt).toLocaleString()}
                </span>
            )}
            {errorMessage && syncStatus !== 'auth_error' && (
                <span className="text-xs text-red-400 hidden md:inline-block">
                    {errorMessage}
                </span>
            )}
            <Button
                onClick={() => syncStatus === 'auth_error' ? handleReAuth() : handleSync(true)}
                disabled={isSyncing}
                variant={syncStatus === 'error' ? 'destructive' : syncStatus === 'auth_error' ? 'default' : 'outline'}
                size="sm"
            >
                {getButtonContent()}
            </Button>
        </div>
    )
}
