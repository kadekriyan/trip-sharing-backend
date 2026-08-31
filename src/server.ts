import { app } from './app'
import { prisma } from './config/database'
import { logger } from './utils/logger'

const PORT = Number(process.env.PORT || 3001)

async function start() {
  try {
    await prisma.$connect()
    logger.info('Database connected')

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`)
    })
  } catch (error) {
    logger.error('Failed to start server', error)
    process.exit(1)
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully')
  await prisma.$disconnect()
  process.exit(0)
})

start()
