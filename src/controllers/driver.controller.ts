import { Request, Response } from 'express'
import { DriverService } from '../services/driver.service'
import { sendResponse } from '../utils/response'

export class DriverController {
  static async list(req: Request, res: Response) {
    const drivers = await DriverService.list({ is_available: true })
    sendResponse(res, 200, 'Drivers retrieved', drivers)
  }
}
