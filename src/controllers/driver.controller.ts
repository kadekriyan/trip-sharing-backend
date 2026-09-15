import { Request, Response } from 'express'
import { DriverService } from '../services/driver.service'
import { sendResponse } from '../utils/response'

export class DriverController {
  static async list(req: Request, res: Response) {
    const isAvailable =
      req.query.is_available !== undefined
        ? req.query.is_available === 'true'
        : req.query.isAvailable !== undefined
        ? req.query.isAvailable === 'true'
        : true

    const drivers = await DriverService.list({
      is_available: isAvailable,
      status: req.query.status as string | undefined,
      areaId: (req.query.areaId as string) || (req.query.area_id as string) || undefined,
      area: (req.query.area as string) || undefined,
      search: req.query.search as string | undefined,
    })
    sendResponse(res, 200, 'Drivers retrieved', drivers)
  }
}
