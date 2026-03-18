import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SearchX } from "lucide-react"

export default function NotFound() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background px-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <SearchX className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                    Profile not found
                </h1>
                <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl">
                    This user either doesn't exist or has set their Devlens profile to private.
                </p>
            </div>
            <div className="flex flex-col gap-2 min-[400px]:flex-row mt-6">
                <Button asChild size="lg">
                    <Link href="/">
                        Go back home
                    </Link>
                </Button>
            </div>
        </div>
    )
}
