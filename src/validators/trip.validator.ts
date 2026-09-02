import Joi from 'joi'

export const tripValidator = {
  create: Joi.object({
    destination_id: Joi.number().integer().positive().required(),
    departure_date: Joi.date().iso().required(),
    return_date: Joi.date().iso().greater(Joi.ref('departure_date')).allow(null).optional(),
    guide_id: Joi.number().integer().positive().allow(null).optional(),
    max_participants: Joi.number().integer().positive().default(6),
    status: Joi.string()
      .valid('planning', 'published', 'departed', 'completed', 'cancelled')
      .default('planning'),
    notes: Joi.string().allow('', null).optional(),
  }),
  update: Joi.object({
    destination_id: Joi.number().integer().positive().optional(),
    departure_date: Joi.date().iso().optional(),
    return_date: Joi.date().iso().allow(null).optional(),
    guide_id: Joi.number().integer().positive().allow(null).optional(),
    max_participants: Joi.number().integer().positive().optional(),
    status: Joi.string()
      .valid('planning', 'published', 'departed', 'completed', 'cancelled')
      .optional(),
    notes: Joi.string().allow('', null).optional(),
  }).min(1),
}
