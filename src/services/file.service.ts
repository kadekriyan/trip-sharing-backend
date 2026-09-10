import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { Request } from 'express'
import { supabaseConfig } from '../config/supabase'
import { ApiError } from '../utils/errors'
import { logger } from '../utils/logger'

export interface UploadedFileResponse {
  url: string
  path: string
  filename: string
  originalName: string
  mimetype: string
  size: number
}

export class FileService {
  static async uploadFile(req: Request, file: Express.Multer.File): Promise<UploadedFileResponse> {
    const rawFolder = (req.query.folder as string) || (req.body?.folder as string) || 'general'
    const safeFolder = rawFolder.replace(/[^a-zA-Z0-9_-]/g, '') || 'general'

    const ext = (path.extname(file.originalname || '') || '.jpg').toLowerCase()
    const cleanBaseName = path
      .basename(file.originalname || 'image', ext)
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .toLowerCase() || 'image'
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const filename = `${cleanBaseName}-${uniqueSuffix}${ext}`
    const storagePath = `${safeFolder}/${filename}`

    const apiKey = supabaseConfig.serviceRoleKey || supabaseConfig.anonKey
    const baseUrl = supabaseConfig.url.replace(/\/+$/, '')
    const bucket = supabaseConfig.bucket

    if (apiKey) {
      try {
        const uploadUrl = `${baseUrl}/storage/v1/object/${bucket}/${storagePath}`
        await axios.post(uploadUrl, file.buffer, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            apikey: apiKey,
            'Content-Type': file.mimetype || 'application/octet-stream',
            'x-upsert': 'true',
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        })

        const publicUrl = `${baseUrl}/storage/v1/object/public/${bucket}/${storagePath}`

        return {
          url: publicUrl,
          path: `/${bucket}/${storagePath}`,
          filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        }
      } catch (err: unknown) {
        let errorMessage = 'Terjadi kesalahan saat upload'
        if (axios.isAxiosError(err)) {
          const responseData = err.response?.data as { message?: string; error?: string } | undefined
          errorMessage = responseData?.message || responseData?.error || err.message
        } else if (err instanceof Error) {
          errorMessage = err.message
        }
        logger.error(`Supabase Storage upload error for ${storagePath}: ${errorMessage}`)
        throw new ApiError(`Gagal mengunggah berkas ke Supabase Storage: ${errorMessage}`, 500)
      }
    }

    // Fallback if Supabase key is not provided (local dev / mock test)
    const protocol = req.protocol || 'http'
    const host = req.get('host') || 'localhost:3001'
    const relativePath = `/uploads/${safeFolder}/${filename}`
    const fullUrl = `${protocol}://${host}${relativePath}`

    return {
      url: fullUrl,
      path: relativePath,
      filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    }
  }

  static async uploadMultipleFiles(
    req: Request,
    files: Express.Multer.File[]
  ): Promise<UploadedFileResponse[]> {
    return Promise.all(files.map((file) => this.uploadFile(req, file)))
  }

  static formatFileResponse(req: Request, file: Express.Multer.File): UploadedFileResponse {
    const rawFolder = (req.query.folder as string) || (req.body?.folder as string) || 'general'
    const safeFolder = rawFolder.replace(/[^a-zA-Z0-9_-]/g, '') || 'general'
    const protocol = req.protocol || 'http'
    const host = req.get('host') || 'localhost:3001'
    const relativePath = `/uploads/${safeFolder}/${file.filename || file.originalname}`
    const fullUrl = `${protocol}://${host}${relativePath}`

    return {
      url: fullUrl,
      path: relativePath,
      filename: file.filename || file.originalname,
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

  static async deleteFile(relativeOrFullPath: string): Promise<boolean> {
    try {
      const apiKey = supabaseConfig.serviceRoleKey || supabaseConfig.anonKey
      const baseUrl = supabaseConfig.url.replace(/\/+$/, '')
      const bucket = supabaseConfig.bucket

      if (apiKey && relativeOrFullPath.includes(`/storage/v1/object/public/${bucket}/`)) {
        const parts = relativeOrFullPath.split(`/storage/v1/object/public/${bucket}/`)
        if (parts.length === 2) {
          const objectPath = parts[1]
          await axios.delete(`${baseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              apikey: apiKey,
            },
          })
          return true
        }
      }

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
      return false
    }
  }
}

