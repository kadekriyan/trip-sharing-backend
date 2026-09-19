import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { prisma } from '../config/database'
import { JwtService } from '../utils/jwt'
import { ApiError } from '../utils/errors'
import { EmailService } from './email.service'
import { logger } from '../utils/logger'

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

  static async getMe(userId: string) {
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
      id: user.id,
      fullName: user.name,
      name: user.name,
      email: user.email,
      phoneNumber: user.phone,
      nationality: latestParticipant?.nationality || latestParticipant?.country || 'Indonesia',
      role: user.role === 'participant' ? 'traveler' : user.role,
      createdAt: user.created_at,
    }
  }

  static async forgotPassword(email: string, clientBaseUrl?: string) {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.is_active) {
      // Return ambiguous success to avoid user enumeration
      return {
        message: 'Jika email terdaftar, tautan pengaturan ulang kata sandi telah dikirim ke email Anda.',
      }
    }

    // Invalidate existing unused tokens
    await prisma.passwordResetToken.updateMany({
      where: { user_id: user.id, is_used: false },
      data: { is_used: true },
    })

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour validity

    await prisma.passwordResetToken.create({
      data: {
        user_id: user.id,
        token,
        expires_at: expiresAt,
      },
    })

    const frontendBase = clientBaseUrl || process.env.FRONTEND_URL || 'http://localhost:3000'
    const resetUrl = `${frontendBase.replace(/\/$/, '')}/reset-password?token=${token}`

    try {
      await EmailService.sendPasswordResetEmail(user.email, resetUrl, user.name)
    } catch (err) {
      logger.error('Failed to send password reset email', { email: user.email, error: err })
    }

    return {
      message: 'Jika email terdaftar, tautan pengaturan ulang kata sandi telah dikirim ke email Anda.',
    }
  }

  static async verifyResetToken(token: string) {
    if (!token) {
      throw new ApiError('Token reset kata sandi wajib disertakan.', 400)
    }

    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!record || record.is_used || new Date() > record.expires_at || !record.user?.is_active) {
      throw new ApiError('Tautan pengaturan ulang kata sandi tidak valid atau telah kedaluwarsa.', 400)
    }

    return {
      valid: true,
      email: record.user.email,
      name: record.user.name,
    }
  }

  static async resetPassword(token: string, newPassword: string) {
    if (!token) {
      throw new ApiError('Token reset kata sandi wajib disertakan.', 400)
    }
    if (!newPassword || newPassword.length < 6) {
      throw new ApiError('Kata sandi baru minimal 6 karakter.', 400)
    }

    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!record || record.is_used || new Date() > record.expires_at || !record.user?.is_active) {
      throw new ApiError('Tautan pengaturan ulang kata sandi tidak valid atau telah kedaluwarsa.', 400)
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.user_id },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { is_used: true },
      }),
    ])

    return {
      message: 'Kata sandi berhasil diperbarui. Silakan masuk kembali dengan kata sandi baru Anda.',
    }
  }

  private static generateAuthTokens(user: {
    id: string
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

