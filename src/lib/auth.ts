import { PrismaAdapter } from "@auth/prisma-adapter"
import { NextAuthOptions } from "next-auth"
import GithubProvider from "next-auth/providers/github"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        GithubProvider({
            clientId: process.env.GITHUB_ID as string,
            clientSecret: process.env.GITHUB_SECRET as string,
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
