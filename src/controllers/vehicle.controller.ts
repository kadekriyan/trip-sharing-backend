import { Request, Response } from 'express'
import { VehicleService } from '../services/vehicle.service'
import { sendResponse } from '../utils/response'

export class VehicleController {
  static async listVehicles(req: Request, res: Response) {
    const isAvailable =
      req.query.is_available !== undefined
        ? req.query.is_available === 'true'
        : req.query.isAvailable !== undefined
        ? req.query.isAvailable === 'true'
        : undefined

    const vehicles = await VehicleService.list({
      status: (req.query.status as string) || undefined,
      isAvailable,
      vehicleType: (req.query.vehicleType as string) || (req.query.vehicle_type as string) || undefined,
      search: (req.query.search as string) || undefined,
    })

    sendResponse(res, 200, 'Vehicles retrieved successfully', vehicles)
  }

  static async getVehicle(req: Request, res: Response) {
    const vehicle = await VehicleService.get(req.params.id)
    sendResponse(res, 200, 'Vehicle retrieved successfully', vehicle)
  }

  static async createVehicle(req: Request, res: Response) {
    const vehicle = await VehicleService.create(req.body)
    sendResponse(res, 201, 'Armada berhasil ditambahkan', vehicle)
  }

  static async updateVehicle(req: Request, res: Response) {
    const vehicle = await VehicleService.update(req.params.id, req.body)
    sendResponse(res, 200, 'Armada berhasil diperbarui', vehicle)
  }

  static async assignDriver(req: Request, res: Response) {
    const vehicle = await VehicleService.assignDriver(req.params.id, req.body)
    sendResponse(res, 200, 'Driver berhasil dipasangkan ke armada', vehicle)
  }

  static async deleteVehicle(req: Request, res: Response) {
    const result = await VehicleService.delete(req.params.id)
    sendResponse(res, 200, 'Armada berhasil dihapus', result)
  }
}
