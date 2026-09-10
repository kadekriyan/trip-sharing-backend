import axios from 'axios'
import { CaptchaService } from '../../src/services/captcha.service'
import { captchaConfig } from '../../src/config/captcha'
import { ApiError } from '../../src/utils/errors'

jest.mock('axios')

describe('CaptchaService', () => {
  const originalEnv = process.env.NODE_ENV
  const originalSecretKey = captchaConfig.secretKey

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    captchaConfig.secretKey = originalSecretKey
    jest.clearAllMocks()
  })

  describe('in development/test environment', () => {
    it('should bypass verification when secret key is not set', async () => {
      process.env.NODE_ENV = 'development'
      captchaConfig.secretKey = ''

      const result = await CaptchaService.verifyCaptcha('any-token')
      expect(result).toBe(true)
      expect(axios.post).not.toHaveBeenCalled()
    })

    it('should bypass verification for dummy test tokens', async () => {
      process.env.NODE_ENV = 'test'
      captchaConfig.secretKey = 'some-key'

      const result = await CaptchaService.verifyCaptcha('test-token')
      expect(result).toBe(true)
      expect(axios.post).not.toHaveBeenCalled()
    })
  })

  describe('in production environment', () => {
    it('should throw ApiError (400) if token is missing', async () => {
      process.env.NODE_ENV = 'production'
      captchaConfig.secretKey = 'prod-key'

      await expect(CaptchaService.verifyCaptcha('')).rejects.toMatchObject({
        statusCode: 400,
        message: 'Captcha token is required',
      })
    })

    it('should throw ApiError (500) if secret key is missing', async () => {
      process.env.NODE_ENV = 'production'
      captchaConfig.secretKey = ''

      await expect(CaptchaService.verifyCaptcha('valid-token')).rejects.toMatchObject({
        statusCode: 500,
        message: 'Captcha is not configured',
      })
    })

    it('should verify token with reCAPTCHA API and return true on success', async () => {
      process.env.NODE_ENV = 'production'
      captchaConfig.secretKey = 'prod-recaptcha-key'
      ;(axios.post as jest.Mock).mockResolvedValue({
        data: { success: true, score: 0.9, action: 'booking_submit' },
      })

      const result = await CaptchaService.verifyCaptcha('valid-prod-token')
      expect(result).toBe(true)
      expect(axios.post).toHaveBeenCalledWith(
        captchaConfig.verifyUrl,
        null,
        expect.objectContaining({
          params: { response: 'valid-prod-token', secret: 'prod-recaptcha-key' },
        })
      )
    })

    it('should throw ApiError (400) if reCAPTCHA score is too low (< 0.5)', async () => {
      process.env.NODE_ENV = 'production'
      captchaConfig.secretKey = 'prod-recaptcha-key'
      ;(axios.post as jest.Mock).mockResolvedValue({
        data: { success: true, score: 0.2, action: 'booking_submit' },
      })

      await expect(CaptchaService.verifyCaptcha('low-score-token')).rejects.toMatchObject({
        statusCode: 400,
        message: 'Captcha score too low',
      })
    })

    it('should throw ApiError (400) if reCAPTCHA API returns success=false', async () => {
      process.env.NODE_ENV = 'production'
      captchaConfig.secretKey = 'prod-recaptcha-key'
      ;(axios.post as jest.Mock).mockResolvedValue({
        data: { success: false, 'error-codes': ['invalid-input-response'] },
      })

      await expect(CaptchaService.verifyCaptcha('invalid-token')).rejects.toMatchObject({
        statusCode: 400,
        message: 'Captcha verification failed',
      })
    })
  })
})

