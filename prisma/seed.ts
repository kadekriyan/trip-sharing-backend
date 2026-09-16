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

  const existingSeo = await prisma.seoSetting.findFirst()
  if (!existingSeo) {
    await prisma.seoSetting.create({
      data: {
        site_title_default: 'Share Tour Jogja — Open Trip & Yogyakarta Sharing Tours',
        site_title_template: '%s | Share Tour Jogja',
        meta_description:
          'Open trip and sharing tour platform in Yogyakarta & Indonesia. Join small-group travel tours, save up to 60% with cost-sharing, and make new friends.',
        keywords: [
          'Share Tour Jogja',
          'Open Trip Jogja',
          'Sharing Tour Yogyakarta',
          'Trip Sharing Jogja',
          'Small Group Travel Indonesia',
        ],
        default_og_image: '/images/hero-bromo.png',
        robots_index: true,
      },
    })
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
