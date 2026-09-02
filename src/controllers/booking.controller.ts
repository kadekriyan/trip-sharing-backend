import { Request, Response } from 'express'
import { BookingService } from '../services/booking.service'
import { sendResponse } from '../utils/response'

export class BookingController {
  static async getAvailableGroups(req: Request, res: Response) {
    const { destination_id, destinationId, departure_date, departureDate } = req.query
    const destId = Number(destination_id || destinationId)
    const dateStr = (departure_date || departureDate) as string
    const groups = await BookingService.getAvailableGroups(destId, dateStr)
    sendResponse(res, 200, 'Available groups retrieved', groups)
  }

  static async createBooking(req: Request, res: Response) {
    const result = await BookingService.createBooking(req.user?.id || 0, req.body)
    const p = result.participant
    const g = result.bookingGroup
    const userEmail =
      req.body.email || (req.user as { email?: string })?.email || `${p.phone_number}@booking.local`
    const totalAmount = p.total_amount ? Number(p.total_amount) : Number(g.price_per_person)

    const formattedData = {
      participant: {
        id: `part-${p.id}`,
        numericId: p.id,
        bookingCode: p.booking_code,
        tripId: `trip-${g.trip_id}`,
        bookingGroupId: `grp-${g.id}`,
        groupNumber: g.group_number,
        fullName: p.full_name,
        email: userEmail,
        totalAmount,
        paymentStatus: p.payment_status,
        checkInStatus: p.check_in_status || 'pending',
        createdAt: p.created_at,
      },
      groupOccupancy: result.groupOccupancy,
    }

    sendResponse(
      res,
      201,
      'Pemesanan berhasil dibuat. Silakan lanjutkan ke pembayaran.',
      formattedData
    )
  }

  static async getUserBookings(req: Request, res: Response) {
    const userId = req.user?.id
    const email = req.query.email as string | undefined
    const bookingCode = (req.query.bookingCode || req.query.booking_code) as string | undefined

    const bookings = await BookingService.getUserBookings({ userId, email, bookingCode })
    sendResponse(res, 200, 'User bookings retrieved', bookings)
  }
}
