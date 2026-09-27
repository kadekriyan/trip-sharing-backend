import { BookingService } from '../../src/services/booking.service'
import { prisma } from '../../src/config/database'
import { ApiError } from '../../src/utils/errors'

jest.mock('../../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    participant: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    bookingGroup: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    trip: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    destination: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(prisma)),
  },
}))

describe('Phase 11: Traveler Booking History & Invoice Linkage by Email', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('BookingService.getUserBookings', () => {
    const mockTrip = {
      id: 'trip-1',
      departure_date: new Date('2026-10-01'),
      return_date: new Date('2026-10-02'),
      destination: {
        name: 'Bromo Sunrise Tour',
        slug: 'bromo-sunrise-tour',
        cover_image: '/images/bromo.jpg',
        meeting_point: 'Malang Station',
      },
      guide: null,
    }

    const mockGroup = {
      id: 'grp-1',
      group_number: 1,
      max_participants: 6,
      current_participants: 2,
      price_per_person: 350000,
      trip: mockTrip,
      driver: null,
      vehicle: null,
    }

    it('should aggregate bookings by userId and user email when traveler is logged in', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'usr-traveler-1',
        email: 'traveler@example.com',
      })

      const mockParticipants = [
        {
          id: 'part-1',
          booking_code: 'TRV-1111',
          user_id: 'usr-traveler-1',
          full_name: 'John Traveler',
          phone_number: '0812345678',
          nationality: 'Indonesia',
          total_amount: 350000,
          payment_status: 'paid',
          check_in_status: 'checked_in',
          created_at: new Date('2026-09-20'),
          user: { id: 'usr-traveler-1', name: 'John Traveler', email: 'traveler@example.com', phone: '0812345678' },
          booking_group: mockGroup,
          payment: { completion_time: new Date('2026-09-20T10:00:00Z') },
        },
        {
          id: 'part-guest',
          booking_code: 'TRV-2222',
          user_id: 'usr-guest-old',
          full_name: 'John Guest',
          phone_number: '0812345678',
          nationality: 'Indonesia',
          total_amount: 350000,
          payment_status: 'paid',
          check_in_status: 'pending',
          created_at: new Date('2026-08-15'),
          user: { id: 'usr-guest-old', name: 'John Guest', email: 'traveler@example.com', phone: '0812345678' },
          booking_group: mockGroup,
          payment: null,
        },
      ]

      ;(prisma.participant.findMany as jest.Mock).mockResolvedValue(mockParticipants)

      const result = await BookingService.getUserBookings({
        userId: 'usr-traveler-1',
        email: 'traveler@example.com',
      })

      expect(prisma.participant.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { user_id: 'traveler-1' },
            { user: { email: { equals: 'traveler@example.com', mode: 'insensitive' } } },
          ],
        },
        include: expect.any(Object),
        orderBy: { created_at: 'desc' },
      })

      expect(result).toHaveLength(2)
      expect(result[0].bookingCode).toBe('TRV-1111')
      expect(result[1].bookingCode).toBe('TRV-2222')
    })

    it('should automatically fetch email from user record if email is not explicitly passed with userId', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '123',
        email: 'auto@example.com',
      })

      ;(prisma.participant.findMany as jest.Mock).mockResolvedValue([])

      await BookingService.getUserBookings({ userId: 'usr-123' })

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '123' },
        select: { email: true },
      })

      expect(prisma.participant.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { user_id: '123' },
            { user: { email: { equals: 'auto@example.com', mode: 'insensitive' } } },
          ],
        },
        include: expect.any(Object),
        orderBy: { created_at: 'desc' },
      })
    })

    it('should filter by bookingCode when searching specific ticket', async () => {
      ;(prisma.participant.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'part-specific',
          booking_code: 'TRV-9999',
          user_id: 'usr-guest',
          full_name: 'Guest One',
          phone_number: '081111',
          created_at: new Date(),
          booking_group: mockGroup,
          user: null,
          payment: null,
        },
      ])

      const result = await BookingService.getUserBookings({ bookingCode: 'TRV-9999' })

      expect(prisma.participant.findMany).toHaveBeenCalledWith({
        where: {
          booking_code: { equals: 'TRV-9999', mode: 'insensitive' },
        },
        include: expect.any(Object),
        orderBy: { created_at: 'desc' },
      })

      expect(result).toHaveLength(1)
      expect(result[0].bookingCode).toBe('TRV-9999')
    })
  })

  describe('BookingService.getInvoice', () => {
    const mockParticipant = {
      id: 'part-inv-1',
      booking_code: 'TRV-8888',
      user_id: 'usr-owner-1',
      full_name: 'Invoice Owner',
      phone_number: '08123456789',
      total_amount: 350000,
      payment_status: 'paid',
      created_at: new Date('2026-09-20T08:00:00Z'),
      updated_at: new Date('2026-09-20T08:30:00Z'),
      user: {
        id: 'usr-owner-1',
        name: 'Invoice Owner',
        email: 'owner@example.com',
        phone: '08123456789',
      },
      booking_group: {
        id: 'grp-inv-1',
        group_number: 1,
        price_per_person: 350000,
        trip: {
          id: 'trip-1',
          departure_date: new Date('2026-10-01'),
          return_date: new Date('2026-10-02'),
          destination: {
            name: 'Prambanan Sunset & Ramayana Ballet',
            location: 'Yogyakarta',
            meeting_point: 'Yogyakarta Station',
          },
          guide: null,
        },
        driver: null,
        vehicle: null,
      },
      payment: {
        id: 'pay-1',
        payment_method: 'midtrans_qris',
        midtrans_order_id: 'ORDER-123',
        status: 'settlement',
        completion_time: new Date('2026-09-20T08:30:00Z'),
      },
    }

    it('should return invoice when requested by authorized owner with matching email', async () => {
      ;(prisma.participant.findFirst as jest.Mock).mockResolvedValue(mockParticipant)

      const invoice = await BookingService.getInvoice('TRV-8888', {
        userId: 'usr-other-id',
        email: 'owner@example.com',
      })

      expect(invoice.invoice.bookingCode).toBe('TRV-8888')
      expect(invoice.invoice.status).toBe('PAID')
      expect(invoice.invoice.paymentStatus).toBe('paid')
      expect(invoice.customer.email).toBe('owner@example.com')
    })

    it('should throw ApiError (403) when requested by unauthorized user with mismatching code and email', async () => {
      ;(prisma.participant.findFirst as jest.Mock).mockResolvedValue(mockParticipant)

      await expect(
        BookingService.getInvoice('part-inv-1', {
          userId: 'usr-stranger',
          email: 'stranger@example.com',
          isAdmin: false,
        })
      ).rejects.toThrow(ApiError)
    })
  })
})
