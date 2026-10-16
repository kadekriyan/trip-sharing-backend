import { FileService } from '../../src/services/file.service'
import { supabaseConfig } from '../../src/config/supabase'
import { Request } from 'express'
import fs from 'fs'
import axios from 'axios'

const mockSharpInstance = {
  metadata: jest.fn().mockResolvedValue({ format: 'jpeg', width: 800, height: 600 }),
  rotate: jest.fn().mockReturnThis(),
  webp: jest.fn().mockReturnThis(),
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed-webp-bytes')),
}

jest.mock('sharp', () => {
  return jest.fn().mockImplementation(() => mockSharpInstance)
})

jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs')
  return {
    ...actualFs,
    existsSync: jest.fn(),
    unlinkSync: jest.fn(),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
  }
})

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('FileService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    supabaseConfig.anonKey = ''
    supabaseConfig.serviceRoleKey = ''
    mockSharpInstance.metadata.mockResolvedValue({ format: 'jpeg', width: 800, height: 600 })
    mockSharpInstance.toBuffer.mockResolvedValue(Buffer.from('processed-webp-bytes'))
  })

  describe('uploadFile', () => {
    it('should upload to Supabase Storage when Supabase API key is configured and convert to webp', async () => {
      supabaseConfig.anonKey = 'test-supabase-anon-key'
      supabaseConfig.url = 'https://test-project.supabase.co'
      supabaseConfig.bucket = 'uploads'

      mockedAxios.post.mockResolvedValueOnce({
        data: { Key: 'uploads/destinations/bali-trip-123.webp' },
      })

      const mockReq = {
        query: { folder: 'destinations' },
        protocol: 'https',
        get: jest.fn().mockReturnValue('api.javasharedtour.co.id'),
      } as unknown as Request

      const mockFile = {
        originalname: 'bali-trip.jpg',
        mimetype: 'image/jpeg',
        size: 204800,
        buffer: Buffer.from('fake-image-bytes'),
      } as Express.Multer.File

      const result = await FileService.uploadFile(mockReq, mockFile)

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringMatching(/https:\/\/test-project\.supabase\.co\/storage\/v1\/object\/uploads\/destinations\/bali-trip-/),
        expect.any(Buffer),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-supabase-anon-key',
            apikey: 'test-supabase-anon-key',
            'Content-Type': 'image/webp',
            'x-upsert': 'true',
          }),
        })
      )

      expect(result.url).toMatch(/^https:\/\/test-project\.supabase\.co\/storage\/v1\/object\/public\/uploads\/destinations\/bali-trip-.*\.webp$/)
      expect(result.originalName).toBe('bali-trip.jpg')
      expect(result.mimetype).toBe('image/webp')
      expect(result.size).toBe(Buffer.from('processed-webp-bytes').length)
    })

    it('should fallback to local URL format when Supabase key is not configured and save as webp', async () => {
      supabaseConfig.anonKey = ''
      supabaseConfig.serviceRoleKey = ''

      const mockReq = {
        query: { folder: 'general' },
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3001'),
      } as unknown as Request

      const mockFile = {
        originalname: 'avatar.png',
        mimetype: 'image/png',
        size: 1024,
        buffer: Buffer.from('fake-png-bytes'),
      } as Express.Multer.File

      const result = await FileService.uploadFile(mockReq, mockFile)

      expect(mockedAxios.post).not.toHaveBeenCalled()
      expect(result.url).toMatch(/^http:\/\/localhost:3001\/uploads\/general\/avatar-.*\.webp$/)
      expect(result.path).toMatch(/^\/uploads\/general\/avatar-.*\.webp$/)
      expect(result.originalName).toBe('avatar.png')
      expect(result.mimetype).toBe('image/webp')
    })

    it('should reject invalid or non-image files with 400 ApiError', async () => {
      mockSharpInstance.metadata.mockResolvedValueOnce({ format: undefined })

      const mockReq = {
        query: { folder: 'general' },
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3001'),
      } as unknown as Request

      const mockFile = {
        originalname: 'malicious.php',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('<?php echo "evil"; ?>'),
      } as Express.Multer.File

      await expect(FileService.uploadFile(mockReq, mockFile)).rejects.toThrow(
        'Format berkas tidak valid atau bukan gambar yang didukung.'
      )
    })
  })

  describe('uploadMultipleFiles', () => {
    it('should upload multiple files', async () => {
      const mockReq = {
        query: { folder: 'articles' },
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3001'),
      } as unknown as Request

      const mockFiles = [
        {
          originalname: 'photo1.jpg',
          mimetype: 'image/jpeg',
          size: 1000,
          buffer: Buffer.from('img1'),
        },
        {
          originalname: 'photo2.jpg',
          mimetype: 'image/jpeg',
          size: 2000,
          buffer: Buffer.from('img2'),
        },
      ] as Express.Multer.File[]

      const results = await FileService.uploadMultipleFiles(mockReq, mockFiles)

      expect(results).toHaveLength(2)
      expect(results[0].originalName).toBe('photo1.jpg')
      expect(results[1].originalName).toBe('photo2.jpg')
    })
  })

  describe('formatFileResponse', () => {
    it('should format single file upload response with full URL and relative path', () => {
      const mockReq = {
        query: { folder: 'destinations' },
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3001'),
      } as unknown as Request

      const mockFile = {
        filename: 'bromo-1700000000.webp',
        originalname: 'bromo.webp',
        mimetype: 'image/webp',
        size: 154200,
      } as Express.Multer.File

      const result = FileService.formatFileResponse(mockReq, mockFile)

      expect(result).toEqual({
        url: 'http://localhost:3001/uploads/destinations/bromo-1700000000.webp',
        path: '/uploads/destinations/bromo-1700000000.webp',
        filename: 'bromo-1700000000.webp',
        originalName: 'bromo.webp',
        mimetype: 'image/webp',
        size: 154200,
      })
    })

    it('should use default general folder when not provided', () => {
      const mockReq = {
        query: {},
        body: {},
        protocol: 'https',
        get: jest.fn().mockReturnValue('api.javasharedtour.co.id'),
      } as unknown as Request

      const mockFile = {
        filename: 'article-img.jpg',
        originalname: 'article-img.jpg',
        mimetype: 'image/jpeg',
        size: 50000,
      } as Express.Multer.File

      const result = FileService.formatFileResponse(mockReq, mockFile)

      expect(result.url).toBe('https://api.javasharedtour.co.id/uploads/general/article-img.jpg')
      expect(result.path).toBe('/uploads/general/article-img.jpg')
    })
  })

  describe('formatMultipleFilesResponse', () => {
    it('should format array of uploaded files', () => {
      const mockReq = {
        query: { folder: 'articles' },
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3001'),
      } as unknown as Request

      const mockFiles = [
        {
          filename: 'img1.png',
          originalname: 'img1.png',
          mimetype: 'image/png',
          size: 1000,
        },
        {
          filename: 'img2.png',
          originalname: 'img2.png',
          mimetype: 'image/png',
          size: 2000,
        },
      ] as Express.Multer.File[]

      const result = FileService.formatMultipleFilesResponse(mockReq, mockFiles)

      expect(result).toHaveLength(2)
      expect(result[0].path).toBe('/uploads/articles/img1.png')
      expect(result[1].path).toBe('/uploads/articles/img2.png')
    })
  })

  describe('deleteFile', () => {
    it('should unlink file when it exists locally', async () => {
      ;(fs.existsSync as jest.Mock).mockReturnValue(true)

      const success = await FileService.deleteFile('/uploads/destinations/bromo.webp')

      expect(fs.existsSync).toHaveBeenCalled()
      expect(fs.unlinkSync).toHaveBeenCalled()
      expect(success).toBe(true)
    })

    it('should return false when file does not exist locally', async () => {
      ;(fs.existsSync as jest.Mock).mockReturnValue(false)

      const success = await FileService.deleteFile('/uploads/destinations/not-found.webp')

      expect(fs.unlinkSync).not.toHaveBeenCalled()
      expect(success).toBe(false)
    })

    it('should delete from Supabase storage when public Supabase URL is given and key is set', async () => {
      supabaseConfig.anonKey = 'test-key'
      supabaseConfig.url = 'https://test-project.supabase.co'
      supabaseConfig.bucket = 'uploads'

      mockedAxios.delete.mockResolvedValueOnce({ data: {} })

      const success = await FileService.deleteFile(
        'https://test-project.supabase.co/storage/v1/object/public/uploads/destinations/bromo-123.jpg'
      )

      expect(mockedAxios.delete).toHaveBeenCalledWith(
        'https://test-project.supabase.co/storage/v1/object/uploads/destinations/bromo-123.jpg',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key',
            apikey: 'test-key',
          }),
        })
      )
      expect(success).toBe(true)
    })
  })
})

