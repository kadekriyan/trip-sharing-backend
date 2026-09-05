import Joi from 'joi'

export const groupValidator = {
  create: Joi.object({
    tripId: Joi.string().optional(),
    trip_id: Joi.string().optional(),
    driverId: Joi.string().allow('', null).optional(),
    driver_id: Joi.string().allow('', null).optional(),
    groupNumber: Joi.number().integer().min(1).optional(),
    group_number: Joi.number().integer().min(1).optional(),
    maxParticipants: Joi.number().integer().min(1).max(50).optional(),
    max_participants: Joi.number().integer().min(1).max(50).optional(),
    pricePerPerson: Joi.number().min(0).optional(),
    price_per_person: Joi.number().min(0).optional(),
    status: Joi.string()
      .valid('open', 'waiting', 'full', 'confirmed', 'completed', 'cancelled')
      .optional(),
  }).or('tripId', 'trip_id'),

  update: Joi.object({
    driverId: Joi.string().allow('', null).optional(),
    driver_id: Joi.string().allow('', null).optional(),
    groupNumber: Joi.number().integer().min(1).optional(),
    group_number: Joi.number().integer().min(1).optional(),
    maxParticipants: Joi.number().integer().min(1).max(50).optional(),
    max_participants: Joi.number().integer().min(1).max(50).optional(),
    pricePerPerson: Joi.number().min(0).optional(),
    price_per_person: Joi.number().min(0).optional(),
    status: Joi.string()
      .valid('open', 'waiting', 'full', 'confirmed', 'completed', 'cancelled')
      .optional(),
  }).min(1),

  assignDriver: Joi.object({
    driverId: Joi.string().allow('', null).optional(),
    driver_id: Joi.string().allow('', null).optional(),
  }).or('driverId', 'driver_id'),
}
