import fs from 'fs'
import path from 'path'
import multer, { FileFilterCallback } from 'multer'
import { Request } from 'express'
import { ApiError } from '../utils/errors'

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const storage = multer.diskStorage({
  destination: (req: Request, _file: Express.Multer.File, cb) => {
    const rawFolder = (req.query.folder as string) || (req.body?.folder as string) || 'general'
    const safeFolder = rawFolder.replace(/[^a-zA-Z0-9_-]/g, '') || 'general'
    const uploadPath = path.join(process.cwd(), 'uploads', safeFolder)

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true })
    }

    cb(null, uploadPath)
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
    const cleanName = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30)
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`
    cb(null, `${cleanName || 'img'}-${uniqueSuffix}${ext}`)
  },
})

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
