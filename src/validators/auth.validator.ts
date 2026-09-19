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

  forgotPassword: Joi.object({
    email: Joi.string().email({ tlds: false }).required(),
    clientBaseUrl: Joi.string().uri().optional(),
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(6).required(),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).optional(),
  }),
}


