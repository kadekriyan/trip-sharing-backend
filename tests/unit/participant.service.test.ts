import { ParticipantService } from '../../src/services/participant.service'
import { prisma } from '../../src/config/database'
import { Prisma } from '@prisma/client'

jest.mock('../../src/config/database', () => ({
  prisma: {
    participant: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      upsert: jest.fn(),
    },
    bookingGroup: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    trip: {
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((cb) => (typeof cb === 'function' ? cb(prisma) : Promise.all(cb))),
  },
}))

jest.mock('../../src/services/email.service', () => ({
  EmailService: {
    sendParticipantCreated: jest.fn().mockResolvedValue(true),
    sendParticipantMoved: jest.fn().mockResolvedValue(true),
  },
}))

describe('ParticipantService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('updateParticipant', () => {
    it('should map camelCase paymentStatus to payment_status and clean participant ID', async () => {
      const mockExisting = {
        id: 'e4d33fec-cb9c-40cb-98ec-b4f2163113cb',
        booking_group_id: 'grp-1',
        total_amount: new Prisma.Decimal('750000'),
        booking_group: { price_per_person: new Prisma.Decimal('750000') },
      }
      const mockUpdated = {
        id: 'e4d33fec-cb9c-40cb-98ec-b4f2163113cb',
        payment_status: 'paid',
        total_amount: new Prisma.Decimal('750000'),
      }
      ;(prisma.participant.findUnique as jest.Mock).mockResolvedValue(mockExisting)
      ;(prisma.participant.update as jest.Mock).mockResolvedValue(mockUpdated)
      ;(prisma.payment.upsert as jest.Mock).mockResolvedValue({})

      const result = await ParticipantService.updateParticipant(
        'part-e4d33fec-cb9c-40cb-98ec-b4f2163113cb',
        { paymentStatus: 'paid' }
      )

      expect(prisma.participant.update).toHaveBeenCalledWith({
        where: { id: 'e4d33fec-cb9c-40cb-98ec-b4f2163113cb' },
        data: expect.objectContaining({
          payment_status: 'paid',
        }),
      })
      // Ensure camelCase paymentStatus is NOT passed to prisma
      const callData = (prisma.participant.update as jest.Mock).mock.calls[0][0].data
      expect(callData.paymentStatus).toBeUndefined()
      expect(result).toEqual(mockUpdated)
    })

    it('should map various camelCase fields to snake_case database columns', async () => {
      const mockExisting = {
        id: '123',
        booking_group_id: 'grp-1',
        booking_group: { price_per_person: new Prisma.Decimal('750000') },
      }
      ;(prisma.participant.findUnique as jest.Mock).mockResolvedValue(mockExisting)
      ;(prisma.participant.update as jest.Mock).mockResolvedValue({ id: 'part-123' })

      await ParticipantService.updateParticipant('part-123', {
        fullName: 'Budi Santoso',
        phoneNumber: '+62812345678',
        country: 'Indonesia',
        nationality: 'WNI',
        gender: 'male',
        checkedIn: true,
        checkInStatus: 'checked_in',
        healthNotes: 'Allergy to peanuts',
        preferredLanguage: 'id',
        pickupLocation: 'Stasiun Kota Baru Malang',
        pickupLatitude: -7.977213,
        pickupLongitude: 112.637123,
        pickupNotes: 'Pintu keluar barat',
        totalAmount: 1500000,
        date_of_birth: '1995-05-20',
      })

      expect(prisma.participant.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: {
          full_name: 'Budi Santoso',
          phone_number: '+62812345678',
          country: 'Indonesia',
          nationality: 'WNI',
          gender: 'male',
          checked_in: true,
          check_in_status: 'checked_in',
          health_notes: 'Allergy to peanuts',
          preferred_language: 'id',
          pickup_location: 'Stasiun Kota Baru Malang',
          pickup_latitude: new Prisma.Decimal('-7.977213'),
          pickup_longitude: new Prisma.Decimal('112.637123'),
          pickup_notes: 'Pintu keluar barat',
          total_amount: new Prisma.Decimal('1500000'),
          date_of_birth: expect.any(Date),
        },
      })
    })

    it('should allow snake_case fields as well', async () => {
      const mockExisting = {
        id: '123',
        booking_group_id: 'grp-1',
        booking_group: { price_per_person: new Prisma.Decimal('750000') },
      }
      ;(prisma.participant.findUnique as jest.Mock).mockResolvedValue(mockExisting)
      ;(prisma.participant.update as jest.Mock).mockResolvedValue({ id: 'part-123' })
      ;(prisma.payment.upsert as jest.Mock).mockResolvedValue({})

      await ParticipantService.updateParticipant('123', {
        payment_status: 'refunded',
        full_name: 'Dewi Ayu',
      })

      expect(prisma.participant.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: {
          payment_status: 'refunded',
          full_name: 'Dewi Ayu',
        },
      })
    })
  })

  describe('deleteParticipant', () => {
    it('should cancel participant and decrement group participant counts', async () => {
      ;(prisma.participant.findUnique as jest.Mock).mockResolvedValue({
        id: 'p-1',
        booking_group: {
          id: 'bg-1',
          trip_id: 'trip-1',
        },
      })

      await ParticipantService.deleteParticipant('part-p-1')

      expect(prisma.participant.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: { payment_status: 'cancelled' },
      })
      expect(prisma.bookingGroup.update).toHaveBeenCalledWith({
        where: { id: 'bg-1' },
        data: { current_participants: { decrement: 1 }, status: 'open' },
      })
      expect(prisma.trip.update).toHaveBeenCalledWith({
        where: { id: 'trip-1' },
        data: { current_participants: { decrement: 1 } },
      })
    })
  })

  describe('createParticipantAsAdmin', () => {
    it('should create participant and generate completed payment record when status is paid', async () => {
      const mockGroup = {
        id: '1',
        trip_id: 'trip-1',
        current_participants: 2,
        max_participants: 6,
        price_per_person: new Prisma.Decimal('750000'),
        trip: { id: 'trip-1' },
      }

      ;(prisma.bookingGroup.findUnique as jest.Mock).mockResolvedValue(mockGroup)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'usr-1', email: 'test@booking.local' })
      ;(prisma.participant.create as jest.Mock).mockResolvedValue({
        id: 'part-new',
        booking_code: 'TRV-9999',
        full_name: 'Manual Traveler',
        payment_status: 'paid',
      })
      ;(prisma.bookingGroup.update as jest.Mock).mockResolvedValue({
        ...mockGroup,
        current_participants: 3,
      })
      ;(prisma.trip.update as jest.Mock).mockResolvedValue({})
      ;(prisma.payment.create as jest.Mock).mockResolvedValue({ id: 'pay-new', status: 'completed' })
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      const result = await ParticipantService.createParticipantAsAdmin({
        bookingGroupId: 'grp-1',
        fullName: 'Manual Traveler',
        phoneNumber: '081234567890',
        paymentStatus: 'paid',
        totalAmount: 750000,
      })

      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            participant_id: 'part-new',
            booking_group_id: '1',
            status: 'completed',
            payment_method: 'manual_cash_or_transfer',
          }),
        })
      )
      expect(result.fullName).toBe('Manual Traveler')
      expect(result.paymentStatus).toBe('paid')
    })

    it('should correctly save pickup_location, pickup_notes, package_type, and date_of_birth', async () => {
      const mockGroup = {
        id: '1',
        trip_id: 'trip-1',
        current_participants: 2,
        max_participants: 6,
        price_per_person: new Prisma.Decimal('750000'),
        trip: { id: 'trip-1' },
      }

      ;(prisma.bookingGroup.findUnique as jest.Mock).mockResolvedValue(mockGroup)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'usr-1', email: 'test@booking.local' })
      ;(prisma.participant.create as jest.Mock).mockResolvedValue({
        id: 'part-new-2',
        booking_code: 'TRV-8888',
        full_name: 'Traveler With Pickup',
        pickup_location: 'Hotel Tentrem Yogyakarta, Jl. P. Mangkubumi',
        pickup_notes: 'Lobi Utama',
        package_type: 'ALL_IN',
        payment_status: 'paid',
      })
      ;(prisma.bookingGroup.update as jest.Mock).mockResolvedValue({
        ...mockGroup,
        current_participants: 3,
      })
      ;(prisma.trip.update as jest.Mock).mockResolvedValue({})
      ;(prisma.payment.create as jest.Mock).mockResolvedValue({ id: 'pay-new-2', status: 'completed' })
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      await ParticipantService.createParticipantAsAdmin({
        bookingGroupId: 'grp-1',
        fullName: 'Traveler With Pickup',
        phoneNumber: '081234567890',
        pickupLocation: 'Hotel Tentrem Yogyakarta, Jl. P. Mangkubumi',
        pickupNotes: 'Lobi Utama',
        packageType: 'ALL_IN',
        dateOfBirth: '1998-04-12',
        paymentStatus: 'paid',
        totalAmount: 750000,
      })

      expect(prisma.participant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            full_name: 'Traveler With Pickup',
            pickup_location: 'Hotel Tentrem Yogyakarta, Jl. P. Mangkubumi',
            pickup_notes: 'Lobi Utama',
            package_type: 'ALL_IN',
            date_of_birth: expect.any(Date),
          }),
        })
      )
    })
  })
})
