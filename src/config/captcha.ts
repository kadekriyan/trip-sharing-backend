export const captchaConfig = {
  secretKey: process.env.HCAPTCHA_SECRET_KEY || '',
  verifyUrl: process.env.HCAPTCHA_VERIFY_URL || 'https://hcaptcha.com/siteverify',
}
