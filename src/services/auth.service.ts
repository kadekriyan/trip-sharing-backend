import bcrypt from 'bcrypt'
import { prisma } from '../config/database'
import { JwtService } from '../utils/jwt'
import { ApiError } from '../utils/errors'

export class AuthService {
  static async register(email: string, password: string, name: string) {
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) throw new ApiError('Email already registered', 400)

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, role: 'participant' },
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

  private static generateAuthTokens(user: { id: number; email: string; name: string; role: string }) {
    const payload = { id: user.id, email: user.email, role: user.role }

    return {
      token: JwtService.generateToken(payload),
      refresh_token: JwtService.generateRefreshToken(payload),
      user: payload,
    }
  }
}
