import Joi from 'joi'

export const paymentValidator = {
  simulate: Joi.object({
    action: Joi.string()
      .valid(
        'settle',
        'settlement',
        'capture',
        'success',
        'expire',
        'expired',
        'cancel',
        'cancelled',
        'deny',
        'denied',
        'failure',
        'pending'
      )
      .default('settle')
      .optional(),
  }),
}
