import Joi from 'joi'

export const groupValidator = {
  create: Joi.object({
    tripId: Joi.string().trim().max(100).optional(),
    trip_id: Joi.string().trim().max(100).optional(),
    driverId: Joi.string().trim().max(100).allow('', null).optional(),
    driver_id: Joi.string().trim().max(100).allow('', null).optional(),
    vehicleId: Joi.string().trim().max(100).allow('', null).optional(),
    vehicle_id: Joi.string().trim().max(100).allow('', null).optional(),
    groupNumber: Joi.number().integer().min(1).optional(),
    group_number: Joi.number().integer().min(1).optional(),
    maxParticipants: Joi.number().integer().min(1).max(50).optional(),
    max_participants: Joi.number().integer().min(1).max(50).optional(),
    pricePerPerson: Joi.number().min(0).optional(),
    price_per_person: Joi.number().min(0).optional(),
    status: Joi.string()
      .trim()
      .valid('open', 'waiting', 'full', 'confirmed', 'completed', 'cancelled')
      .optional(),
  }).or('tripId', 'trip_id'),

  update: Joi.object({
    driverId: Joi.string().trim().max(100).allow('', null).optional(),
    driver_id: Joi.string().trim().max(100).allow('', null).optional(),
    vehicleId: Joi.string().trim().max(100).allow('', null).optional(),
    vehicle_id: Joi.string().trim().max(100).allow('', null).optional(),
    groupNumber: Joi.number().integer().min(1).optional(),
    group_number: Joi.number().integer().min(1).optional(),
    maxParticipants: Joi.number().integer().min(1).max(50).optional(),
    max_participants: Joi.number().integer().min(1).max(50).optional(),
    pricePerPerson: Joi.number().min(0).optional(),
    price_per_person: Joi.number().min(0).optional(),
    status: Joi.string()
      .trim()
      .valid('open', 'waiting', 'full', 'confirmed', 'completed', 'cancelled')
      .optional(),
  }).min(1),

  assignDriver: Joi.object({
    driverId: Joi.string().trim().max(100).allow('', null).optional(),
    driver_id: Joi.string().trim().max(100).allow('', null).optional(),
  }).or('driverId', 'driver_id'),

  assignVehicle: Joi.object({
    vehicleId: Joi.string().trim().max(100).allow('', null).optional(),
    vehicle_id: Joi.string().trim().max(100).allow('', null).optional(),
  }).or('vehicleId', 'vehicle_id'),
}
