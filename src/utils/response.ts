import { Response } from 'express'

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  error?: unknown
  timestamp: string
}

export const sendResponse = <T>(res: Response, statusCode: number, message: string, data?: T) => {
  const response: ApiResponse<T> = {
    success: statusCode < 400,
    message,
    data,
    timestamp: new Date().toISOString(),
  }

  return res.status(statusCode).json(response)
}
