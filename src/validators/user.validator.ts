import Joi from 'joi'

export const userValidator = {
  updateProfile: Joi.object({
    name: Joi.string().min(3).max(255).optional(),
    phone: Joi.string().allow('', null).optional(),
    profile_image_url: Joi.string().uri().allow('', null).optional(),
  }).min(1),
}
