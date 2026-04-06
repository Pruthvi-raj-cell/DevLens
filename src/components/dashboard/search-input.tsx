"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2 } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface SearchUser {
    id: string
    name: string | null
    githubUsername: string | null
    image: string | null
}

export function SearchInput() {
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<SearchUser[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const router = useRouter()
    const wrapperRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowDropdown(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    useEffect(() => {
        const fetchResults = async () => {
            if (!query.trim()) {
                setResults([])
                setIsSearching(false)
                return
            }

            setIsSearching(true)
            try {
                const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
                if (res.ok) {
                    const data = await res.json()
                    setResults(data.users || [])
                }
            } catch (error) {
                console.error("Failed to fetch search results:", error)
            } finally {
                setIsSearching(false)
            }
        }

        // Debounce search
        const debounceTimer = setTimeout(() => {
            fetchResults()
        }, 300)

        return () => clearTimeout(debounceTimer)
    }, [query])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (query.trim()) {
            if (results.length > 0 && results[0].githubUsername) {
                router.push(`/u/${results[0].githubUsername}`)
                setShowDropdown(false)
            } else {
                router.push(`/u/${query.trim()}`)
            }
        }
    }

    const handleSelectResult = (username: string | null) => {
        if (username) {
            router.push(`/u/${username}`)
            setShowDropdown(false)
        }
    }

    return (
        <div ref={wrapperRef} className="relative w-full z-50">
            <form onSubmit={handleSubmit} className="relative w-full group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setShowDropdown(true)
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Search developers..."
                    className="w-full bg-background/50 backdrop-blur-sm border border-border/50 rounded-xl pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all placeholder:text-muted-foreground hover:bg-background shadow-sm hover:border-border"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center">
                    {isSearching && <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />}
                </div>
            </form>

            {showDropdown && query.trim() !== "" && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-md border border-border shadow-lg rounded-xl overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                    {results.length > 0 ? (
                        <div className="flex flex-col max-h-[300px] overflow-y-auto">
                            <span className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Developers
                            </span>
                            {results.map((user) => (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => handleSelectResult(user.githubUsername)}
                                    className="flex items-center gap-3 px-3 py-2.5 mx-1.5 rounded-lg hover:bg-primary/10 transition-colors text-left"
                                >
                                    <Avatar className="h-8 w-8 shrink-0">
                                        <AvatarImage src={user.image || ""} />
                                        <AvatarFallback>{user.name?.charAt(0) || "U"}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col min-w-0 overflow-hidden">
                                        <span className="text-sm font-medium truncate">
                                            {user.name || user.githubUsername}
                                        </span>
                                        {user.name && user.githubUsername && (
                                            <span className="text-xs text-muted-foreground truncate">
                                                @{user.githubUsername}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : !isSearching ? (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                            No DevLens users found for &quot;{query}&quot;. 
                            <br/><span className="text-xs opacity-70 mt-1 block">They may not have joined DevLens yet!</span>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    )
}
