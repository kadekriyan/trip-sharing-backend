import { Request, Response } from 'express'
import { AreaService } from '../services/area.service'
import { sendResponse } from '../utils/response'

export class AreaController {
  static async list(req: Request, res: Response) {
    const { isActive, is_active, search, city, province } = req.query
    const result = await AreaService.list({
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      is_active: is_active !== undefined ? is_active === 'true' : undefined,
      search: search as string | undefined,
      city: city as string | undefined,
      province: province as string | undefined,
    })
    sendResponse(res, 200, 'Daftar area berhasil diambil', result)
  }

  static async get(req: Request, res: Response) {
    const param = req.params.id || req.params.slug
    const area = await AreaService.get(param)
    sendResponse(res, 200, 'Detail area berhasil diambil', area)
  }

  static async create(req: Request, res: Response) {
    const area = await AreaService.create(req.body)
    sendResponse(res, 201, 'Area berhasil ditambahkan', area)
  }

  static async update(req: Request, res: Response) {
    const param = req.params.id || req.params.slug
    const area = await AreaService.update(param, req.body)
    sendResponse(res, 200, 'Area berhasil diperbarui', area)
  }

  static async delete(req: Request, res: Response) {
    const param = req.params.id || req.params.slug
    const result = await AreaService.delete(param)
    sendResponse(res, 200, 'Area berhasil dihapus', result)
  }
}
