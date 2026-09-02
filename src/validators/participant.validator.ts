import Joi from 'joi'

export const participantValidator = {
  adminCreate: Joi.object({
    tripId: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string()).optional(),
    trip_id: Joi.number().integer().positive().optional(),
    bookingGroupId: Joi.alternatives()
      .try(Joi.number().integer().positive(), Joi.string())
      .optional(),
    group_id: Joi.number().integer().positive().optional(),
    fullName: Joi.string().min(2).max(255).optional(),
    full_name: Joi.string().min(2).max(255).optional(),
    email: Joi.string().email().optional(),
    phoneNumber: Joi.string().optional(),
    phone_number: Joi.string().optional(),
    country: Joi.string().optional(),
    nationality: Joi.string().optional(),
    identityNumber: Joi.string().optional(),
    identity_number: Joi.string().optional(),
    gender: Joi.string().optional(),
    date_of_birth: Joi.date().optional(),
    roomPreference: Joi.string().allow('', null).optional(),
    room_preference: Joi.string().allow('', null).optional(),
    hotel_preference: Joi.string().allow('', null).optional(),
    hasInsurance: Joi.boolean().optional(),
    has_insurance: Joi.boolean().optional(),
    insuranceFee: Joi.number().optional(),
    totalAmount: Joi.number().optional(),
    paymentStatus: Joi.string().valid('pending', 'paid', 'refunded', 'cancelled').optional(),
    payment_status: Joi.string().valid('pending', 'paid', 'refunded', 'cancelled').optional(),
    healthNotes: Joi.string().allow('', null).optional(),
    health_notes: Joi.string().allow('', null).optional(),
  })
    .or('tripId', 'trip_id')
    .or('bookingGroupId', 'group_id')
    .or('fullName', 'full_name')
    .or('phoneNumber', 'phone_number'),

  move: Joi.object({
    new_group_id: Joi.number().integer().positive().optional(),
    targetGroupId: Joi.alternatives()
      .try(Joi.number().integer().positive(), Joi.string())
      .optional(),
    participantId: Joi.alternatives()
      .try(Joi.number().integer().positive(), Joi.string())
      .optional(),
    currentGroupId: Joi.alternatives()
      .try(Joi.number().integer().positive(), Joi.string())
      .optional(),
    reason: Joi.string().allow('', null).optional(),
  }),

  update: Joi.object({
    fullName: Joi.string().min(2).max(255).optional(),
    full_name: Joi.string().min(2).max(255).optional(),
    phoneNumber: Joi.string().optional(),
    phone_number: Joi.string().optional(),
    country: Joi.string().optional(),
    nationality: Joi.string().optional(),
    identityNumber: Joi.string().optional(),
    gender: Joi.string().optional(),
    date_of_birth: Joi.date().optional(),
    roomPreference: Joi.string().allow('', null).optional(),
    hotel_preference: Joi.string().allow('', null).optional(),
    paymentStatus: Joi.string().valid('pending', 'paid', 'refunded', 'cancelled').optional(),
    payment_status: Joi.string().valid('pending', 'paid', 'refunded', 'cancelled').optional(),
    checkedIn: Joi.boolean().optional(),
    checked_in: Joi.boolean().optional(),
  }).min(1),
}
