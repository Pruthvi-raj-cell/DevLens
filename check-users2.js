const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const users = await prisma.user.findMany({ select: { githubUsername: true, name: true, email: true } });
    console.log(JSON.stringify(users, null, 2));
}
main().finally(() => prisma.$disconnect());
