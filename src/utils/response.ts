import { Response } from 'express'

export interface PaginationMeta {
  page?: number
  limit?: number
  total?: number
  totalPages?: number
  [key: string]: unknown
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  meta?: PaginationMeta
  errors?: Record<string, string[]>
  errorCode?: string
  timestamp: string
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase())
}

export function toCamelCase<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj
  if (obj instanceof Date) return obj
  if (typeof obj === 'object' && 'isDecimal' in (obj as Record<string, unknown>) && typeof (obj as { toNumber?: () => number }).toNumber === 'function') {
    return (obj as { toNumber: () => number }).toNumber() as unknown as T
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => toCamelCase(item)) as unknown as T
  }
  if (typeof obj === 'object' && obj.constructor === Object) {
    const newObj: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      newObj[snakeToCamel(key)] = toCamelCase(value)
    }
    return newObj as T
  }
  return obj
}

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T,
  meta?: PaginationMeta
) => {
  const response: ApiResponse<T> = {
    success: statusCode < 400,
    message,
    ...(data !== undefined ? { data: toCamelCase(data) } : {}),
    ...(meta ? { meta: toCamelCase(meta) } : {}),
    timestamp: new Date().toISOString(),
  }

  return res.status(statusCode).json(response)
}
