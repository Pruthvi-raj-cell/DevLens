import { prisma } from "@/lib/prisma"

const GITHUB_API_URL = "https://api.github.com"

export class GitHubService {
    private token: string
    private username: string

    constructor(token: string, username: string) {
        this.token = token
        this.username = username
    }

    private async fetchGit(endpoint: string, options: RequestInit = {}) {
        const response = await fetch(`${GITHUB_API_URL}${endpoint}`, {
            ...options,
            headers: {
                Authorization: `Bearer ${this.token}`,
                Accept: "application/vnd.github.v3+json",
                ...options.headers,
            },
        })

        if (!response.ok) {
            throw new Error(`GitHub API Error: ${response.statusText}`)
        }

        return response.json()
    }

    async fetchRepositories() {
        return this.fetchGit(`/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator`)
    }

    async fetchLanguages(repoFullName: string) {
        return this.fetchGit(`/repos/${repoFullName}/languages`)
    }

    async fetchUserCommits() {
        // Get commits by author in the last year
        const since = new Date()
        since.setFullYear(since.getFullYear() - 1)

        // We use the search API to find all commits by the user
        // Note: This API has strong rate limits, so in a real app we'd paginate 
        // and rely on webhook events more heavily.
        const query = `author:${this.username} author-date:>${since.toISOString().split('T')[0]}`

        // To avoid hitting search limits during development, we'll fetch recent repos and their commits
        const repos = await this.fetchRepositories()
        const allCommits = []

        // Only fetch commits from top 10 most recently updated repos to save API calls
        for (const repo of repos.slice(0, 10)) {
            try {
                const url = `/repos/${repo.full_name}/commits?author=${this.username}&since=${since.toISOString()}&per_page=100`
                const commits = await this.fetchGit(url)
                allCommits.push(...commits.map((c: any) => ({
                    ...c,
                    repositoryId: repo.id,
                    repositoryName: repo.full_name
                })))
            } catch (e) {
                console.error(`Failed to fetch commits for ${repo.full_name}`)
            }
        }

        return allCommits
    }
}
