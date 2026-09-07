import { FileService } from '../../src/services/file.service'
import { Request } from 'express'
import fs from 'fs'

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
  mkdirSync: jest.fn(),
}))

describe('FileService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
        get: jest.fn().mockReturnValue('api.tripsharing.id'),
      } as unknown as Request

      const mockFile = {
        filename: 'article-img.jpg',
        originalname: 'article-img.jpg',
        mimetype: 'image/jpeg',
        size: 50000,
      } as Express.Multer.File

      const result = FileService.formatFileResponse(mockReq, mockFile)

      expect(result.url).toBe('https://api.tripsharing.id/uploads/general/article-img.jpg')
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
    it('should unlink file when it exists', () => {
      ;(fs.existsSync as jest.Mock).mockReturnValue(true)

      const success = FileService.deleteFile('/uploads/destinations/bromo.webp')

      expect(fs.existsSync).toHaveBeenCalled()
      expect(fs.unlinkSync).toHaveBeenCalled()
      expect(success).toBe(true)
    })

    it('should return false when file does not exist', () => {
      ;(fs.existsSync as jest.Mock).mockReturnValue(false)

      const success = FileService.deleteFile('/uploads/destinations/not-found.webp')

      expect(fs.unlinkSync).not.toHaveBeenCalled()
      expect(success).toBe(false)
    })
  })
})
