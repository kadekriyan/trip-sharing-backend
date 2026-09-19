import bcrypt from 'bcrypt'
import { AuthService } from '../../src/services/auth.service'
import { prisma } from '../../src/config/database'
import { ApiError } from '../../src/utils/errors'

jest.mock('../../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    passwordResetToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((promises) => Promise.all(promises)),
  },
}))

jest.mock('../../src/services/email.service', () => ({
  EmailService: {
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  },
}))

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('register', () => {
    it('should throw ApiError (400) if email is already registered', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'usr-1',
        email: 'exists@example.com',
      })

      await expect(
        AuthService.register('exists@example.com', 'password123', 'John Doe')
      ).rejects.toThrow(ApiError)
      await expect(
        AuthService.register('exists@example.com', 'password123', 'John Doe')
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Email already registered',
      })
    })

    it('should hash password and create participant user successfully', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.create as jest.Mock).mockImplementation(async ({ data }) => ({
        id: 'usr-10',
        email: data.email,
        name: data.name,
        role: data.role,
      }))

      const result = await AuthService.register('newuser@example.com', 'secret123', 'Alice')

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'newuser@example.com' },
      })
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'newuser@example.com',
          password: expect.any(String),
          name: 'Alice',
          role: 'participant',
        },
      })
      expect(result).toHaveProperty('token')
      expect(result).toHaveProperty('refresh_token')
      expect(result.user).toEqual({
        id: 'usr-10',
        email: 'newuser@example.com',
        role: 'participant',
      })
    })
  })

  describe('login', () => {
    it('should throw ApiError (401) if user not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(AuthService.login('notfound@example.com', 'password123')).rejects.toThrow(
        ApiError
      )
      await expect(AuthService.login('notfound@example.com', 'password123')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid credentials',
      })
    })

    it('should throw ApiError (401) if user is inactive', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'usr-2',
        email: 'inactive@example.com',
        is_active: false,
        password: await bcrypt.hash('password123', 10),
      })

      await expect(AuthService.login('inactive@example.com', 'password123')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid credentials',
      })
    })

    it('should throw ApiError (401) if password does not match', async () => {
      const hashedPassword = await bcrypt.hash('correctPassword', 10)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'usr-3',
        email: 'user@example.com',
        password: hashedPassword,
        is_active: true,
        name: 'Bob',
        role: 'participant',
      })

      await expect(AuthService.login('user@example.com', 'wrongPassword')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid credentials',
      })
    })

    it('should return auth tokens when credentials are valid', async () => {
      const hashedPassword = await bcrypt.hash('correctPassword', 10)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'usr-3',
        email: 'user@example.com',
        password: hashedPassword,
        is_active: true,
        name: 'Bob',
        role: 'participant',
      })

      const result = await AuthService.login('user@example.com', 'correctPassword')
      expect(result).toHaveProperty('token')
      expect(result).toHaveProperty('refresh_token')
      expect(result.user).toEqual({
        id: 'usr-3',
        email: 'user@example.com',
        role: 'participant',
      })
    })
  })

  describe('forgotPassword', () => {
    it('should return success message even if user does not exist to prevent enumeration', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await AuthService.forgotPassword('nonexistent@example.com')
      expect(result.message).toContain('Jika email terdaftar')
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled()
    })

    it('should create a token and send password reset email when user exists', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'usr-100',
        email: 'traveler@example.com',
        name: 'Traveler Jogja',
        is_active: true,
      })
      ;(prisma.passwordResetToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 })
      ;(prisma.passwordResetToken.create as jest.Mock).mockResolvedValue({ id: 'tok-1' })

      const { EmailService } = require('../../src/services/email.service')

      const result = await AuthService.forgotPassword('traveler@example.com', 'http://localhost:3000')

      expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: { user_id: 'usr-100', is_used: false },
        data: { is_used: true },
      })
      expect(prisma.passwordResetToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          user_id: 'usr-100',
          token: expect.any(String),
          expires_at: expect.any(Date),
        }),
      })
      expect(EmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'traveler@example.com',
        expect.stringContaining('/reset-password?token='),
        'Traveler Jogja'
      )
      expect(result.message).toContain('Jika email terdaftar')
    })
  })

  describe('verifyResetToken', () => {
    it('should throw ApiError if token is missing or invalid', async () => {
      ;(prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(AuthService.verifyResetToken('invalid-token')).rejects.toThrow(ApiError)
    })

    it('should throw ApiError if token has already been used', async () => {
      ;(prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'tok-1',
        token: 'used-token',
        is_used: true,
        expires_at: new Date(Date.now() + 100000),
        user: { id: 'usr-1', email: 'test@example.com', is_active: true },
      })

      await expect(AuthService.verifyResetToken('used-token')).rejects.toThrow(ApiError)
    })

    it('should throw ApiError if token is expired', async () => {
      ;(prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'tok-1',
        token: 'expired-token',
        is_used: false,
        expires_at: new Date(Date.now() - 10000),
        user: { id: 'usr-1', email: 'test@example.com', is_active: true },
      })

      await expect(AuthService.verifyResetToken('expired-token')).rejects.toThrow(ApiError)
    })

    it('should return valid info when token is active and valid', async () => {
      ;(prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'tok-1',
        token: 'valid-token',
        is_used: false,
        expires_at: new Date(Date.now() + 100000),
        user: { id: 'usr-1', email: 'valid@example.com', name: 'Valid User', is_active: true },
      })

      const result = await AuthService.verifyResetToken('valid-token')
      expect(result.valid).toBe(true)
      expect(result.email).toBe('valid@example.com')
    })
  })

  describe('resetPassword', () => {
    it('should throw error if new password is too short', async () => {
      await expect(AuthService.resetPassword('tok-1', '123')).rejects.toThrow(ApiError)
    })

    it('should update password and invalidate token on success', async () => {
      ;(prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'tok-1',
        user_id: 'usr-1',
        token: 'valid-token',
        is_used: false,
        expires_at: new Date(Date.now() + 100000),
        user: { id: 'usr-1', email: 'valid@example.com', is_active: true },
      })
      ;(prisma.user.update as jest.Mock).mockResolvedValue({ id: 'usr-1' })
      ;(prisma.passwordResetToken.update as jest.Mock).mockResolvedValue({ id: 'tok-1', is_used: true })

      const result = await AuthService.resetPassword('valid-token', 'newStrongPass123')
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'usr-1' },
        data: { password: expect.any(String) },
      })
      expect(prisma.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: 'tok-1' },
        data: { is_used: true },
      })
      expect(result.message).toContain('berhasil diperbarui')
    })
  })

  describe('authValidator schema', () => {
    it('should successfully validate .local emails for login and register', () => {
      const { authValidator } = require('../../src/validators/auth.validator')

      const loginResult = authValidator.login.validate({
        email: 'admin@tripsharing.local',
        password: 'password123',
      })
      expect(loginResult.error).toBeUndefined()
      expect(loginResult.value.email).toBe('admin@tripsharing.local')

      const registerResult = authValidator.register.validate({
        email: 'user@booking.local',
        password: 'password123',
        name: 'Local User',
      })
      expect(registerResult.error).toBeUndefined()
      expect(registerResult.value.email).toBe('user@booking.local')

      const forgotResult = authValidator.forgotPassword.validate({
        email: 'traveler@example.com',
      })
      expect(forgotResult.error).toBeUndefined()

      const resetResult = authValidator.resetPassword.validate({
        token: 'some-hex-token-123',
        password: 'newPassword123',
      })
      expect(resetResult.error).toBeUndefined()
    })
  })
})

