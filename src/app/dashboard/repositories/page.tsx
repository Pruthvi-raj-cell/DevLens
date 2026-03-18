import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { Star, GitFork, BookMarked, ExternalLink, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default async function RepositoriesPage() {
    const user = await requireAuth()

    const repositories = await prisma.repository.findMany({
        where: { userId: user.id },
        include: {
            _count: {
                select: { commits: true }
            }
        },
        orderBy: { updatedAt: 'desc' },
    })

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Repositories</h2>
                    <p className="text-muted-foreground">
                        A complete list of your synced GitHub repositories.
                    </p>
                </div>
                <div className="flex items-center space-x-2 bg-muted px-4 py-2 rounded-lg">
                    <span className="font-semibold text-lg">{repositories.length}</span>
                    <span className="text-sm text-muted-foreground">Total Repos</span>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                {repositories.map((repo) => (
                    <div key={repo.id} className="rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col p-5 hover:border-primary/50 transition duration-200">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-primary/10 p-2 rounded-lg">
                                    <BookMarked className="h-5 w-5 text-primary" />
                                </div>
                                <a href={repo.url} target="_blank" rel="noreferrer" className="font-semibold text-lg hover:underline flex items-center gap-2 group">
                                    <span className="truncate max-w-[200px]">{repo.name}</span>
                                    <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                            </div>
                        </div>

                        <div className="mt-3 text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                            {repo.description || "No description provided."}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            {repo.language && (
                                <Badge variant="secondary" className="font-normal">
                                    {repo.language}
                                </Badge>
                            )}
                            <Badge variant="outline" className="font-normal gap-1">
                                <Star className="h-3 w-3" /> {repo.stars}
                            </Badge>
                            <Badge variant="outline" className="font-normal gap-1">
                                <GitFork className="h-3 w-3" /> {repo.forks}
                            </Badge>
                        </div>

                        <div className="mt-6 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <span className="font-medium text-foreground">{repo._count.commits}</span> commits synced
                            </div>
                            <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(repo.updatedAt).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                ))}
                {repositories.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-xl">
                        No repositories found. Go to the Overview tab to sync your data.
                    </div>
                )}
            </div>
        </div>
    )
}
