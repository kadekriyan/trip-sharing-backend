import Joi from 'joi'

export const tripValidator = {
  create: Joi.object({
    destination_id: Joi.string().optional(),
    destinationId: Joi.string().optional(),
    departure_date: Joi.date().iso().optional(),
    departureDate: Joi.date().iso().optional(),
    return_date: Joi.date().iso().allow(null).optional(),
    returnDate: Joi.date().iso().allow(null).optional(),
    guide_id: Joi.string().allow(null).optional(),
    guideId: Joi.string().allow(null).optional(),
    max_participants: Joi.number().integer().positive().default(6),
    maxParticipants: Joi.number().integer().positive().default(6),
    status: Joi.string()
      .valid('planning', 'published', 'scheduled', 'active', 'departed', 'completed', 'cancelled')
      .default('planning'),
    notes: Joi.string().allow('', null).optional(),
  }).or('destination_id', 'destinationId'),

  update: Joi.object({
    destination_id: Joi.string().optional(),
    destinationId: Joi.string().optional(),
    departure_date: Joi.date().iso().optional(),
    departureDate: Joi.date().iso().optional(),
    return_date: Joi.date().iso().allow(null).optional(),
    returnDate: Joi.date().iso().allow(null).optional(),
    guide_id: Joi.string().allow(null).optional(),
    guideId: Joi.string().allow(null).optional(),
    max_participants: Joi.number().integer().positive().optional(),
    maxParticipants: Joi.number().integer().positive().optional(),
    status: Joi.string()
      .valid('planning', 'published', 'scheduled', 'active', 'departed', 'completed', 'cancelled')
      .optional(),
    notes: Joi.string().allow('', null).optional(),
  }).min(1),
}
