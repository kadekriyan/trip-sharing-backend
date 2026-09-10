import multer, { FileFilterCallback } from 'multer'
import { Request } from 'express'
import { ApiError } from '../utils/errors'

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const storage = multer.memoryStorage()

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(
      new ApiError(
        `Tipe berkas tidak didukung (${file.mimetype}). Hanya format JPG, PNG, WEBP, dan GIF yang diperbolehkan.`,
        400
      )
    )
  }
}

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
})
