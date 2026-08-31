import Joi from 'joi'

export const destinationValidator = {
  create: Joi.object({
    name: Joi.string().min(3).max(255).required(),
    description: Joi.string().allow('', null).optional(),
    image_url: Joi.string().uri().allow('', null).optional(),
    price_per_person: Joi.number().positive().required(),
    duration_days: Joi.number().integer().positive().allow(null).optional(),
    itinerary: Joi.alternatives().try(Joi.object(), Joi.array()).optional(),
    is_active: Joi.boolean().optional(),
  }),
  update: Joi.object({
    name: Joi.string().min(3).max(255).optional(),
    description: Joi.string().allow('', null).optional(),
    image_url: Joi.string().uri().allow('', null).optional(),
    price_per_person: Joi.number().positive().optional(),
    duration_days: Joi.number().integer().positive().allow(null).optional(),
    itinerary: Joi.alternatives().try(Joi.object(), Joi.array(), Joi.allow(null)).optional(),
    is_active: Joi.boolean().optional(),
  }).min(1),
}
