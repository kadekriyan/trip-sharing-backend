import Joi from 'joi'

export const authValidator = {
  register: Joi.object({
    email: Joi.string().email({ tlds: false }).required(),
    password: Joi.string().min(8).required(),
    name: Joi.string().min(3).max(255).required(),
    captcha_token: Joi.string().optional(),
  }),
  login: Joi.object({
    email: Joi.string().email({ tlds: false }).required(),
    password: Joi.string().required(),
    captcha_token: Joi.string().optional(),
  }),
}
