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
      const mockUpdated = {
        id: 'e4d33fec-cb9c-40cb-98ec-b4f2163113cb',
        payment_status: 'paid',
      }
      ;(prisma.participant.update as jest.Mock).mockResolvedValue(mockUpdated)

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
      ;(prisma.participant.update as jest.Mock).mockResolvedValue({ id: 'part-123' })

      await ParticipantService.updateParticipant('part-123', {
        fullName: 'Budi Santoso',
        phoneNumber: '+62812345678',
        identityNumber: '3201234567890001',
        identityType: 'KTP',
        country: 'Indonesia',
        nationality: 'WNI',
        gender: 'male',
        roomPreference: 'King Bed',
        hotelPreference: 'Hotel A',
        checkedIn: true,
        checkInStatus: 'checked_in',
        healthNotes: 'Allergy to peanuts',
        passportNumber: 'A12345678',
        roomType: 'Deluxe',
        preferredLanguage: 'id',
        travelInsurance: true,
        hasInsurance: true,
        insuranceFee: 50000,
        totalAmount: 1500000,
        date_of_birth: '1995-05-20',
      })

      expect(prisma.participant.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: {
          full_name: 'Budi Santoso',
          phone_number: '+62812345678',
          identity_number: '3201234567890001',
          identity_type: 'KTP',
          country: 'Indonesia',
          nationality: 'WNI',
          gender: 'male',
          room_preference: 'King Bed',
          hotel_preference: 'Hotel A',
          checked_in: true,
          check_in_status: 'checked_in',
          health_notes: 'Allergy to peanuts',
          passport_number: 'A12345678',
          room_type: 'Deluxe',
          preferred_language: 'id',
          travel_insurance: true,
          has_insurance: true,
          insurance_fee: new Prisma.Decimal('50000'),
          total_amount: new Prisma.Decimal('1500000'),
          date_of_birth: expect.any(Date),
        },
      })
    })

    it('should allow snake_case fields as well', async () => {
      ;(prisma.participant.update as jest.Mock).mockResolvedValue({ id: 'part-123' })

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
})
