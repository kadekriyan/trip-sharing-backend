import { NextFunction, Request, Response } from 'express'
import Joi from 'joi'
import { ValidationError } from '../utils/errors'

export const validateRequest = (
  schema: Joi.ObjectSchema,
  source: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[source], {
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

    const target = req as unknown as Record<string, unknown>
    target[source] = value
    next()
  }
}
