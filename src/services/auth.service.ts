import bcrypt from 'bcrypt'
import { prisma } from '../config/database'
import { JwtService } from '../utils/jwt'
import { ApiError } from '../utils/errors'

export class AuthService {
  static async register(
    emailOrData:
      | string
      | {
          email: string
          password: string
          name?: string
          fullName?: string
          phone?: string
          phoneNumber?: string
          nationality?: string
        },
    password?: string,
    name?: string
  ) {
    let email = ''
    let pass = ''
    let userName = 'Traveler'
    let phone: string | null = null

    if (typeof emailOrData === 'string') {
      email = emailOrData
      pass = password || ''
      userName = name || 'Traveler'
    } else {
      email = emailOrData.email
      pass = emailOrData.password
      userName = emailOrData.fullName || emailOrData.name || 'Traveler'
      phone = emailOrData.phoneNumber || emailOrData.phone || null
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) throw new ApiError('Email already registered', 400)

    const hashedPassword = await bcrypt.hash(pass, 10)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: userName,
        ...(phone ? { phone } : {}),
        role: 'participant',
      },
    })

    return this.generateAuthTokens(user)
  }

  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.is_active) throw new ApiError('Invalid credentials', 401)

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) throw new ApiError('Invalid credentials', 401)

    return this.generateAuthTokens(user)
  }

  static async getMe(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        participants: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    })
    if (!user) throw new ApiError('User not found', 404)

    const latestParticipant = user.participants[0]

    return {
      id: `usr-${user.id}`,
      numericId: user.id,
      fullName: user.name,
      name: user.name,
      email: user.email,
      phoneNumber: user.phone,
      nationality: latestParticipant?.nationality || latestParticipant?.country || 'Indonesia',
      identityNumber: latestParticipant?.identity_number || null,
      role: user.role === 'participant' ? 'traveler' : user.role,
      createdAt: user.created_at,
    }
  }

  private static generateAuthTokens(user: {
    id: number
    email: string
    name: string
    role: string
    phone?: string | null
    created_at?: Date
  }) {
    const payload = { id: user.id, email: user.email, role: user.role }

    return {
      token: JwtService.generateToken(payload),
      refresh_token: JwtService.generateRefreshToken(payload),
      user: payload,
    }
  }
}
