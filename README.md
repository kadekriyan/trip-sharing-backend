# BACKEND CODE REFERENCE GUIDE (INTEGRATED)

**Trip Sharing Web Application - Backend Development**

**Technology**: Node.js + Express.js + PostgreSQL + Prisma ORM + Hcaptcha

**Features**: Captcha Verification | Admin CRUD Participant | Grouped Booking Logic

---

## TABLE OF CONTENTS

1. [Project Setup](#1-project-setup)
2. [Project Structure](#2-project-structure)
3. [Environment Configuration](#3-environment-configuration)
4. [Database Setup](#4-database-setup)
5. [API Architecture](#5-api-architecture)
6. [Authentication Implementation](#6-authentication-implementation)
7. [Captcha Verification Middleware](#7-captcha-verification-middleware)
8. [Route Handlers & Controllers](#8-route-handlers--controllers)
9. [Admin Participant Management](#9-admin-participant-management)
10. [Business Logic & Services](#10-business-logic--services)
11. [Payment Integration (Midtrans)](#11-payment-integration-midtrans)
12. [Error Handling & Validation](#12-error-handling--validation)
13. [Middleware](#13-middleware)
14. [Testing](#14-testing)
15. [Deployment](#15-deployment)

---

## 1. PROJECT SETUP

### 1.1 Initial Setup

```bash
# Create project
mkdir trip-sharing-backend
cd trip-sharing-backend

# Initialize npm
npm init -y

# Install core dependencies
npm install express cors dotenv
npm install @prisma/client prisma
npm install jsonwebtoken bcrypt
npm install joi axios nodemailer multer sharp
npm install winston express-rate-limit

# Install CAPTCHA verification
npm install axios  # for Hcaptcha API calls

# Install dev dependencies
npm install -D typescript @types/express @types/node
npm install -D ts-node nodemon
npm install -D jest @types/jest ts-jest supertest
npm install -D eslint prettier

# Initialize TypeScript
npx tsc --init

# Initialize Prisma
npx prisma init
```

### 1.2 Package.json Scripts

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "lint": "eslint src",
    "format": "prettier --write src",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "seed": "ts-node prisma/seed.ts"
  }
}
```

---

## 2. PROJECT STRUCTURE

```
trip-sharing-backend/
├── src/
│   ├── server.ts
│   ├── app.ts
│   │
│   ├── routes/
│   │   ├── index.ts
│   │   ├── auth.routes.ts
│   │   ├── admin.routes.ts             # ⭐ NEW
│   │   ├── destinations.routes.ts
│   │   ├── bookings.routes.ts
│   │   ├── payments.routes.ts
│   │   ├── participants.routes.ts      # ⭐ UPDATED
│   │   ├── articles.routes.ts
│   │   └── drivers.routes.ts
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── admin.controller.ts         # ⭐ NEW
│   │   ├── participant.controller.ts   # ⭐ UPDATED
│   │   ├── booking.controller.ts
│   │   ├── payment.controller.ts
│   │   ├── article.controller.ts
│   │   └── driver.controller.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── booking.service.ts
│   │   ├── payment.service.ts
│   │   ├── email.service.ts
│   │   ├── captcha.service.ts          # ⭐ NEW
│   │   ├── participant.service.ts      # ⭐ NEW
│   │   ├── file.service.ts
│   │   ├── article.service.ts
│   │   └── destination.service.ts
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── captcha.middleware.ts       # ⭐ NEW
│   │   ├── errorHandler.ts
│   │   ├── validation.ts
│   │   ├── logger.ts
│   │   └── rateLimiter.ts
│   │
│   ├── validators/
│   │   ├── auth.validator.ts
│   │   ├── booking.validator.ts
│   │   ├── participant.validator.ts    # ⭐ NEW
│   │   ├── article.validator.ts
│   │   └── user.validator.ts
│   │
│   ├── utils/
│   │   ├── jwt.ts
│   │   ├── response.ts
│   │   ├── errors.ts
│   │   ├── logger.ts
│   │   ├── formatter.ts
│   │   ├── asyncHandler.ts
│   │   └── constants.ts
│   │
│   ├── types/
│   │   ├── index.ts
│   │   ├── express.ts
│   │   ├── booking.ts
│   │   ├── payment.ts
│   │   └── captcha.ts                  # ⭐ NEW
│   │
│   └── config/
│       ├── database.ts
│       ├── env.ts
│       ├── midtrans.ts
│       └── captcha.ts                  # ⭐ NEW
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── .env.example
├── .env.local
├── tsconfig.json
├── jest.config.js
└── docker-compose.yml
```

---

## 3. ENVIRONMENT CONFIGURATION

### 3.1 .env.local Template

```bash
# Application
NODE_ENV=development
PORT=3001
APP_NAME=Trip Sharing API
APP_URL=http://localhost:3001

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/trip_sharing

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_here_minimum_32_chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# CAPTCHA VERIFICATION ⭐
HCAPTCHA_SECRET_KEY=your_hcaptcha_secret_key
HCAPTCHA_VERIFY_URL=https://hcaptcha.com/siteverify

# Payment Gateway (Midtrans)
MIDTRANS_SERVER_KEY=your_midtrans_server_key
MIDTRANS_CLIENT_KEY=your_midtrans_client_key
MIDTRANS_ENVIRONMENT=sandbox

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@tripsharing.com

# File Upload (Cloudinary)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Logging
LOG_LEVEL=debug

# CORS
CORS_ORIGIN=http://localhost:3000,https://tripsharing.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 4. DATABASE SETUP

### 4.1 Prisma Schema

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// Users (Admin, Driver, Participant)
model User {
  id                 Int                @id @default(autoincrement())
  email              String             @unique
  password           String
  name               String
  phone              String?
  profile_image_url  String?
  role               String             // 'admin', 'driver', 'participant'
  is_active          Boolean            @default(true)
  created_at         DateTime           @default(now())
  updated_at         DateTime           @updatedAt
  
  driver             Driver?
  participants       Participant[]
  articles           Article[]
  admin_logs         AuditLog[]
  
  @@index([email])
  @@index([role])
}

// Destinations
model Destination {
  id                 Int                @id @default(autoincrement())
  name               String
  description        String?
  image_url          String?
  price_per_person   Decimal            @db.Decimal(10, 2)
  duration_days      Int?
  itinerary          Json?
  is_active          Boolean            @default(true)
  created_at         DateTime           @default(now())
  updated_at         DateTime           @updatedAt
  
  trips              Trip[]
  
  @@index([is_active])
}

// Trips / Departures
model Trip {
  id                 Int                @id @default(autoincrement())
  destination_id     Int
  departure_date     DateTime
  return_date        DateTime?
  guide_id           Int?
  max_participants   Int                @default(6)
  current_participants Int               @default(0)
  status             String             @default("planning")
  notes              String?
  created_at         DateTime           @default(now())
  updated_at         DateTime           @updatedAt
  
  destination        Destination        @relation(fields: [destination_id], references: [id])
  guide              User?              @relation(fields: [guide_id], references: [id])
  booking_groups     BookingGroup[]
  
  @@index([destination_id])
  @@index([departure_date])
  @@index([status])
}

// Booking Groups
model BookingGroup {
  id                 Int                @id @default(autoincrement())
  trip_id            Int
  group_number       Int
  status             String             @default("open")
  current_participants Int               @default(0)
  max_participants   Int                @default(6)
  total_price        Decimal?           @db.Decimal(12, 2)
  price_per_person   Decimal            @db.Decimal(10, 2)
  created_at         DateTime           @default(now())
  updated_at         DateTime           @updatedAt
  
  trip               Trip               @relation(fields: [trip_id], references: [id])
  participants       Participant[]
  payments           Payment[]
  
  @@unique([trip_id, group_number])
  @@index([trip_id])
  @@index([status])
}

// Participants
model Participant {
  id                 Int                @id @default(autoincrement())
  booking_group_id   Int
  user_id            Int
  full_name          String
  phone_number       String
  country            String
  date_of_birth      DateTime
  hotel_preference   String?
  passport_number    String?
  identity_type      String?
  room_type          String?
  health_notes       String?
  preferred_language String?
  travel_insurance   Boolean            @default(false)
  payment_status     String             @default("pending")
  checked_in         Boolean            @default(false)
  created_at         DateTime           @default(now())
  updated_at         DateTime           @updatedAt
  
  booking_group      BookingGroup       @relation(fields: [booking_group_id], references: [id])
  user               User               @relation(fields: [user_id], references: [id])
  payment            Payment?
  
  @@index([booking_group_id])
  @@index([user_id])
  @@index([payment_status])
}

// Payments
model Payment {
  id                 Int                @id @default(autoincrement())
  participant_id     Int                @unique
  booking_group_id   Int
  amount             Decimal            @db.Decimal(12, 2)
  payment_method     String             @default("midtrans_transfer")
  midtrans_transaction_id String?        @unique
  midtrans_order_id  String?            @unique
  status             String             @default("pending")
  transaction_time   DateTime?
  completion_time    DateTime?
  payment_proof_url  String?
  notes              String?
  created_at         DateTime           @default(now())
  updated_at         DateTime           @updatedAt
  
  participant        Participant        @relation(fields: [participant_id], references: [id])
  booking_group      BookingGroup       @relation(fields: [booking_group_id], references: [id])
  
  @@index([booking_group_id])
  @@index([status])
  @@index([midtrans_order_id])
}

// Articles / Blog
model Article {
  id                 Int                @id @default(autoincrement())
  title              String
  slug               String             @unique
  excerpt            String?
  content            Json
  featured_image_url String?
  author_id          Int
  category           String?
  seo_title          String?
  seo_description    String?
  seo_keywords       String?
  is_published       Boolean            @default(false)
  published_at       DateTime?
  view_count         Int                @default(0)
  created_at         DateTime           @default(now())
  updated_at         DateTime           @updatedAt
  
  author             User               @relation(fields: [author_id], references: [id])
  
  @@index([is_published])
  @@index([category])
}

// Drivers
model Driver {
  id                 Int                @id @default(autoincrement())
  user_id            Int                @unique
  license_number     String             @unique
  vehicle_type       String
  license_expiry_date DateTime?
  rating             Decimal            @default(0) @db.Decimal(3, 2)
  is_available       Boolean            @default(true)
  created_at         DateTime           @default(now())
  updated_at         DateTime           @updatedAt
  
  user               User               @relation(fields: [user_id], references: [id])
  
  @@index([is_available])
}

// Audit Log
model AuditLog {
  id                 Int                @id @default(autoincrement())
  user_id            Int?
  action             String
  entity_type        String
  entity_id          Int?
  old_values         Json?
  new_values         Json?
  ip_address         String?
  user_agent         String?
  created_at         DateTime           @default(now())
  
  user               User?              @relation(fields: [user_id], references: [id])
  
  @@index([user_id])
  @@index([entity_type])
}
```

---

## 5. API ARCHITECTURE

### 5.1 Express App Setup

```typescript
// src/app.ts
import express, { Express, Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { routes } from './routes'
import { errorHandler } from './middleware/errorHandler'
import { logger } from './utils/logger'

const app: Express = express()

// Security
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(','),
  credentials: true,
}))

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
})
app.use('/api', limiter)

// Body Parser
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api', routes)

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' })
})

// Error Handler
app.use(errorHandler)

export { app }
```

### 5.2 Server Entry Point

```typescript
// src/server.ts
import { app } from './app'
import { prisma } from './config/database'
import { logger } from './utils/logger'

const PORT = process.env.PORT || 3001

async function start() {
  try {
    await prisma.$connect()
    logger.info('✓ Database connected')

    app.listen(PORT, () => {
      logger.info(`✓ Server running on port ${PORT}`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully')
  await prisma.$disconnect()
  process.exit(0)
})

start()
```

---

## 6. AUTHENTICATION IMPLEMENTATION

### 6.1 JWT Service

```typescript
// src/utils/jwt.ts
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'secret'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

export interface TokenPayload {
  id: number
  email: string
  role: string
}

export class JwtService {
  static generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      algorithm: 'HS256',
    })
  }

  static verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload
    } catch (error) {
      return null
    }
  }
}
```

### 6.2 Auth Service

```typescript
// src/services/auth.service.ts
import bcrypt from 'bcrypt'
import { prisma } from '../config/database'
import { JwtService } from '../utils/jwt'
import { ApiError } from '../utils/errors'

export class AuthService {
  static async register(email: string, password: string, name: string) {
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      throw new ApiError('Email already registered', 400)
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'participant',
      },
    })

    return this.generateAuthTokens(user)
  }

  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      throw new ApiError('Invalid credentials', 401)
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      throw new ApiError('Invalid credentials', 401)
    }

    return this.generateAuthTokens(user)
  }

  private static generateAuthTokens(user: any) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    }

    return {
      token: JwtService.generateToken(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    }
  }
}
```

---

## 7. CAPTCHA VERIFICATION MIDDLEWARE

### 7.1 Captcha Verification Service ⭐

```typescript
// src/services/captcha.service.ts
import axios from 'axios'
import { ApiError } from '../utils/errors'
import { logger } from '../utils/logger'

interface CaptchaVerifyResponse {
  success: boolean
  challenge_ts: string
  hostname: string
  score?: number
  'error-codes'?: string[]
}

export class CaptchaService {
  /**
   * Verify captcha token against Hcaptcha API
   */
  static async verifyCaptcha(token: string): Promise<boolean> {
    if (!token) {
      throw new ApiError('Captcha token is required', 400)
    }

    try {
      const response = await axios.post<CaptchaVerifyResponse>(
        process.env.HCAPTCHA_VERIFY_URL || 'https://hcaptcha.com/siteverify',
        null,
        {
          params: {
            response: token,
            secret: process.env.HCAPTCHA_SECRET_KEY,
          },
        }
      )

      const { success, score, 'error-codes': errorCodes } = response.data

      if (!success) {
        logger.warn('Captcha verification failed:', errorCodes)
        throw new ApiError('Captcha verification failed', 400)
      }

      // Optional: Check score (if using advanced hCaptcha)
      if (score !== undefined && score < 0.5) {
        throw new ApiError('Captcha score too low (possible bot)', 400)
      }

      logger.debug('Captcha verified successfully')
      return true
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error
      }

      logger.error('Captcha verification error:', error.message)
      throw new ApiError('Captcha verification error', 500)
    }
  }
}
```

### 7.2 Captcha Verification Middleware ⭐

```typescript
// src/middleware/captcha.middleware.ts
import { Request, Response, NextFunction } from 'express'
import { CaptchaService } from '../services/captcha.service'
import { ApiError } from '../utils/errors'
import { logger } from '../utils/logger'

interface CaptchaRequest extends Request {
  body: {
    captcha_token?: string
  }
}

export const verifyCaptcha = async (
  req: CaptchaRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const captchaToken = req.body.captcha_token

    if (!captchaToken) {
      throw new ApiError('Captcha token is required', 400)
    }

    // Verify with Hcaptcha API
    await CaptchaService.verifyCaptcha(captchaToken)

    // Remove captcha token from body before processing
    delete req.body.captcha_token

    logger.debug('Captcha verified, proceeding with request')
    next()
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      })
    }

    res.status(500).json({
      success: false,
      message: 'Captcha verification error',
    })
  }
}
```

### 7.3 Booking Route with Captcha ⭐

```typescript
// src/routes/bookings.routes.ts
import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { verifyCaptcha } from '../middleware/captcha.middleware' // ⭐ NEW
import { validateRequest } from '../middleware/validation'
import { BookingController } from '../controllers/booking.controller'
import { asyncHandler } from '../utils/asyncHandler'
import { bookingValidator } from '../validators/booking.validator'

const router = Router()

// Get available booking groups
router.get('/groups', asyncHandler(BookingController.getAvailableGroups))

// Create booking WITH captcha verification ⭐
router.post(
  '/',
  authenticate,
  verifyCaptcha, // Verify captcha BEFORE processing
  validateRequest(bookingValidator.create),
  asyncHandler(BookingController.createBooking)
)

// Get user's bookings
router.get(
  '/my-bookings',
  authenticate,
  asyncHandler(BookingController.getUserBookings)
)

export default router
```

---

## 8. ROUTE HANDLERS & CONTROLLERS

### 8.1 Booking Controller

```typescript
// src/controllers/booking.controller.ts
import { Request, Response } from 'express'
import { BookingService } from '../services/booking.service'
import { sendResponse } from '../utils/response'

export class BookingController {
  static async getAvailableGroups(req: Request, res: Response) {
    const { destination_id, departure_date } = req.query

    const groups = await BookingService.getAvailableGroups(
      parseInt(destination_id as string),
      departure_date as string
    )

    sendResponse(res, 200, 'Available groups retrieved', groups)
  }

  static async createBooking(req: Request, res: Response) {
    const userId = req.user?.id || 0
    const result = await BookingService.createBooking(userId, req.body)

    sendResponse(res, 201, 'Booking created successfully', result)
  }

  static async getUserBookings(req: Request, res: Response) {
    const userId = req.user?.id || 0
    const bookings = await BookingService.getUserBookings(userId)

    sendResponse(res, 200, 'User bookings retrieved', bookings)
  }
}
```

---

## 9. ADMIN PARTICIPANT MANAGEMENT

### 9.1 Admin Routes ⭐

```typescript
// src/routes/admin.routes.ts
import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { validateRequest } from '../middleware/validation'
import { AdminController } from '../controllers/admin.controller'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

// All admin routes require authentication & admin role
router.use(authenticate, authorize(['admin']))

// Participant Management ⭐
router.post(
  '/participants',
  validateRequest(Joi.object({
    trip_id: Joi.number().required(),
    group_id: Joi.number().required(),
    full_name: Joi.string().required(),
    phone_number: Joi.string().required(),
    country: Joi.string().length(2).required(),
    date_of_birth: Joi.date().required(),
    hotel_preference: Joi.string().optional(),
    payment_status: Joi.string().valid('pending', 'paid'),
  })),
  asyncHandler(AdminController.createParticipant)
)

router.get(
  '/participants',
  asyncHandler(AdminController.getParticipants)
)

router.patch(
  '/participants/:id',
  asyncHandler(AdminController.updateParticipant)
)

router.delete(
  '/participants/:id',
  asyncHandler(AdminController.deleteParticipant)
)

router.patch(
  '/participants/:id/move',
  validateRequest(Joi.object({
    new_group_id: Joi.number().required(),
  })),
  asyncHandler(AdminController.moveParticipant)
)

export default router
```

### 9.2 Admin Controller ⭐

```typescript
// src/controllers/admin.controller.ts
import { Request, Response } from 'express'
import { ParticipantService } from '../services/participant.service'
import { sendResponse } from '../utils/response'

export class AdminController {
  /**
   * Create participant (manual booking - no payment required)
   */
  static async createParticipant(req: Request, res: Response) {
    const { trip_id, group_id, full_name, phone_number, country, date_of_birth, hotel_preference, payment_status } = req.body

    // Admin create user if needed
    const result = await ParticipantService.createParticipantAsAdmin({
      trip_id,
      group_id,
      full_name,
      phone_number,
      country,
      date_of_birth: new Date(date_of_birth),
      hotel_preference,
      payment_status,
      admin_id: req.user?.id,
    })

    sendResponse(res, 201, 'Participant created successfully', result)
  }

  /**
   * Get all participants (admin only)
   */
  static async getParticipants(req: Request, res: Response) {
    const { trip_id, status } = req.query

    const participants = await ParticipantService.getParticipants({
      trip_id: trip_id ? parseInt(trip_id as string) : undefined,
      status: status as string,
    })

    sendResponse(res, 200, 'Participants retrieved', participants)
  }

  /**
   * Update participant data
   */
  static async updateParticipant(req: Request, res: Response) {
    const { id } = req.params
    const updated = await ParticipantService.updateParticipant(
      parseInt(id),
      req.body
    )

    sendResponse(res, 200, 'Participant updated', updated)
  }

  /**
   * Delete participant
   */
  static async deleteParticipant(req: Request, res: Response) {
    const { id } = req.params
    await ParticipantService.deleteParticipant(parseInt(id))

    sendResponse(res, 200, 'Participant deleted')
  }

  /**
   * Move participant to different group ⭐
   */
  static async moveParticipant(req: Request, res: Response) {
    const { id } = req.params
    const { new_group_id } = req.body

    const result = await ParticipantService.moveParticipant(
      parseInt(id),
      new_group_id
    )

    sendResponse(res, 200, 'Participant moved successfully', result)
  }
}
```

### 9.3 Participant Service ⭐

```typescript
// src/services/participant.service.ts
import { prisma } from '../config/database'
import { ApiError } from '../utils/errors'
import { EmailService } from './email.service'

export class ParticipantService {
  /**
   * Create participant by admin (manual booking, no payment required)
   */
  static async createParticipantAsAdmin(data: any) {
    const { trip_id, group_id, full_name, phone_number, country, date_of_birth, hotel_preference, payment_status, admin_id } = data

    // Verify group exists and has capacity
    const group = await prisma.bookingGroup.findUnique({
      where: { id: group_id },
      include: { trip: true },
    })

    if (!group) {
      throw new ApiError('Group not found', 404)
    }

    if (group.current_participants >= group.max_participants) {
      throw new ApiError('Group is full', 400)
    }

    // Create user if doesn't exist
    let user = await prisma.user.findFirst({
      where: { OR: [{ email: phone_number + '@booking.local' }] },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: `${phone_number}@booking.local`,
          password: 'manual_booking',
          name: full_name,
          phone: phone_number,
          role: 'participant',
        },
      })
    }

    // Create participant
    const participant = await prisma.participant.create({
      data: {
        booking_group_id: group_id,
        user_id: user.id,
        full_name,
        phone_number,
        country,
        date_of_birth,
        hotel_preference,
        payment_status,
      },
    })

    // Update group participant count
    await prisma.bookingGroup.update({
      where: { id: group_id },
      data: { current_participants: { increment: 1 } },
    })

    // Check if group is full
    const updatedGroup = await prisma.bookingGroup.findUnique({
      where: { id: group_id },
    })

    if (updatedGroup && updatedGroup.current_participants === updatedGroup.max_participants) {
      await prisma.bookingGroup.update({
        where: { id: group_id },
        data: { status: 'full' },
      })
    }

    // Send email notification
    await EmailService.sendParticipantCreated(user.email, {
      participant_name: full_name,
      trip: group.trip.id,
      payment_status,
    })

    return { participant, group: updatedGroup }
  }

  /**
   * Move participant to different group
   */
  static async moveParticipant(participantId: number, newGroupId: number) {
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: { booking_group: true, user: true },
    })

    if (!participant) {
      throw new ApiError('Participant not found', 404)
    }

    const oldGroupId = participant.booking_group.id

    // Verify new group exists & has capacity
    const newGroup = await prisma.bookingGroup.findUnique({
      where: { id: newGroupId },
    })

    if (!newGroup) {
      throw new ApiError('Target group not found', 404)
    }

    if (newGroup.current_participants >= newGroup.max_participants) {
      throw new ApiError('Target group is full', 400)
    }

    // Move participant
    await prisma.participant.update({
      where: { id: participantId },
      data: { booking_group_id: newGroupId },
    })

    // Update old group count
    await prisma.bookingGroup.update({
      where: { id: oldGroupId },
      data: { current_participants: { decrement: 1 } },
    })

    // Update new group count
    await prisma.bookingGroup.update({
      where: { id: newGroupId },
      data: { current_participants: { increment: 1 } },
    })

    // Send notification email
    await EmailService.sendParticipantMoved(participant.user.email, {
      participant_name: participant.full_name,
      old_group: oldGroupId,
      new_group: newGroupId,
    })

    return { participant, newGroup }
  }

  /**
   * Get participants with filters
   */
  static async getParticipants(filters: any) {
    return await prisma.participant.findMany({
      where: {
        ...(filters.trip_id && {
          booking_group: { trip_id: filters.trip_id },
        }),
        ...(filters.status && { payment_status: filters.status }),
      },
      include: {
        booking_group: { include: { trip: { include: { destination: true } } } },
        user: true,
      },
      orderBy: { created_at: 'desc' },
    })
  }

  /**
   * Update participant
   */
  static async updateParticipant(id: number, data: any) {
    return await prisma.participant.update({
      where: { id },
      data,
    })
  }

  /**
   * Delete participant (with refund if paid)
   */
  static async deleteParticipant(id: number) {
    const participant = await prisma.participant.findUnique({
      where: { id },
      include: { payment: true, booking_group: true },
    })

    if (!participant) {
      throw new ApiError('Participant not found', 404)
    }

    // Soft delete
    await prisma.participant.update({
      where: { id },
      data: { payment_status: 'cancelled' },
    })

    // Update group count
    await prisma.bookingGroup.update({
      where: { id: participant.booking_group.id },
      data: { current_participants: { decrement: 1 } },
    })

    // Handle refund if paid
    if (participant.payment && participant.payment.status === 'completed') {
      // Initiate refund logic (via Midtrans API)
      // ...
    }
  }
}
```

---

## 10. BUSINESS LOGIC & SERVICES

### 10.1 Booking Service

```typescript
// src/services/booking.service.ts
export class BookingService {
  /**
   * Get or create booking group for trip
   */
  static async getOrCreateBookingGroup(tripId: number, destinationPrice: number) {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        booking_groups: {
          where: { status: 'open' },
          orderBy: { group_number: 'asc' },
        },
      },
    })

    if (!trip) {
      throw new ApiError('Trip not found', 404)
    }

    // Check if there's an open group with capacity
    const openGroup = trip.booking_groups[0]
    if (
      openGroup &&
      openGroup.current_participants < openGroup.max_participants
    ) {
      return openGroup
    }

    // Create new booking group
    const maxGroupNumber = await prisma.bookingGroup.findMany({
      where: { trip_id: tripId },
      select: { group_number: true },
    })

    const nextGroupNumber = (maxGroupNumber.length || 0) + 1

    const newGroup = await prisma.bookingGroup.create({
      data: {
        trip_id: tripId,
        group_number: nextGroupNumber,
        status: 'open',
        price_per_person: destinationPrice,
        total_price: destinationPrice * 6,
      },
    })

    return newGroup
  }

  /**
   * Get available booking groups
   */
  static async getAvailableGroups(destinationId: number, departureDate: string) {
    const date = new Date(departureDate)
    date.setHours(0, 0, 0, 0)

    return await prisma.bookingGroup.findMany({
      where: {
        trip: {
          destination_id: destinationId,
          departure_date: {
            gte: date,
            lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
          },
        },
        status: { in: ['open', 'waiting'] },
      },
      include: {
        trip: { include: { destination: true } },
        participants: true,
      },
    })
  }
}
```

---

## 11. PAYMENT INTEGRATION (MIDTRANS)

### 11.1 Payment Webhook with Captcha Context

```typescript
// src/routes/payments.routes.ts
router.post(
  '/webhook',
  // Note: No authentication needed for webhook
  // But verify Midtrans signature
  asyncHandler(PaymentController.handleWebhook)
)
```

---

## 12. ERROR HANDLING & VALIDATION

### 12.1 Custom Errors

```typescript
// src/utils/errors.ts
export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
```

### 12.2 Error Handler

```typescript
// src/middleware/errorHandler.ts
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    })
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  })
}
```

---

## 13. MIDDLEWARE

### 13.1 Auth Middleware

```typescript
// src/middleware/auth.middleware.ts
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    throw new ApiError('Missing authorization header', 401)
  }

  const token = authHeader.substring(7)
  const payload = JwtService.verifyToken(token)

  if (!payload) {
    throw new ApiError('Invalid token', 401)
  }

  ;(req as any).user = payload
  next()
}

export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      throw new ApiError('Access denied', 403)
    }
    next()
  }
}
```

---

## 14. TESTING

### 14.1 Captcha Verification Test

```typescript
// tests/captcha.test.ts
describe('Captcha Verification', () => {
  it('should verify valid captcha token', async () => {
    const validToken = 'valid_token_xxx'
    const result = await CaptchaService.verifyCaptcha(validToken)
    expect(result).toBe(true)
  })

  it('should reject invalid captcha token', async () => {
    const invalidToken = 'invalid_token'
    expect(() => CaptchaService.verifyCaptcha(invalidToken)).rejects.toThrow()
  })
})
```

---

## 15. DEPLOYMENT

### 15.1 Deployment Setup

```bash
# Build for production
npm run build

# Start production server
npm start
```

---

## 16. API ENDPOINTS

Base URL lokal:

```txt
http://localhost:3001
```

Base API path:

```txt
/api
```

### 16.1 Health Check

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Check API health status |

Response example:

```json
{
  "status": "OK",
  "timestamp": "2026-08-03T10:00:00.000Z"
}
```

---

### 16.2 Authentication

Base path:

```txt
/api/auth
```

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register new participant user |
| POST | `/api/auth/login` | No | Login user and receive JWT token |
| GET | `/api/auth/me` | Bearer Token | Get authenticated user payload |

#### Register

```http
POST /api/auth/register
Content-Type: application/json
```

Request body:

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json
```

Request body:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response data includes:

```json
{
  "token": "jwt_access_token",
  "refresh_token": "jwt_refresh_token",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "participant"
  }
}
```

---

### 16.3 Public Destinations

Base path:

```txt
/api/destinations
```

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/destinations` | No | List active destinations |
| GET | `/api/destinations/:id` | No | Get destination detail with trips |

---

### 16.4 Public Articles

Base path:

```txt
/api/articles
```

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/articles` | No | List published articles |
| GET | `/api/articles/:slug` | No | Get article detail by slug |

---

### 16.5 Public Drivers

Base path:

```txt
/api/drivers
```

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/drivers` | No | List available drivers |

---

### 16.6 Bookings

Base path:

```txt
/api/bookings
```

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/bookings/groups` | No | Get available booking groups by destination and departure date |
| POST | `/api/bookings` | Bearer Token + Captcha | Create booking and join/create group |
| GET | `/api/bookings/my-bookings` | Bearer Token | Get authenticated user's bookings |

#### Get Available Booking Groups

```http
GET /api/bookings/groups?destination_id=1&departure_date=2026-08-15
```

Query params:

| Name | Type | Required | Description |
|---|---|---|---|
| `destination_id` | number | Yes | Destination ID |
| `departure_date` | ISO date | Yes | Trip departure date |

#### Create Booking

```http
POST /api/bookings
Authorization: Bearer <token>
Content-Type: application/json
```

Request body:

```json
{
  "trip_id": 1,
  "full_name": "John Doe",
  "phone_number": "+628123456789",
  "country": "ID",
  "date_of_birth": "1995-01-20",
  "health_notes": "No allergies",
  "preferred_language": "id",
  "captcha_token": "hcaptcha_token"
}
```

---

### 16.7 Participants

Base path:

```txt
/api/participants
```

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/participants/me` | Bearer Token | Get participants linked to authenticated user |

---

### 16.8 Payments

Base path:

```txt
/api/payments
```

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/payments/participants/:participantId/transaction` | Bearer Token | Create Midtrans Snap payment transaction |
| POST | `/api/payments/webhook` | Midtrans Signature | Handle Midtrans webhook notification |

#### Create Payment Transaction

```http
POST /api/payments/participants/1/transaction
Authorization: Bearer <token>
```

Response data includes:

```json
{
  "payment_id": 1,
  "snap_token": "midtrans_snap_token",
  "redirect_url": "https://app.sandbox.midtrans.com/...",
  "order_id": "TRIP-1-1720000000000",
  "amount": "1000000"
}
```

---

### 16.9 Admin Participant Management

All admin endpoints require:

```http
Authorization: Bearer <admin_token>
```

Base path:

```txt
/api/admin/participants
```

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/admin/participants` | Admin | Create participant manually |
| GET | `/api/admin/participants` | Admin | List participants with optional filters |
| PATCH | `/api/admin/participants/:id` | Admin | Update participant data |
| DELETE | `/api/admin/participants/:id` | Admin | Soft-delete/cancel participant |
| PATCH | `/api/admin/participants/:id/move` | Admin | Move participant to another booking group |

#### Admin Create Participant

```json
{
  "trip_id": 1,
  "group_id": 1,
  "full_name": "Manual Participant",
  "phone_number": "+628111111111",
  "country": "ID",
  "date_of_birth": "1990-01-01",
  "payment_status": "pending"
}
```

#### Move Participant

```json
{
  "new_group_id": 2
}
```

Query filters for list:

| Name | Type | Required | Description |
|---|---|---|---|
| `trip_id` | number | No | Filter by trip ID |
| `status` | string | No | Filter by participant payment status |

---

### 16.10 Admin Destination CRUD

Base path:

```txt
/api/admin/destinations
```

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/admin/destinations` | Admin | Create destination |
| GET | `/api/admin/destinations` | Admin | List destinations |
| GET | `/api/admin/destinations/:id` | Admin | Get destination detail |
| PATCH | `/api/admin/destinations/:id` | Admin | Update destination |
| DELETE | `/api/admin/destinations/:id` | Admin | Delete destination if it has no trips |

Request body for create:

```json
{
  "name": "Bali Adventure",
  "description": "Explore Bali with shared trip group.",
  "image_url": "https://example.com/bali.jpg",
  "price_per_person": 1500000,
  "duration_days": 3,
  "itinerary": [
    {
      "day": 1,
      "title": "Arrival and beach tour"
    }
  ],
  "is_active": true
}
```

Query filters for list:

| Name | Type | Required | Description |
|---|---|---|---|
| `is_active` | boolean | No | Filter active/inactive destination |

---

### 16.11 Admin Trip CRUD

Base path:

```txt
/api/admin/trips
```

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/admin/trips` | Admin | Create trip/departure schedule |
| GET | `/api/admin/trips` | Admin | List trips |
| GET | `/api/admin/trips/:id` | Admin | Get trip detail |
| PATCH | `/api/admin/trips/:id` | Admin | Update trip |
| DELETE | `/api/admin/trips/:id` | Admin | Delete trip if it has no participants |

Request body for create:

```json
{
  "destination_id": 1,
  "departure_date": "2026-08-15T08:00:00.000Z",
  "return_date": "2026-08-18T18:00:00.000Z",
  "guide_id": 2,
  "max_participants": 6,
  "status": "published",
  "notes": "Meet at airport arrival gate."
}
```

Query filters for list:

| Name | Type | Required | Description |
|---|---|---|---|
| `destination_id` | number | No | Filter by destination |
| `status` | string | No | Filter by trip status |

Allowed trip statuses:

```txt
planning, published, departed, completed, cancelled
```

---

### 16.12 Admin Article CRUD

Base path:

```txt
/api/admin/articles
```

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/admin/articles` | Admin | Create article |
| GET | `/api/admin/articles` | Admin | List articles |
| GET | `/api/admin/articles/:id` | Admin | Get article detail |
| PATCH | `/api/admin/articles/:id` | Admin | Update article |
| DELETE | `/api/admin/articles/:id` | Admin | Delete article |

Request body for create:

```json
{
  "title": "Travel Tips for First-Time Backpackers",
  "slug": "travel-tips-first-time-backpackers",
  "excerpt": "Simple tips before joining your first group trip.",
  "content": {
    "type": "doc",
    "content": []
  },
  "featured_image_url": "https://example.com/article.jpg",
  "category": "tips",
  "seo_title": "Travel Tips for Backpackers",
  "seo_description": "Beginner-friendly backpacker travel tips.",
  "seo_keywords": "travel, backpacker, tips",
  "is_published": true
}
```

Notes:

- If `author_id` is not provided, API uses the authenticated admin user ID.
- When `is_published` is set to `true`, `published_at` is filled automatically.
- When `is_published` is set to `false`, `published_at` is cleared.

Query filters for list:

| Name | Type | Required | Description |
|---|---|---|---|
| `is_published` | boolean | No | Filter published/draft article |
| `category` | string | No | Filter by category |

---

### 16.13 Admin Driver CRUD

Base path:

```txt
/api/admin/drivers
```

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/admin/drivers` | Admin | Create driver profile for existing user |
| GET | `/api/admin/drivers` | Admin | List drivers |
| GET | `/api/admin/drivers/:id` | Admin | Get driver detail |
| PATCH | `/api/admin/drivers/:id` | Admin | Update driver |
| DELETE | `/api/admin/drivers/:id` | Admin | Delete driver |

Request body for create:

```json
{
  "user_id": 2,
  "license_number": "SIM-A-123456",
  "vehicle_type": "Toyota HiAce",
  "license_expiry_date": "2029-08-30",
  "is_available": true
}
```

Query filters for list:

| Name | Type | Required | Description |
|---|---|---|---|
| `is_available` | boolean | No | Filter available/unavailable driver |

---

### 16.14 Authentication Header Format

For protected endpoints, send JWT token using Bearer authentication:

```http
Authorization: Bearer <token>
```

Admin-only endpoints require authenticated user role:

```txt
admin
```

---

### 16.15 Standard API Response Format

Success response:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "timestamp": "2026-08-03T10:00:00.000Z"
}
```

Error response:

```json
{
  "success": false,
  "message": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "\"email\" must be a valid email"
    }
  ],
  "timestamp": "2026-08-03T10:00:00.000Z"
}
```

---

**Last Updated**: August 3, 2024  
**Status**: ✅ Ready for Development
