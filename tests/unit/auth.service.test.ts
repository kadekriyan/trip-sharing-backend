import bcrypt from 'bcrypt'
import { AuthService } from '../../src/services/auth.service'
import { prisma } from '../../src/config/database'
import { ApiError } from '../../src/utils/errors'

jest.mock('../../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('register', () => {
    it('should throw ApiError (400) if email is already registered', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        email: 'exists@example.com',
      })

      await expect(AuthService.register('exists@example.com', 'password123', 'John Doe')).rejects.toThrow(
        ApiError
      )
      await expect(AuthService.register('exists@example.com', 'password123', 'John Doe')).rejects.toMatchObject({
        statusCode: 400,
        message: 'Email already registered',
      })
    })

    it('should hash password and create participant user successfully', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.create as jest.Mock).mockImplementation(async ({ data }) => ({
        id: 10,
        email: data.email,
        name: data.name,
        role: data.role,
      }))

      const result = await AuthService.register('newuser@example.com', 'secret123', 'Alice')

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'newuser@example.com' } })
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
        id: 10,
        email: 'newuser@example.com',
        role: 'participant',
      })
    })
  })

  describe('login', () => {
    it('should throw ApiError (401) if user not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(AuthService.login('notfound@example.com', 'password123')).rejects.toThrow(ApiError)
      await expect(AuthService.login('notfound@example.com', 'password123')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid credentials',
      })
    })

    it('should throw ApiError (401) if user is inactive', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 2,
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
        id: 3,
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
        id: 3,
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
        id: 3,
        email: 'user@example.com',
        role: 'participant',
      })
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
    })
  })
})

