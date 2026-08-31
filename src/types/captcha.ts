export interface CaptchaVerifyResponse {
  success: boolean
  challenge_ts?: string
  hostname?: string
  score?: number
  'error-codes'?: string[]
}
