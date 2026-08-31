import { Request, Response } from 'express'
import { prisma } from '../config/database'
import { sendResponse } from '../utils/response'

export class DriverController {
  static async list(req: Request, res: Response) {
    const drivers = await prisma.driver.findMany({ where: { is_available: true }, include: { user: true } })
    sendResponse(res, 200, 'Drivers retrieved', drivers)
  }
}
