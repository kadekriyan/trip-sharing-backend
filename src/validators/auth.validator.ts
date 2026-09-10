import Joi from 'joi'

export const authValidator = {
  register: Joi.object({
    email: Joi.string().email({ tlds: false }).required(),
    password: Joi.string().min(8).required(),
    name: Joi.string().min(2).max(255).optional(),
    fullName: Joi.string().min(2).max(255).optional(),
    phone: Joi.string().optional(),
    phoneNumber: Joi.string().optional(),
    nationality: Joi.string().optional(),
    captchaToken: Joi.string().optional(),
    captcha_token: Joi.string().optional(),
    'g-recaptcha-response': Joi.string().optional(),
    gRecaptchaResponse: Joi.string().optional(),
  }).or('name', 'fullName'),

  login: Joi.object({
    email: Joi.string().email({ tlds: false }).required(),
    password: Joi.string().required(),
    captchaToken: Joi.string().optional(),
    captcha_token: Joi.string().optional(),
    'g-recaptcha-response': Joi.string().optional(),
    gRecaptchaResponse: Joi.string().optional(),
  }),
}
