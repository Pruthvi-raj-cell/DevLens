"use client"

import { useState } from "react"
import { Globe, Lock } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface ProfileVisibilityToggleProps {
    isPublic: boolean
    username?: string | null
}

export function ProfileVisibilityToggle({ isPublic: initialPublic, username }: ProfileVisibilityToggleProps) {
    const [isPublic, setIsPublic] = useState(initialPublic)
    const [isLoading, setIsLoading] = useState(false)

    const handleToggle = async (checked: boolean) => {
        try {
            setIsLoading(true)
            // Optimistic update
            setIsPublic(checked)

            const res = await fetch("/api/profile/visibility", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isPublic: checked })
            })

            if (!res.ok) {
                throw new Error("Failed to update visibility")
            }

            const data = await res.json()
            setIsPublic(data.isPublic)
        } catch (error) {
            console.error(error)
            // Revert on error
            setIsPublic(!checked)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="col-span-full">
            <CardHeader>
                <div className="flex items-center gap-2">
                    {isPublic ? <Globe className="h-5 w-5 text-green-500" /> : <Lock className="h-5 w-5 text-zinc-500" />}
                    <CardTitle>Public Profile Visibility</CardTitle>
                </div>
                <CardDescription>
                    Make your devlens profile visible to anyone with the link.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                        {isPublic ? "Your profile is public" : "Your profile is private"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {isPublic
                            ? "Anyone can view your GitHub statistics and heatmap"
                            : "Only you can view your dashboard statistics"}
                    </p>
                </div>

                <div className="flex items-center space-x-4">
                    {isPublic && username && (
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/u/${username}`} target="_blank">
                                View Profile
                            </Link>
                        </Button>
                    )}
                    <Switch
                        checked={isPublic}
                        onCheckedChange={handleToggle}
                        disabled={isLoading}
                    />
                </div>
            </CardContent>
        </Card>
    )
}
