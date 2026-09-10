import './config/env'
import './types'
import path from 'path'
import express, { Express, Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { routes } from './routes'
import { errorHandler } from './middleware/errorHandler'
import { requestLogger } from './middleware/logger'
import { apiRateLimiter } from './middleware/rateLimiter'

const app: Express = express()

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  })
)

// Static file serving for uploaded images
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

app.use('/api', apiRateLimiter)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))
app.use(requestLogger)

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

app.use('/api', routes)

app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found', path: req.originalUrl })
})

app.use(errorHandler)

export { app }
export default app

