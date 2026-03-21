import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { LandingPageClient } from "@/components/marketing/landing-page-client"

export default async function Home() {
    const session = await getSession()

    if (session) {
        redirect("/dashboard")
    }

    return <LandingPageClient />
}
