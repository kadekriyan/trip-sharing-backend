import { NextFunction, Request, Response } from 'express'
import { CaptchaService } from '../services/captcha.service'
import { ApiError } from '../utils/errors'

export const verifyCaptcha = async (req: Request, _res: Response, next: NextFunction) => {
  const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
  const captchaToken =
    req.body?.captchaToken ||
    req.body?.captcha_token ||
    req.body?.['g-recaptcha-response'] ||
    req.body?.gRecaptchaResponse ||
    (req.headers['x-captcha-token'] as string | undefined)

  if (!captchaToken && !isDevOrTest) {
    throw new ApiError('Captcha token is required', 400)
  }

  await CaptchaService.verifyCaptcha(captchaToken)

  if (req.body) {
    delete req.body.captchaToken
    delete req.body.captcha_token
    delete req.body['g-recaptcha-response']
    delete req.body.gRecaptchaResponse
  }
  next()
}
