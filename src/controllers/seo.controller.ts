import { Request, Response } from 'express'
import { SeoService } from '../services/seo.service'
import { sendResponse } from '../utils/response'

export class SeoController {
  static async getPublicSeoSettings(_req: Request, res: Response) {
    const settings = await SeoService.getSettings()
    sendResponse(res, 200, 'SEO settings retrieved successfully', settings)
  }

  static async getAdminSeoSettings(_req: Request, res: Response) {
    const settings = await SeoService.getSettings()
    sendResponse(res, 200, 'Admin SEO settings retrieved successfully', settings)
  }

  static async updateAdminSeoSettings(req: Request, res: Response) {
    const updated = await SeoService.updateSettings(req.body)
    sendResponse(res, 200, 'SEO settings updated successfully', updated)
  }
}
