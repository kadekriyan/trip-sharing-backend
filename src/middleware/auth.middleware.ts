import { NextFunction, Request, Response } from 'express'
import { JwtService } from '../utils/jwt'
import { ApiError } from '../utils/errors'

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    throw new ApiError('Missing or invalid authorization header', 401)
  }

  const token = authHeader.substring(7)
  const payload = JwtService.verifyToken(token)

  if (!payload) {
    throw new ApiError('Invalid or expired token', 401)
  }

  req.user = payload
  next()
}

export const authorize = (allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      throw new ApiError('Access denied', 403)
    }

    next()
  }
}
