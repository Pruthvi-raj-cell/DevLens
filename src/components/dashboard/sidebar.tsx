"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { LayoutDashboard, BookMarked, Settings, LogOut } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeToggle } from "./theme-toggle"

const routes = [
    {
        label: "Overview",
        icon: LayoutDashboard,
        href: "/dashboard",
        color: "text-sky-500",
    },
    {
        label: "Repositories",
        icon: BookMarked,
        href: "/dashboard/repositories",
        color: "text-violet-500",
    },
]

export function Sidebar() {
    const pathname = usePathname()
    const { data: session } = useSession()

    return (
        <div className="space-y-4 py-4 flex flex-col h-full bg-card border-r">
            <div className="px-3 py-2 flex-1">
                <Link href="/dashboard" className="flex items-center pl-3 mb-14">
                    <div className="relative w-8 h-8 mr-4 bg-primary rounded-lg flex items-center justify-center">
                        <span className="text-primary-foreground font-bold text-xl">D</span>
                    </div>
                    <h1 className="text-2xl font-bold">
                        devlens
                    </h1>
                </Link>
                <div className="space-y-1">
                    {routes.map((route) => (
                        <Link
                            href={route.href}
                            key={route.href}
                            className={cn(
                                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-primary hover:bg-primary/10 rounded-lg transition",
                                pathname === route.href ? "text-primary bg-primary/10" : "text-zinc-400"
                            )}
                        >
                            <div className="flex items-center flex-1">
                                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                                {route.label}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {session?.user && (
                <div className="px-3">
                    <div className="bg-accent/50 rounded-xl p-4 flex flex-col gap-y-4">
                        <div className="flex items-center gap-x-3">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={session.user.image || ""} />
                                <AvatarFallback>{session.user.name?.charAt(0) || "U"}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-sm font-semibold truncate">{session.user.name}</span>
                                <span className="text-xs text-muted-foreground truncate">{session.user.email}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <ThemeToggle />
                            <Button variant="ghost" size="icon" onClick={() => signOut()}>
                                <LogOut className="h-5 w-5 text-muted-foreground hover:text-destructive transition" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
