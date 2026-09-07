import { Request, Response } from 'express'
import { FileService } from '../services/file.service'
import { ApiError } from '../utils/errors'
import { sendResponse } from '../utils/response'

export class UploadController {
  static async uploadSingle(req: Request, res: Response) {
    const file = req.file
    if (!file) {
      throw new ApiError('Berkas gambar tidak ditemukan. Pastikan field form bernama "image" atau "file".', 400)
    }

    const result = FileService.formatFileResponse(req, file)
    sendResponse(res, 200, 'Berkas gambar berhasil diunggah', result)
  }

  static async uploadMultiple(req: Request, res: Response) {
    const files = req.files as Express.Multer.File[] | undefined
    if (!files || files.length === 0) {
      throw new ApiError('Berkas gambar tidak ditemukan. Pastikan field form bernama "images" atau "files".', 400)
    }

    const result = FileService.formatMultipleFilesResponse(req, files)
    sendResponse(res, 200, `${result.length} berkas gambar berhasil diunggah`, result)
  }
}
