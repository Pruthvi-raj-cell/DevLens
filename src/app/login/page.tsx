import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { SignInButton } from "@/components/auth/sign-in-button"

export const metadata: Metadata = {
    title: "Login - Devlens",
    description: "Login to your account",
}

export default async function LoginPage() {
    const session = await getSession()

    if (session) {
        redirect("/dashboard")
    }

    return (
        <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
            <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
                <div className="absolute inset-0 bg-zinc-900" />
                <div className="relative z-20 flex items-center text-xl font-bold gap-3 drop-shadow-sm">
                    <img src="/logo.svg?v=2" alt="DevLens" className="w-10 h-10 object-contain drop-shadow-md" />
                    <span className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-amber-600 drop-shadow-sm">
                        DevLens
                    </span>
                </div>
                <div className="relative z-20 mt-auto">
                    <blockquote className="space-y-2">
                        <p className="text-lg">
                            &ldquo;Unveil the story behind your code. Developer intelligence that visualizes your GitHub journey with unprecedented clarity.&rdquo;
                        </p>
                    </blockquote>
                </div>
            </div>
            <div className="lg:p-8">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Welcome back
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Sign in to your account with GitHub to continue
                        </p>
                    </div>
                    <SignInButton />
                    <p className="px-8 text-center text-sm text-muted-foreground">
                        By clicking continue, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </div>
            </div>
        </div>
    )
}
