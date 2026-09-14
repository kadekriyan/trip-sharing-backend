import { Request, Response } from 'express'
import { GroupService } from '../services/group.service'
import { sendResponse } from '../utils/response'

export class GroupController {
  static async listGroups(req: Request, res: Response) {
    const tripId = (req.query.tripId || req.query.trip_id) as string | undefined
    const driverId = (req.query.driverId || req.query.driver_id) as string | undefined
    const status = req.query.status as string | undefined
    const search = req.query.search as string | undefined

    const groups = await GroupService.list({ tripId, driverId, status, search })
    sendResponse(res, 200, 'Booking groups retrieved successfully', groups)
  }

  static async getGroup(req: Request, res: Response) {
    const group = await GroupService.get(req.params.id)
    sendResponse(res, 200, 'Booking group retrieved successfully', group)
  }

  static async createGroup(req: Request, res: Response) {
    const group = await GroupService.create(req.body, req.user?.id)
    sendResponse(res, 201, 'Booking group created successfully', group)
  }

  static async updateGroup(req: Request, res: Response) {
    const group = await GroupService.update(req.params.id, req.body, req.user?.id)
    sendResponse(res, 200, 'Booking group updated successfully', group)
  }

  static async assignDriver(req: Request, res: Response) {
    const group = await GroupService.assignDriver(req.params.id, req.body, req.user?.id)
    const message = group.driverId
      ? `Driver ${group.driver?.fullName || ''} successfully assigned to Group #${group.groupNumber}`
      : `Driver successfully unassigned from Group #${group.groupNumber}`
    sendResponse(res, 200, message, group)
  }

  static async assignVehicle(req: Request, res: Response) {
    const group = await GroupService.assignVehicle(req.params.id, req.body, req.user?.id)
    const message = group.vehicleId
      ? `Armada ${group.vehicle?.name || ''} (${group.vehicle?.plateNumber || ''}) berhasil dipasangkan ke Grup #${group.groupNumber}`
      : `Armada berhasil dilepas dari Grup #${group.groupNumber}`
    sendResponse(res, 200, message, group)
  }

  static async deleteGroup(req: Request, res: Response) {
    const result = await GroupService.delete(req.params.id, req.user?.id)
    sendResponse(res, 200, 'Booking group deleted successfully', result)
  }
}
