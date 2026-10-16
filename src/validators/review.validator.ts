import Joi from 'joi'
import { ValidationError } from '../utils/errors'

export function validateReviewSchema<T = unknown>(schema: Joi.ObjectSchema, data: unknown): T {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  })

  if (error) {
    const details = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }))
    throw new ValidationError('Validation failed', details)
  }

  return value as T
}

export const reviewValidator = {
  submitReview: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required().messages({
      'number.base': 'Rating must be a number',
      'number.min': 'Rating must be at least 1 star',
      'number.max': 'Rating cannot exceed 5 stars',
      'any.required': 'Rating is required',
    }),
    comment: Joi.string().trim().min(3).max(3000).required().messages({
      'string.empty': 'Review comment cannot be empty',
      'string.min': 'Review comment must be at least 3 characters',
      'string.max': 'Review comment cannot exceed 3000 characters',
      'any.required': 'Review comment is required',
    }),
  }),

  moderateReview: Joi.object({
    status: Joi.string().valid('APPROVED', 'REJECTED').required().messages({
      'any.only': 'Status must be either APPROVED or REJECTED',
      'any.required': 'Status is required',
    }),
    rejection_reason: Joi.string().trim().max(500).allow('', null).optional(),
    rejectionReason: Joi.string().trim().max(500).allow('', null).optional(),
  }),

  adminReply: Joi.object({
    admin_reply: Joi.string().trim().min(2).max(3000).optional(),
    adminReply: Joi.string().trim().min(2).max(3000).optional(),
  }).or('admin_reply', 'adminReply').messages({
    'object.missing': 'Admin reply content is required',
  }),

  sendInvites: Joi.object({
    trip_id: Joi.string().optional(),
    tripId: Joi.string().optional(),
  }).or('trip_id', 'tripId').messages({
    'object.missing': 'Trip ID is required',
  }),
}
