import { Request, Response } from 'express'
import { TripService } from '../services/trip.service'
import { sendResponse } from '../utils/response'

function parseNumericId(val: unknown): number {
  if (typeof val === 'number') return val
  if (typeof val === 'string') {
    const cleaned = val.replace(/^\D+/g, '')
    const num = parseInt(cleaned, 10)
    return isNaN(num) ? 0 : num
  }
  return 0
}

export class TripController {
  static async getAvailability(req: Request, res: Response) {
    const tripId = parseNumericId(req.params.id)
    const availability = await TripService.getAvailability(tripId)
    sendResponse(res, 200, 'Trip availability retrieved', availability)
  }

  static async get(req: Request, res: Response) {
    const tripId = parseNumericId(req.params.id)
    const trip = await TripService.get(tripId)
    sendResponse(res, 200, 'Trip retrieved', trip)
  }

  static async list(req: Request, res: Response) {
    const destinationId = req.query.destination_id ? Number(req.query.destination_id) : undefined
    const status = req.query.status as string | undefined
    const trips = await TripService.list({ destination_id: destinationId, status })
    sendResponse(res, 200, 'Trips retrieved', trips)
  }
}
