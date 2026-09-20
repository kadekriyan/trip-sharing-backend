import dotenv from 'dotenv'
import Joi from 'joi'

dotenv.config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env.local' })
dotenv.config()

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string().required(),
  DIRECT_URL: Joi.string().allow('').optional(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
  RECAPTCHA_SECRET_KEY: Joi.string().allow('').optional(),
  RECAPTCHA_VERIFY_URL: Joi.string().uri().default('https://www.google.com/recaptcha/api/siteverify'),
  CAPTCHA_SECRET_KEY: Joi.string().allow('').optional(),
  CAPTCHA_VERIFY_URL: Joi.string().uri().optional(),
  HCAPTCHA_SECRET_KEY: Joi.string().allow('').optional(),
  HCAPTCHA_VERIFY_URL: Joi.string().uri().optional(),
  MIDTRANS_SERVER_KEY: Joi.string().allow('').optional(),
  MIDTRANS_CLIENT_KEY: Joi.string().allow('').optional(),
  MIDTRANS_ENVIRONMENT: Joi.string().valid('sandbox', 'production').default('sandbox'),
  TELEGRAM_BOT_TOKEN: Joi.string().allow('').optional(),
  TELEGRAM_CHAT_ID: Joi.string().allow('').optional(),
  TELEGRAM_THREAD_ID: Joi.string().allow('').optional(),
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
  SUPABASE_PROJECT_REF: Joi.string().default('elaekvkqftsxrrynyhoy'),
  SUPABASE_URL: Joi.string().uri().optional(),
  SUPABASE_ANON_KEY: Joi.string().allow('').optional(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().allow('').optional(),
  SUPABASE_STORAGE_BUCKET: Joi.string().default('uploads'),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
}).unknown(true)

const { error, value } = envSchema.validate(process.env, { abortEarly: false })

if (error) {
  throw new Error(`Environment validation failed: ${error.message}`)
}

export const env = value as NodeJS.ProcessEnv
