import { Prisma } from '@prisma/client'
import { BookingService } from '../../src/services/booking.service'
import { PaymentService } from '../../src/services/payment.service'
import { prisma } from '../../src/config/database'
import { bookingValidator } from '../../src/validators/booking.validator'

jest.mock('../../src/config/database', () => ({
  prisma: {
    trip: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    destination: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    bookingGroup: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    participant: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

jest.mock('../../src/config/midtrans', () => ({
  snap: {
    createTransaction: jest.fn().mockResolvedValue({
      token: 'mock-snap-token-12345',
      redirect_url: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/mock-snap-token-12345',
    }),
  },
}))

describe('Bulk / Multi-Booking & Aggregated Payment Gateway', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('bookingValidator.bulkCreate', () => {
    it('should validate a valid bulk booking payload with multiple travelers', () => {
      const payload = {
        captchaToken: 'dev-token',
        bookings: [
          {
            tripId: '3a09e112-9c44-48f1-9011-8a9d12340001',
            fullName: 'Siti Rahmawati',
            phoneNumber: '+6281987654321',
            email: 'siti.rahma@example.com',
            dateOfBirth: '1998-07-20',
            gender: 'female',
            nationality: 'Indonesia',
            healthNotes: 'Alergi makanan laut',
            pickupLocation: 'Hotel Santika Premiere Malang',
          },
          {
            tripId: '3a09e112-9c44-48f1-9011-8a9d12340001',
            fullName: 'Budi Santoso',
            phoneNumber: '+6281234567890',
            email: 'budi.santoso@example.com',
            dateOfBirth: '1995-03-15',
            gender: 'male',
            nationality: 'Indonesia',
            pickupLocation: 'Stasiun Malang Kota Baru',
          },
        ],
      }

      const { error, value } = bookingValidator.bulkCreate.validate(payload)
      expect(error).toBeUndefined()
      expect(value.bookings).toHaveLength(2)
      expect(value.bookings[0].fullName).toBe('Siti Rahmawati')
      expect(value.bookings[1].fullName).toBe('Budi Santoso')
    })

    it('should reject bulk booking if bookings array is empty', () => {
      const payload = {
        bookings: [],
      }

      const { error } = bookingValidator.bulkCreate.validate(payload)
      expect(error).toBeDefined()
      expect(error?.details[0].message).toContain('Pemesanan harus memiliki minimal 1 peserta')
    })

    it('should reject when a participant within the array has invalid phone format', () => {
      const payload = {
        bookings: [
          {
            tripId: '3a09e112-9c44-48f1-9011-8a9d12340001',
            fullName: 'Valid User',
            phoneNumber: '+6281234567890',
          },
          {
            tripId: '3a09e112-9c44-48f1-9011-8a9d12340001',
            fullName: 'Invalid User',
            phoneNumber: 'invalid-phone-char$$$',
          },
        ],
      }

      const { error } = bookingValidator.bulkCreate.validate(payload)
      expect(error).toBeDefined()
      expect(error?.details[0].path).toContain('bookings')
      expect(error?.details[0].path).toContain(1)
      expect(error?.details[0].path).toContain('phoneNumber')
    })
  })

  describe('BookingService.createBulkBooking', () => {
    const mockDestination = {
      id: 'dest-bromo',
      name: 'Bromo Midnight Safari',
      slug: 'bromo-midnight-safari',
      price_per_person: new Prisma.Decimal(850000),
      max_group_capacity: 6,
    }

    const mockTrip = {
      id: 'trip-bromo-01',
      destination_id: 'dest-bromo',
      destination: mockDestination,
      departure_date: new Date('2026-10-15T00:00:00.000Z'),
      return_date: new Date('2026-10-17T00:00:00.000Z'),
      max_participants: 6,
      current_participants: 2,
      booking_groups: [
        {
          id: 'grp-01',
          trip_id: 'trip-bromo-01',
          group_number: 1,
          status: 'open',
          current_participants: 2,
          max_participants: 6,
          price_per_person: new Prisma.Decimal(850000),
        },
      ],
    }

    it('should successfully create bulk booking and return aggregated payment & participants', async () => {
      ;(prisma.trip.findUnique as jest.Mock).mockResolvedValue(mockTrip)

      let participantCount = 0
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          trip: {
            findUnique: jest.fn().mockResolvedValue(mockTrip),
            update: jest.fn().mockResolvedValue({ ...mockTrip, current_participants: 4 }),
          },
          destination: {
            findUnique: jest.fn().mockResolvedValue(mockDestination),
          },
          bookingGroup: {
            findUnique: jest.fn().mockResolvedValue(mockTrip.booking_groups[0]),
            findFirst: jest.fn().mockResolvedValue({ group_number: 1 }),
            create: jest.fn(),
            update: jest.fn().mockImplementation(() => {
              participantCount += 1
              return {
                id: 'grp-01',
                group_number: 1,
                trip_id: 'trip-bromo-01',
                current_participants: 2 + participantCount,
                max_participants: 6,
                status: 'open',
              }
            }),
          },
          user: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation(({ data }) => ({ id: `usr-${data.email}`, ...data })),
          },
          participant: {
            create: jest.fn().mockImplementation(({ data }) => ({
              id: `part-${Math.random().toString(36).substr(2, 6)}`,
              booking_code: data.booking_code,
              full_name: data.full_name,
              total_amount: data.total_amount,
              payment_status: 'pending',
              booking_group_id: data.booking_group_id,
              user_id: data.user_id,
              user: { email: 'user@example.com' },
            })),
          },
          payment: {
            create: jest.fn().mockImplementation(({ data }) => ({
              id: 'pay-bulk-1',
              ...data,
            })),
          },
        }
        return callback(tx)
      })

      const bulkPayload = {
        bookings: [
          {
            tripId: 'trip-bromo-01',
            fullName: 'Siti Rahmawati',
            phoneNumber: '+6281987654321',
            email: 'siti@example.com',
          },
          {
            tripId: 'trip-bromo-01',
            fullName: 'Budi Santoso',
            phoneNumber: '+6281234567890',
            email: 'budi@example.com',
          },
        ],
      }

      const result = await BookingService.createBulkBooking('usr-main', bulkPayload)

      expect(result.bulkBookingId).toBeDefined()
      expect(result.bulkBookingId).toMatch(/^blk-/)
      expect(result.totalAmount).toBe(1700000)
      expect(result.paymentStatus).toBe('pending')
      expect(result.participants).toHaveLength(2)
      expect(result.participants[0].fullName).toBe('Siti Rahmawati')
      expect(result.participants[0].price).toBe(850000)
      expect(result.participants[1].fullName).toBe('Budi Santoso')
      expect(result.participants[1].price).toBe(850000)
      expect(result.payment.snapToken).toBe('mock-snap-token-12345')
      expect(result.payment.orderId).toMatch(/^BULK-TRIP-/)
    })

    it('should auto-segregate conflicting nationalities into separate booking groups during bulk booking', async () => {
      const tripWithPax = {
        ...mockTrip,
        current_participants: 1,
        max_participants: 12,
        booking_groups: [
          {
            id: 'grp-01',
            trip_id: 'trip-bromo-01',
            group_number: 1,
            status: 'open',
            current_participants: 1,
            max_participants: 6,
            price_per_person: new Prisma.Decimal(850000),
            participants: [{ nationality: 'India', country: 'India' }],
          },
        ],
      }
      ;(prisma.trip.findUnique as jest.Mock).mockResolvedValue(tripWithPax)

      const group2 = {
        id: 'grp-02',
        trip_id: 'trip-bromo-01',
        group_number: 2,
        status: 'open',
        current_participants: 0,
        max_participants: 6,
        price_per_person: new Prisma.Decimal(850000),
        participants: [],
      }

      ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          trip: {
            findUnique: jest.fn().mockResolvedValue(tripWithPax),
            update: jest.fn().mockResolvedValue({ ...tripWithPax, current_participants: 3 }),
          },
          destination: {
            findUnique: jest.fn().mockResolvedValue(mockDestination),
          },
          bookingGroup: {
            findUnique: jest.fn().mockImplementation(({ where }) => {
              if (where.id === 'grp-01') return tripWithPax.booking_groups[0]
              return group2
            }),
            findFirst: jest.fn().mockResolvedValue({ group_number: 1 }),
            create: jest.fn().mockResolvedValue(group2),
            update: jest.fn().mockImplementation(({ where }) => {
              if (where.id === 'grp-01') {
                return { ...tripWithPax.booking_groups[0], current_participants: 2 }
              }
              return { ...group2, current_participants: 1 }
            }),
          },
          user: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation(({ data }) => ({ id: `usr-${data.email}`, ...data })),
          },
          participant: {
            create: jest.fn().mockImplementation(({ data }) => ({
              id: `part-${Math.random().toString(36).substr(2, 6)}`,
              booking_code: data.booking_code,
              full_name: data.full_name,
              total_amount: data.total_amount,
              payment_status: 'pending',
              booking_group_id: data.booking_group_id,
              user_id: data.user_id,
              nationality: data.nationality,
              user: { email: 'user@example.com' },
            })),
          },
          payment: {
            create: jest.fn().mockImplementation(({ data }) => ({
              id: 'pay-bulk-1',
              ...data,
            })),
          },
        }
        return callback(tx)
      })

      // Traveler 1 is Indonesian (can join grp-01 with Indian pax), Traveler 2 is Pakistani (conflicts with Indian pax -> allocated to grp-02)
      const bulkPayload = {
        bookings: [
          {
            tripId: 'trip-bromo-01',
            fullName: 'Indonesian Traveler',
            phoneNumber: '+6281987654321',
            nationality: 'Indonesia',
          },
          {
            tripId: 'trip-bromo-01',
            fullName: 'Pakistani Traveler',
            phoneNumber: '+923001234567',
            nationality: 'Pakistan',
          },
        ],
      }

      const result = await BookingService.createBulkBooking('usr-main', bulkPayload)

      expect(result.participants).toHaveLength(2)
      expect(result.participants[0].bookingGroupId).toBe('grp-01') // Indonesian joined Group 1
      expect(result.participants[1].bookingGroupId).toBe('grp-02') // Pakistani allocated to Group 2
    })
  })

  describe('PaymentService Bulk Settlement & Webhook', () => {
    it('should update payment_status to paid for all participants in bulk booking on webhook settlement', async () => {
      const bulkPayment = {
        id: 'pay-bulk-101',
        participant_id: 'part-primary-1',
        booking_group_id: 'grp-01',
        amount: new Prisma.Decimal(1700000),
        midtrans_order_id: 'BULK-TRIP-998877',
        status: 'pending',
        notes: JSON.stringify({
          bulkBookingId: 'blk-test-1',
          participantIds: ['part-primary-1', 'part-secondary-2'],
        }),
        participant: {
          user: { email: 'primary@example.com' },
          full_name: 'Primary Traveler',
        },
      }

      ;(prisma.payment.findUnique as jest.Mock).mockResolvedValue(bulkPayment)
      ;(prisma.payment.update as jest.Mock).mockResolvedValue({
        ...bulkPayment,
        status: 'completed',
      })
      ;(prisma.participant.updateMany as jest.Mock).mockResolvedValue({ count: 2 })

      const webhookNotification = {
        order_id: 'BULK-TRIP-998877',
        transaction_status: 'settlement',
        transaction_id: 'midtrans-tx-bulk-1',
      }

      const result = await PaymentService.handleWebhook(webhookNotification)

      expect(result.status).toBe('ok')
      expect(prisma.participant.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['part-primary-1', 'part-secondary-2'] } },
        data: { payment_status: 'paid' },
      })
    })

    it('should settle all participants when simulatePayment is called for bulk order or bulkBookingId', async () => {
      const bulkPayment = {
        id: 'pay-bulk-101',
        participant_id: 'part-primary-1',
        booking_group_id: 'grp-01',
        amount: new Prisma.Decimal(1700000),
        midtrans_order_id: 'BULK-TRIP-998877',
        status: 'pending',
        notes: JSON.stringify({
          bulkBookingId: 'blk-test-1',
          participantIds: ['part-primary-1', 'part-secondary-2'],
        }),
        participant: {
          user: { email: 'primary@example.com' },
          full_name: 'Primary Traveler',
        },
      }

      ;(prisma.payment.findFirst as jest.Mock).mockResolvedValue(bulkPayment)
      ;(prisma.payment.update as jest.Mock).mockResolvedValue({
        ...bulkPayment,
        status: 'completed',
      })
      ;(prisma.participant.updateMany as jest.Mock).mockResolvedValue({ count: 2 })

      const result = await PaymentService.simulatePayment('blk-test-1', 'settle')

      expect(result.status).toBe('ok')
      expect(prisma.participant.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['part-primary-1', 'part-secondary-2'] } },
        data: { payment_status: 'paid' },
      })
    })
  })
})
