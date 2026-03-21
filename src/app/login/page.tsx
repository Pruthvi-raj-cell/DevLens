import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { LoginPageClient } from "@/components/auth/login-page-client"

export const metadata: Metadata = {
    title: "Login - Devlens",
    description: "Login to your account",
}

export default async function LoginPage() {
    const session = await getSession()

    if (session) {
        redirect("/dashboard")
    }

    return <LoginPageClient />
}
