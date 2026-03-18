"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Github } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SignInButton() {
    const [isLoading, setIsLoading] = useState(false)

    const loginWithGithub = async () => {
        try {
            setIsLoading(true)
            await signIn("github", { callbackUrl: "/dashboard" })
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Button
            variant="outline"
            type="button"
            disabled={isLoading}
            onClick={loginWithGithub}
            className="w-full text-base py-6"
        >
            {isLoading ? (
                <span className="mr-2 h-5 w-5 animate-spin rounded-full border-b-2 border-primary"></span>
            ) : (
                <Github className="mr-2 h-5 w-5" />
            )}
            Continue with GitHub
        </Button>
    )
}
