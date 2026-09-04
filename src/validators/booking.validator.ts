import Joi from 'joi'

export const bookingValidator = {
  create: Joi.object({
    tripId: Joi.string().optional(),
    trip_id: Joi.string().optional(),
    destinationId: Joi.string().optional(),
    destination_id: Joi.string().optional(),
    fullName: Joi.string().min(2).max(255).optional(),
    full_name: Joi.string().min(2).max(255).optional(),
    name: Joi.string().min(2).max(255).optional(),
    email: Joi.string().email().optional(),
    phoneNumber: Joi.string().optional(),
    phone_number: Joi.string().optional(),
    phone: Joi.string().optional(),
    country: Joi.string().optional(),
    nationality: Joi.string().optional(),
    identityNumber: Joi.string().allow('', null).optional(),
    identity_number: Joi.string().allow('', null).optional(),
    gender: Joi.string().valid('male', 'female', 'other').allow('', null).optional(),
    date_of_birth: Joi.date().iso().optional(),
    dateOfBirth: Joi.date().iso().optional(),
    roomPreference: Joi.string().allow('', null).optional(),
    room_preference: Joi.string().allow('', null).optional(),
    hotel_preference: Joi.string().allow('', null).optional(),
    passport_number: Joi.string().allow('', null).optional(),
    passportNumber: Joi.string().allow('', null).optional(),
    identity_type: Joi.string().allow('', null).optional(),
    identityType: Joi.string().allow('', null).optional(),
    room_type: Joi.string().allow('', null).optional(),
    roomType: Joi.string().allow('', null).optional(),
    healthNotes: Joi.string().allow('', null).optional(),
    health_notes: Joi.string().allow('', null).optional(),
    preferred_language: Joi.string().allow('', null).optional(),
    preferredLanguage: Joi.string().allow('', null).optional(),
    hasInsurance: Joi.boolean().optional(),
    travel_insurance: Joi.boolean().optional(),
    captchaToken: Joi.string().optional(),
    captcha_token: Joi.string().optional(),
  })
    .or('tripId', 'trip_id', 'destinationId', 'destination_id')
    .or('fullName', 'full_name', 'name')
    .or('phoneNumber', 'phone_number', 'phone'),
}
