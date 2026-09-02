import { Request, Response } from 'express'
import { TripService } from '../services/trip.service'
import { sendResponse } from '../utils/response'

export class TripController {
  static async getAvailability(req: Request, res: Response) {
    const tripId = req.params.id
    const availability = await TripService.getAvailability(tripId)
    sendResponse(res, 200, 'Trip availability retrieved', availability)
  }

  static async get(req: Request, res: Response) {
    const tripId = req.params.id
    const trip = await TripService.get(tripId)
    sendResponse(res, 200, 'Trip retrieved', trip)
  }

  static async list(req: Request, res: Response) {
    const destinationId = (req.query.destination_id || req.query.destinationId) as
      string | undefined
    const status = req.query.status as string | undefined
    const trips = await TripService.list({ destination_id: destinationId, status })
    sendResponse(res, 200, 'Trips retrieved', trips)
  }
}
