"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { RefreshCw, CheckCircle2, AlertCircle, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SyncButton({ lastSyncAt }: { lastSyncAt: Date | null }) {
    const [isSyncing, setIsSyncing] = useState(false)
    const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error' | 'auth_error'>('idle')
    const [errorMessage, setErrorMessage] = useState("")

    const handleSync = async () => {
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

            setSyncStatus('success')
            
            // Brief delay to show success state, then reload
            setTimeout(() => {
                window.location.reload()
            }, 1500)
        } catch (error) {
            console.error("Sync error:", error)
            setSyncStatus('error')
            setErrorMessage("Network error")
        } finally {
            setIsSyncing(false)
        }
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
            {lastSyncAt && (
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
                onClick={syncStatus === 'auth_error' ? handleReAuth : handleSync}
                disabled={isSyncing}
                variant={syncStatus === 'error' ? 'destructive' : syncStatus === 'auth_error' ? 'default' : 'outline'}
                size="sm"
            >
                {getButtonContent()}
            </Button>
        </div>
    )
}
