import Joi from 'joi'

export const bookingValidator = {
  create: Joi.object({
    tripId: Joi.string().trim().max(100).optional(),
    trip_id: Joi.string().trim().max(100).optional(),
    destinationId: Joi.string().trim().max(100).optional(),
    destination_id: Joi.string().trim().max(100).optional(),
    fullName: Joi.string().trim().min(2).max(100).optional(),
    full_name: Joi.string().trim().min(2).max(100).optional(),
    name: Joi.string().trim().min(2).max(100).optional(),
    email: Joi.string().trim().email({ tlds: { allow: false } }).max(255).allow('', null).optional(),
    phoneNumber: Joi.string()
      .trim()
      .min(7)
      .max(20)
      .pattern(/^[+0-9\s\-()]+$/)
      .messages({ 'string.pattern.base': 'Phone number format is invalid' })
      .optional(),
    phone_number: Joi.string()
      .trim()
      .min(7)
      .max(20)
      .pattern(/^[+0-9\s\-()]+$/)
      .messages({ 'string.pattern.base': 'Phone number format is invalid' })
      .optional(),
    phone: Joi.string()
      .trim()
      .min(7)
      .max(20)
      .pattern(/^[+0-9\s\-()]+$/)
      .messages({ 'string.pattern.base': 'Phone number format is invalid' })
      .optional(),
    country: Joi.string().trim().max(100).allow('', null).optional(),
    nationality: Joi.string().trim().max(100).allow('', null).optional(),
    gender: Joi.string().trim().valid('male', 'female', 'other').allow('', null).optional(),
    date_of_birth: Joi.date().iso().min('1900-01-01').max('now').allow('', null).optional(),
    dateOfBirth: Joi.date().iso().min('1900-01-01').max('now').allow('', null).optional(),
    healthNotes: Joi.string().trim().max(1000).allow('', null).optional(),
    health_notes: Joi.string().trim().max(1000).allow('', null).optional(),
    preferred_language: Joi.string().trim().max(50).allow('', null).optional(),
    preferredLanguage: Joi.string().trim().max(50).allow('', null).optional(),
    pickupLocation: Joi.string().trim().max(255).allow('', null).optional(),
    pickup_location: Joi.string().trim().max(255).allow('', null).optional(),
    pickupLatitude: Joi.number().min(-90).max(90).allow(null).optional(),
    pickup_latitude: Joi.number().min(-90).max(90).allow(null).optional(),
    pickupLongitude: Joi.number().min(-180).max(180).allow(null).optional(),
    pickup_longitude: Joi.number().min(-180).max(180).allow(null).optional(),
    pickupNotes: Joi.string().trim().max(1000).allow('', null).optional(),
    pickup_notes: Joi.string().trim().max(1000).allow('', null).optional(),
    departure_date: Joi.date().iso().optional(),
    departureDate: Joi.date().iso().optional(),
    return_date: Joi.date().iso().optional(),
    returnDate: Joi.date().iso().optional(),
    price_per_pax: Joi.number().min(0).optional(),
    pricePerPax: Joi.number().min(0).optional(),
    duration_days: Joi.number().integer().min(1).max(365).optional(),
    durationDays: Joi.number().integer().min(1).max(365).optional(),
    captchaToken: Joi.string().trim().max(2048).allow('', null).optional(),
    captcha_token: Joi.string().trim().max(2048).allow('', null).optional(),
    'g-recaptcha-response': Joi.string().trim().max(2048).allow('', null).optional(),
    gRecaptchaResponse: Joi.string().trim().max(2048).allow('', null).optional(),
  })
    .or('tripId', 'trip_id', 'destinationId', 'destination_id')
    .or('fullName', 'full_name', 'name')
    .or('phoneNumber', 'phone_number', 'phone'),
}
