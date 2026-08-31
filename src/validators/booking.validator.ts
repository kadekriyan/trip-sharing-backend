import Joi from 'joi'

export const bookingValidator = {
  create: Joi.object({
    trip_id: Joi.number().integer().positive().required(),
    full_name: Joi.string().min(3).max(255).required(),
    phone_number: Joi.string()
      .pattern(/^[0-9+\-\s()]+$/)
      .required(),
    country: Joi.string().length(2).required(),
    date_of_birth: Joi.date().iso().required(),
    hotel_preference: Joi.string().allow('', null).optional(),
    passport_number: Joi.string().allow('', null).optional(),
    identity_type: Joi.string().allow('', null).optional(),
    room_type: Joi.string().allow('', null).optional(),
    health_notes: Joi.string().allow('', null).optional(),
    preferred_language: Joi.string().allow('', null).optional(),
    travel_insurance: Joi.boolean().optional(),
    captcha_token: Joi.string().optional(),
  }),
}
