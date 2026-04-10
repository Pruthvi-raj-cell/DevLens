import { PrismaAdapter } from "@auth/prisma-adapter"
import { NextAuthOptions } from "next-auth"
import { Adapter } from "next-auth/adapters"
import GithubProvider from "next-auth/providers/github"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma) as Adapter,
    providers: [
        GithubProvider({
            clientId: process.env.GITHUB_ID as string,
            clientSecret: process.env.GITHUB_SECRET as string,
            // GitHub is OAuth 2.0, not OIDC — disable ID token and use state-only checks
            // to prevent openid-client from demanding an issuer configuration
            idToken: false,
            checks: ["state"],
            // Request repo scope so we can read repositories, commits, and languages
            authorization: {
                params: {
                    scope: "read:user user:email repo",
                },
            },
            profile(profile) {
                return {
                    id: profile.id.toString(),
                    name: profile.name ?? profile.login,
                    email: profile.email,
                    image: profile.avatar_url,
                    githubId: profile.id,
                    githubUsername: profile.login,
                }
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            // Every time the user signs in via GitHub, update the stored access_token
            // so it never goes stale. The PrismaAdapter only writes the token during
            // the initial linkAccount event and never refreshes it afterwards.
            if (account?.provider === "github" && account.access_token) {
                try {
                    await prisma.account.updateMany({
                        where: {
                            userId: user.id,
                            provider: "github",
                        },
                        data: {
                            access_token: account.access_token,
                            expires_at: account.expires_at,
                            refresh_token: account.refresh_token,
                            token_type: account.token_type,
                            scope: account.scope,
                        },
                    })

                    // Also update the GitHub profile info
                    if (profile && "login" in profile) {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: {
                                // @ts-ignore
                                githubUsername: profile.login,
                                // @ts-ignore
                                githubId: profile.id,
                            },
                        })
                    }
                } catch (e) {
                    console.error("[AUTH] Failed to refresh token on sign-in:", e)
                }
            }
            return true
        },
        async session({ session, user }) {
            if (session.user) {
                session.user.id = user.id
                // @ts-ignore
                session.user.githubUsername = user.githubUsername
            }
            return session
        },
    },
    events: {
        async linkAccount({ user, account, profile }) {
            if (account.provider === "github" && profile && "login" in profile) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        // @ts-ignore - profile.login and profile.id exist on GitHub profile
                        githubUsername: profile.login,
                        // @ts-ignore
                        githubId: profile.id,
                    },
                })
            }
        },
    },
}
