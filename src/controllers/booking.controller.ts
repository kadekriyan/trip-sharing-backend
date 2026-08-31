import { Request, Response } from 'express'
import { BookingService } from '../services/booking.service'
import { sendResponse } from '../utils/response'

export class BookingController {
  static async getAvailableGroups(req: Request, res: Response) {
    const { destination_id, departure_date } = req.query
    const groups = await BookingService.getAvailableGroups(
      Number(destination_id),
      departure_date as string
    )
    sendResponse(res, 200, 'Available groups retrieved', groups)
  }

  static async createBooking(req: Request, res: Response) {
    const result = await BookingService.createBooking(req.user?.id || 0, req.body)
    sendResponse(res, 201, 'Booking created successfully', result)
  }

  static async getUserBookings(req: Request, res: Response) {
    const bookings = await BookingService.getUserBookings(req.user?.id || 0)
    sendResponse(res, 200, 'User bookings retrieved', bookings)
  }
}
