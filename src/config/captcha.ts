export const captchaConfig = {
  secretKey:
    process.env.RECAPTCHA_SECRET_KEY ||
    process.env.CAPTCHA_SECRET_KEY ||
    process.env.HCAPTCHA_SECRET_KEY ||
    '',
  verifyUrl:
    process.env.RECAPTCHA_VERIFY_URL ||
    process.env.CAPTCHA_VERIFY_URL ||
    process.env.HCAPTCHA_VERIFY_URL ||
    'https://www.google.com/recaptcha/api/siteverify',
}

