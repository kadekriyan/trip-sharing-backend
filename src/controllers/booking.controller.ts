import { Request, Response } from 'express'
import { BookingService } from '../services/booking.service'
import { sendResponse } from '../utils/response'

export class BookingController {
  static async getAvailableGroups(req: Request, res: Response) {
    const { destination_id, destinationId, departure_date, departureDate } = req.query
    const destId = (destination_id || destinationId) as string
    const dateStr = (departure_date || departureDate) as string
    const groups = await BookingService.getAvailableGroups(destId, dateStr)
    sendResponse(res, 200, 'Available groups retrieved', groups)
  }

  static async createBooking(req: Request, res: Response) {
    const result = await BookingService.createBooking(req.user?.id, req.body)
    const p = result.participant
    const g = result.bookingGroup
    const userEmail =
      req.body.email || (req.user as { email?: string })?.email || `${p.phone_number}@booking.local`
    const totalAmount = p.total_amount ? Number(p.total_amount) : Number(g.price_per_person)

    const formattedData = {
      participant: {
        id: p.id,
        bookingCode: p.booking_code,
        tripId: g.trip_id,
        bookingGroupId: g.id,
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

  static async createBulkBooking(req: Request, res: Response) {
    const result = await BookingService.createBulkBooking(req.user?.id, req.body)
    sendResponse(
      res,
      201,
      `Pemesanan berhasil dibuat untuk ${result.participants.length} peserta.`,
      result
    )
  }

  static async getUserBookings(req: Request, res: Response) {
    const userId = req.user?.id
    const userEmail = (req.user as { email?: string })?.email
    const queryEmail = req.query.email as string | undefined
    const email = queryEmail || userEmail
    const bookingCode = (req.query.bookingCode || req.query.booking_code) as string | undefined

    const bookings = await BookingService.getUserBookings({ userId, email, bookingCode })
    sendResponse(res, 200, 'User bookings retrieved', bookings)
  }

  static async getInvoice(req: Request, res: Response) {
    const identifier = req.params.identifier || req.params.id || (req.query.bookingCode as string) || (req.query.booking_code as string)
    const userId = req.user?.id
    const email = (req.query.email as string) || (req.user as { email?: string })?.email
    const isAdmin = (req.user as { role?: string })?.role === 'admin'

    const invoice = await BookingService.getInvoice(identifier, { userId, email, isAdmin })
    sendResponse(res, 200, 'Official invoice retrieved successfully', invoice)
  }
}
