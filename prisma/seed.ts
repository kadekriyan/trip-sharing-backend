import bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash('password123', 10)

  await prisma.user.upsert({
    where: { email: 'admin@tripsharing.local' },
    update: {},
    create: {
      email: 'admin@tripsharing.local',
      password,
      name: 'Admin Trip Sharing',
      role: 'admin',
    },
  })
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
