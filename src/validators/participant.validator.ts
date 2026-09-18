import Joi from 'joi'

export const participantValidator = {
  adminCreate: Joi.object({
    tripId: Joi.string().trim().max(100).optional(),
    trip_id: Joi.string().trim().max(100).optional(),
    bookingGroupId: Joi.string().trim().max(100).optional(),
    group_id: Joi.string().trim().max(100).optional(),
    fullName: Joi.string().trim().min(2).max(100).optional(),
    full_name: Joi.string().trim().min(2).max(100).optional(),
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
    country: Joi.string().trim().max(100).allow('', null).optional(),
    nationality: Joi.string().trim().max(100).allow('', null).optional(),
    gender: Joi.string().trim().valid('male', 'female', 'other').allow('', null).optional(),
    date_of_birth: Joi.date().iso().min('1900-01-01').max('now').allow('', null).optional(),
    dateOfBirth: Joi.date().iso().min('1900-01-01').max('now').allow('', null).optional(),
    totalAmount: Joi.number().min(0).optional(),
    packageType: Joi.string().trim().valid('ALL_IN', 'TRANSPORT_ONLY', 'all_in', 'transport_only').optional(),
    package_type: Joi.string().trim().valid('ALL_IN', 'TRANSPORT_ONLY', 'all_in', 'transport_only').optional(),
    paymentStatus: Joi.string().valid('pending', 'paid', 'refunded', 'cancelled').optional(),
    payment_status: Joi.string().valid('pending', 'paid', 'refunded', 'cancelled').optional(),
    healthNotes: Joi.string().trim().max(1000).allow('', null).optional(),
    health_notes: Joi.string().trim().max(1000).allow('', null).optional(),
    pickupLocation: Joi.string().trim().max(255).allow('', null).optional(),
    pickup_location: Joi.string().trim().max(255).allow('', null).optional(),
    pickupLatitude: Joi.number().min(-90).max(90).allow(null).optional(),
    pickup_latitude: Joi.number().min(-90).max(90).allow(null).optional(),
    pickupLongitude: Joi.number().min(-180).max(180).allow(null).optional(),
    pickup_longitude: Joi.number().min(-180).max(180).allow(null).optional(),
    pickupNotes: Joi.string().trim().max(1000).allow('', null).optional(),
    pickup_notes: Joi.string().trim().max(1000).allow('', null).optional(),
  })
    .or('tripId', 'trip_id')
    .or('bookingGroupId', 'group_id')
    .or('fullName', 'full_name')
    .or('phoneNumber', 'phone_number'),

  move: Joi.object({
    new_group_id: Joi.string().trim().max(100).optional(),
    newGroupId: Joi.string().trim().max(100).optional(),
    targetGroupId: Joi.string().trim().max(100).optional(),
    participantId: Joi.string().trim().max(100).optional(),
    currentGroupId: Joi.string().trim().max(100).optional(),
    reason: Joi.string().trim().max(500).allow('', null).optional(),
  }),

  update: Joi.object({
    fullName: Joi.string().trim().min(2).max(100).optional(),
    full_name: Joi.string().trim().min(2).max(100).optional(),
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
    country: Joi.string().trim().max(100).allow('', null).optional(),
    nationality: Joi.string().trim().max(100).allow('', null).optional(),
    gender: Joi.string().trim().valid('male', 'female', 'other').allow('', null).optional(),
    date_of_birth: Joi.date().iso().min('1900-01-01').max('now').allow('', null).optional(),
    dateOfBirth: Joi.date().iso().min('1900-01-01').max('now').allow('', null).optional(),
    healthNotes: Joi.string().trim().max(1000).allow('', null).optional(),
    health_notes: Joi.string().trim().max(1000).allow('', null).optional(),
    preferredLanguage: Joi.string().trim().max(50).allow('', null).optional(),
    preferred_language: Joi.string().trim().max(50).allow('', null).optional(),
    pickupLocation: Joi.string().trim().max(255).allow('', null).optional(),
    pickup_location: Joi.string().trim().max(255).allow('', null).optional(),
    pickupLatitude: Joi.number().min(-90).max(90).allow(null).optional(),
    pickup_latitude: Joi.number().min(-90).max(90).allow(null).optional(),
    pickupLongitude: Joi.number().min(-180).max(180).allow(null).optional(),
    pickup_longitude: Joi.number().min(-180).max(180).allow(null).optional(),
    pickupNotes: Joi.string().trim().max(1000).allow('', null).optional(),
    pickup_notes: Joi.string().trim().max(1000).allow('', null).optional(),
    packageType: Joi.string().trim().valid('ALL_IN', 'TRANSPORT_ONLY', 'all_in', 'transport_only').optional(),
    package_type: Joi.string().trim().valid('ALL_IN', 'TRANSPORT_ONLY', 'all_in', 'transport_only').optional(),
    paymentStatus: Joi.string().valid('pending', 'paid', 'refunded', 'cancelled').optional(),
    payment_status: Joi.string().valid('pending', 'paid', 'refunded', 'cancelled').optional(),
    checkedIn: Joi.boolean().optional(),
    checked_in: Joi.boolean().optional(),
  }).min(1),
}
