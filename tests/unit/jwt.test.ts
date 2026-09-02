import { JwtService, TokenPayload } from '../../src/utils/jwt'

describe('JwtService', () => {
  const samplePayload: TokenPayload = {
    id: 'usr-1',
    email: 'test@example.com',
    role: 'participant',
  }

  describe('generateToken and verifyToken', () => {
    it('should generate a valid JWT token and verify its payload correctly', () => {
      const token = JwtService.generateToken(samplePayload)
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(10)

      const verified = JwtService.verifyToken(token)
      expect(verified).not.toBeNull()
      expect(verified?.id).toBe(samplePayload.id)
      expect(verified?.email).toBe(samplePayload.email)
      expect(verified?.role).toBe(samplePayload.role)
    })

    it('should generate a valid refresh token and verify its payload', () => {
      const refreshToken = JwtService.generateRefreshToken(samplePayload)
      expect(typeof refreshToken).toBe('string')

      const verified = JwtService.verifyToken(refreshToken)
      expect(verified).not.toBeNull()
      expect(verified?.id).toBe(samplePayload.id)
    })

    it('should return null when verifying an invalid or corrupted token', () => {
      const result = JwtService.verifyToken('invalid.token.signature')
      expect(result).toBeNull()
    })
  })
})
