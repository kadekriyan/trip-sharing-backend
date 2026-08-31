import axios from 'axios'
import { captchaConfig } from '../config/captcha'
import { CaptchaVerifyResponse } from '../types/captcha'
import { ApiError } from '../utils/errors'
import { logger } from '../utils/logger'

export class CaptchaService {
  static async verifyCaptcha(token?: string): Promise<boolean> {
    const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'

    // In development or test environments, always bypass captcha verification
    if (isDevOrTest) {
      logger.warn('Captcha verification bypassed in development/test mode', { token })
      return true
    }

    if (!token) throw new ApiError('Captcha token is required', 400)
    if (!captchaConfig.secretKey) throw new ApiError('Captcha is not configured', 500)

    try {
      const response = await axios.post<CaptchaVerifyResponse>(captchaConfig.verifyUrl, null, {
        params: { response: token, secret: captchaConfig.secretKey },
      })

      if (!response.data.success) {
        logger.warn('Captcha verification failed', response.data['error-codes'])
        throw new ApiError('Captcha verification failed', 400)
      }

      if (response.data.score !== undefined && response.data.score < 0.5) {
        throw new ApiError('Captcha score too low', 400)
      }

      return true
    } catch (error) {
      if (error instanceof ApiError) throw error
      logger.error('Captcha verification error', error)
      throw new ApiError('Captcha verification error', 500)
    }
  }
}
