import fs from 'fs'
import path from 'path'
import axios from 'axios'
import sharp from 'sharp'
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
  /**
   * Process raw image buffer through sharp:
   * - Validates binary structure (magic bytes)
   * - Strips EXIF metadata & auto-rotates
   * - Compresses to WebP (quality 80)
   */
  static async processImage(buffer: Buffer): Promise<{ buffer: Buffer; mimetype: string; ext: string }> {
    try {
      const image = sharp(buffer)
      const metadata = await image.metadata()

      if (!metadata.format) {
        throw new ApiError('Format berkas tidak valid atau bukan gambar yang didukung.', 400)
      }

      // Auto-orient based on EXIF before stripping, convert to webp (quality 80)
      const processedBuffer = await image
        .rotate()
        .webp({ quality: 80 })
        .toBuffer()

      return {
        buffer: processedBuffer,
        mimetype: 'image/webp',
        ext: '.webp',
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err
      logger.warn(`Sharp processing failed: ${err instanceof Error ? err.message : String(err)}`)
      throw new ApiError('Berkas yang diunggah rusak atau bukan format gambar valid.', 400)
    }
  }

  static async uploadFile(req: Request, file: Express.Multer.File): Promise<UploadedFileResponse> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new ApiError('Berkas gambar kosong atau tidak valid.', 400)
    }

    // Process image through Sharp security pipeline
    const { buffer: processedBuffer, mimetype: finalMime, ext: finalExt } = await this.processImage(file.buffer)

    const rawFolder = (req.query.folder as string) || (req.body?.folder as string) || 'general'
    const safeFolder = rawFolder.replace(/[^a-zA-Z0-9_-]/g, '') || 'general'

    const originalExt = (path.extname(file.originalname || '') || '.jpg').toLowerCase()
    const cleanBaseName = path
      .basename(file.originalname || 'image', originalExt)
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .toLowerCase() || 'image'
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const filename = `${cleanBaseName}-${uniqueSuffix}${finalExt}`
    const storagePath = `${safeFolder}/${filename}`

    const apiKey = supabaseConfig.serviceRoleKey || supabaseConfig.anonKey
    const baseUrl = supabaseConfig.url.replace(/\/+$/, '')
    const bucket = supabaseConfig.bucket

    if (apiKey) {
      try {
        const uploadUrl = `${baseUrl}/storage/v1/object/${bucket}/${storagePath}`
        await axios.post(uploadUrl, processedBuffer, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            apikey: apiKey,
            'Content-Type': finalMime,
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
          mimetype: finalMime,
          size: processedBuffer.length,
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

    // Fallback if Supabase key is not provided (local dev / VPS local disk)
    const forwardedProto = req.headers?.['x-forwarded-proto'] as string | undefined
    const protocol = forwardedProto ? forwardedProto.split(',')[0].trim() : req.protocol || 'http'
    const host = req.get ? req.get('host') || 'localhost:3001' : 'localhost:3001'
    const relativePath = `/uploads/${safeFolder}/${filename}`
    const fullUrl = `${protocol}://${host}${relativePath}`

    try {
      const uploadDir = path.join(process.cwd(), 'uploads', safeFolder)
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }
      fs.writeFileSync(path.join(uploadDir, filename), processedBuffer)
    } catch (fsErr) {
      logger.warn(`Failed to write file to local disk: ${fsErr instanceof Error ? fsErr.message : String(fsErr)}`)
      throw new ApiError('Gagal menyimpan berkas ke media penyimpanan lokal.', 500)
    }

    return {
      url: fullUrl,
      path: relativePath,
      filename,
      originalName: file.originalname,
      mimetype: finalMime,
      size: processedBuffer.length,
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
    const forwardedProto = req.headers?.['x-forwarded-proto'] as string | undefined
    const protocol = forwardedProto ? forwardedProto.split(',')[0].trim() : req.protocol || 'http'
    const host = req.get ? req.get('host') || 'localhost:3001' : 'localhost:3001'
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

