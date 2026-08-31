import Joi from 'joi'

export const participantValidator = {
  adminCreate: Joi.object({
    trip_id: Joi.number().integer().positive().required(),
    group_id: Joi.number().integer().positive().required(),
    full_name: Joi.string().min(3).max(255).required(),
    phone_number: Joi.string().required(),
    country: Joi.string().length(2).required(),
    date_of_birth: Joi.date().required(),
    hotel_preference: Joi.string().allow('', null).optional(),
    payment_status: Joi.string().valid('pending', 'paid').default('pending'),
  }),
  move: Joi.object({
    new_group_id: Joi.number().integer().positive().required(),
  }),
  update: Joi.object({
    full_name: Joi.string().min(3).max(255).optional(),
    phone_number: Joi.string().optional(),
    country: Joi.string().length(2).optional(),
    date_of_birth: Joi.date().optional(),
    hotel_preference: Joi.string().allow('', null).optional(),
    payment_status: Joi.string().valid('pending', 'paid', 'refunded', 'cancelled').optional(),
    checked_in: Joi.boolean().optional(),
  }).min(1),
}
