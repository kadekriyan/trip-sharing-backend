import { Request, Response } from 'express'
import { DestinationService } from '../services/destination.service'
import { sendResponse } from '../utils/response'

export class DestinationController {
  static async list(req: Request, res: Response) {
    const destinations = await DestinationService.list()
    sendResponse(res, 200, 'Destinations retrieved', destinations)
  }

  static async get(req: Request, res: Response) {
    const destination = await DestinationService.get(Number(req.params.id))
    sendResponse(res, 200, 'Destination retrieved', destination)
  }
}
