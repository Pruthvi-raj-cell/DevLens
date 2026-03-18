# 🛡️ DevLens — Developer Intelligence & GitHub Visualization

DevLens is a premium, open-source dashboard designed to help developers visualize their Git activity and contribution trends with unprecedented clarity. Built with a focus on high-end aesthetics and real-time data syncing.

<img src="public/logo.svg" width="80" alt="DevLens Logo" />

## ✨ Key Features

- **🚀 Real-Time GitHub Sync**: Instantly pull your latest repositories, commits, and language data.
- **📊 Activity Heatmap**: A beautiful, glowing contribution graph inspired by GitHub but refined for a premium dark mode experience.
- **📈 Global Analytics**: Track total commits, star counts, fork activity, and your current coding streak.
- **🧬 Language Breakdown**: Get a granular overview of your most-used programming languages across all repositories.
- **🌐 Public Profiles**: Toggle your profile visibility to share your developer journey with a unique `/u/[username]` link.
- **🌙 Premium Dark Mode**: A sleek, high-contrast interface designed for long coding sessions.

## 🛠️ Tech Stack

DevLens is built with the most modern and robust web technologies:

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router & Server Actions)
- **Database**: [MySQL](https://www.mysql.com/) with [Prisma ORM](https://www.prisma.io/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) (GitHub OAuth)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/)
- **Charts**: [Recharts](https://recharts.org/)
- **Runtime**: [Node.js](https://nodejs.org/)

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/Pruthvi-raj-cell/DevLens.git
cd devlens
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env.local` file in the root directory and add the following:
```env
DATABASE_URL="mysql://your_user:your_password@localhost:3306/devlens"

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_nextauth_secret"

GITHUB_ID="your_github_oauth_client_id"
GITHUB_SECRET="your_github_oauth_client_secret"
```

### 4. Initialize Database
```bash
npx prisma db push
```

### 5. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/Pruthvi-raj-cell/DevLens/issues).

---
Built with 💜 by [Pruthvi-raj-cell](https://github.com/Pruthvi-raj-cell)
