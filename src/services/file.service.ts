import fs from 'fs'
import path from 'path'
import { Request } from 'express'
import { ApiError } from '../utils/errors'

export interface UploadedFileResponse {
  url: string
  path: string
  filename: string
  originalName: string
  mimetype: string
  size: number
}

export class FileService {
  static formatFileResponse(req: Request, file: Express.Multer.File): UploadedFileResponse {
    const rawFolder = (req.query.folder as string) || (req.body?.folder as string) || 'general'
    const safeFolder = rawFolder.replace(/[^a-zA-Z0-9_-]/g, '') || 'general'
    const protocol = req.protocol || 'http'
    const host = req.get('host') || 'localhost:3001'
    const relativePath = `/uploads/${safeFolder}/${file.filename}`
    const fullUrl = `${protocol}://${host}${relativePath}`

    return {
      url: fullUrl,
      path: relativePath,
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    }
  }

  static formatMultipleFilesResponse(
    req: Request,
    files: Express.Multer.File[]
  ): UploadedFileResponse[] {
    return files.map((file) => this.formatFileResponse(req, file))
  }

  static deleteFile(relativeOrFullPath: string): boolean {
    try {
      let filePath = relativeOrFullPath
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        const urlObj = new URL(filePath)
        filePath = urlObj.pathname
      }

      const cleanRelativePath = filePath.replace(/^\/+/, '')
      const absolutePath = path.join(process.cwd(), cleanRelativePath)

      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath)
        return true
      }
      return false
    } catch {
      throw new ApiError('Gagal menghapus berkas gambar', 500)
    }
  }
}
