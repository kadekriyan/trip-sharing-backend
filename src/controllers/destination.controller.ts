import { Request, Response } from 'express'
import { DestinationService } from '../services/destination.service'
import { sendResponse } from '../utils/response'

export class DestinationController {
  static async list(req: Request, res: Response) {
    const { search, location, duration, sortBy, page, limit } = req.query
    const result = await DestinationService.list({
      search: search as string | undefined,
      location: location as string | undefined,
      duration: duration ? Number(duration) : undefined,
      sortBy: sortBy as 'popular' | 'price_asc' | 'price_desc' | 'rating' | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    })
    sendResponse(res, 200, 'Destinations retrieved', result.data, result.meta)
  }

  static async get(req: Request, res: Response) {
    const param = req.params.idOrSlug || req.params.id || req.params.slug
    const destination = await DestinationService.getBySlug(param)
    return sendResponse(res, 200, 'Destination retrieved', destination)
  }

  static async getBySlug(req: Request, res: Response) {
    const destination = await DestinationService.getBySlug(req.params.slug)
    sendResponse(res, 200, 'Destination retrieved', destination)
  }
}
