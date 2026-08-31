import { NextFunction, Request, Response } from 'express'
import { ApiError } from '../utils/errors'
import { logger } from '../utils/logger'

export const errorHandler = (error: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Request error', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  })

  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      details: error.details,
      timestamp: new Date().toISOString(),
    })
  }

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    timestamp: new Date().toISOString(),
  })
}
