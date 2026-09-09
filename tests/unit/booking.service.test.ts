import { Prisma } from '@prisma/client'
import { BookingService } from '../../src/services/booking.service'
import { prisma } from '../../src/config/database'
import { CreateBookingInput } from '../../src/types/booking'

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
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    participant: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

describe('BookingService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getOrCreateBookingGroup', () => {
    it('should throw ApiError (404) if trip does not exist', async () => {
      ;(prisma.trip.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        BookingService.getOrCreateBookingGroup('trip-999', 500000)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Trip not found',
      })
    })

    it('should return existing open group if slots are available', async () => {
      const mockOpenGroup = {
        id: 'grp-1',
        trip_id: 'trip-1',
        group_number: 1,
        status: 'open',
        current_participants: 3,
        max_participants: 6,
      }
      ;(prisma.trip.findUnique as jest.Mock).mockResolvedValue({
        id: 'trip-1',
        booking_groups: [mockOpenGroup],
      })

      const group = await BookingService.getOrCreateBookingGroup('trip-1', 500000)
      expect(group).toEqual(mockOpenGroup)
      expect(prisma.bookingGroup.create).not.toHaveBeenCalled()
    })

    it('should create a new booking group if existing group is full', async () => {
      const mockFullGroup = {
        id: 'grp-1',
        trip_id: 'trip-1',
        group_number: 1,
        status: 'open',
        current_participants: 6,
        max_participants: 6,
      }
      ;(prisma.trip.findUnique as jest.Mock).mockResolvedValue({
        id: 'trip-1',
        booking_groups: [mockFullGroup],
      })
      ;(prisma.bookingGroup.findFirst as jest.Mock).mockResolvedValue({ group_number: 1 })
      ;(prisma.bookingGroup.create as jest.Mock).mockResolvedValue({
        id: 'grp-2',
        trip_id: 'trip-1',
        group_number: 2,
        status: 'open',
        price_per_person: new Prisma.Decimal(500000),
        total_price: new Prisma.Decimal(3000000),
      })

      const newGroup = await BookingService.getOrCreateBookingGroup('trip-1', 500000)
      expect(newGroup.id).toBe('grp-2')
      expect(newGroup.group_number).toBe(2)
      expect(prisma.bookingGroup.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          trip_id: '1',
          group_number: 2,
          status: 'open',
        }),
      })
    })
  })

  describe('createBooking', () => {
    const sampleInput: CreateBookingInput = {
      trip_id: 'trip-1',
      full_name: 'Jane Doe',
      phone_number: '08123456789',
      country: 'Indonesia',
      date_of_birth: '1995-05-15',
      hotel_preference: 'Standard Double',
      passport_number: 'A12345678',
      identity_type: 'passport',
      room_type: 'twin',
      health_notes: 'None',
      preferred_language: 'English',
      travel_insurance: true,
    }

    it('should throw ApiError (404) if trip and destination do not exist', async () => {
      ;(prisma.trip.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.destination.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(BookingService.createBooking('usr-1', sampleInput)).rejects.toMatchObject({
        statusCode: 404,
        message: 'Trip or destination not found',
      })
    })

    it('should fallback to destination and auto-provision trip if tripId matches destination', async () => {
      ;(prisma.trip.findUnique as jest.Mock).mockResolvedValue(null)
      const mockDestination = {
        id: 'dest-1',
        name: 'Bromo Sunrise',
        price_per_person: new Prisma.Decimal(850000),
        duration_days: 2,
      }
      ;(prisma.destination.findUnique as jest.Mock).mockResolvedValue(mockDestination)
      ;(prisma.trip.findFirst as jest.Mock).mockResolvedValue(null)

      const mockCreatedTrip = {
        id: 'trip-auto-1',
        destination_id: 'dest-1',
        destination: mockDestination,
        booking_groups: [],
      }
      ;(prisma.trip.create as jest.Mock).mockResolvedValue(mockCreatedTrip)
      ;(prisma.trip.findUnique as jest.Mock).mockResolvedValue(mockCreatedTrip)

      const mockParticipant = {
        id: 'part-101',
        booking_group_id: 'grp-auto-1',
        user_id: 'usr-1',
        full_name: 'Jane Doe',
      }

      ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          user: { findUnique: jest.fn().mockResolvedValue({ id: 'usr-1' }) },
          participant: { create: jest.fn().mockResolvedValue(mockParticipant) },
          bookingGroup: {
            update: jest
              .fn()
              .mockResolvedValue({
                id: 'grp-auto-1',
                current_participants: 1,
                max_participants: 6,
              }),
          },
          trip: {
            update: jest.fn().mockResolvedValue({ id: 'trip-auto-1', current_participants: 1 }),
          },
        }
        return callback(tx)
      })

      ;(prisma.bookingGroup.create as jest.Mock).mockResolvedValue({
        id: 'grp-auto-1',
        trip_id: 'trip-auto-1',
        current_participants: 0,
        max_participants: 6,
      })

      const result = await BookingService.createBooking('usr-1', {
        destinationId: 'dest-1',
        fullName: 'Jane Doe',
        phoneNumber: '08123456789',
      })

      expect(result.participant).toBeDefined()
      expect(prisma.trip.create).toHaveBeenCalled()
    })

    it('should assign participant to group and increment counters inside transaction', async () => {
      const mockTrip = {
        id: 'trip-1',
        destination: { price_per_person: new Prisma.Decimal(750000) },
        booking_groups: [
          {
            id: 'grp-10',
            trip_id: 'trip-1',
            group_number: 1,
            status: 'open',
            current_participants: 2,
            max_participants: 6,
          },
        ],
      }

      ;(prisma.trip.findUnique as jest.Mock).mockResolvedValue(mockTrip)

      const mockParticipant = {
        id: 'part-100',
        booking_group_id: 'grp-10',
        user_id: 'usr-1',
        full_name: sampleInput.full_name,
      }

      const mockUpdatedGroup = {
        id: 'grp-10',
        current_participants: 3,
        max_participants: 6,
        status: 'open',
      }

      ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          user: { findUnique: jest.fn().mockResolvedValue({ id: 'usr-1' }) },
          participant: { create: jest.fn().mockResolvedValue(mockParticipant) },
          bookingGroup: { update: jest.fn().mockResolvedValue(mockUpdatedGroup) },
          trip: { update: jest.fn().mockResolvedValue({ id: 'trip-1', current_participants: 3 }) },
        }
        return callback(tx)
      })

      const result = await BookingService.createBooking('usr-1', sampleInput)
      expect(result.participant).toEqual(mockParticipant)
      expect(result.bookingGroup.current_participants).toBe(3)
    })

    it('should auto-provision new trip with status scheduled and custom departure date when custom tripId / departureDate is requested', async () => {
      const mockDestination = {
        id: 'dest-bromo',
        slug: 'bromo-sunrise',
        name: 'Bromo Sunrise Tour',
        price_per_person: new Prisma.Decimal(800000),
        duration_days: 2,
        max_group_capacity: 6,
      }
      ;(prisma.destination.findUnique as jest.Mock).mockResolvedValue(mockDestination)
      ;(prisma.trip.findFirst as jest.Mock).mockResolvedValue(null)

      const mockCreatedTrip = {
        id: 'trip-custom-1',
        destination_id: 'dest-bromo',
        destination: mockDestination,
        departure_date: new Date('2026-10-15T00:00:00.000Z'),
        return_date: new Date('2026-10-17T00:00:00.000Z'),
        status: 'scheduled',
        current_participants: 0,
        max_participants: 6,
        booking_groups: [],
      }
      ;(prisma.trip.create as jest.Mock).mockResolvedValue(mockCreatedTrip)
      ;(prisma.trip.findUnique as jest.Mock).mockResolvedValue(mockCreatedTrip)

      const mockParticipant = {
        id: 'part-custom-1',
        booking_group_id: 'grp-custom-1',
        user_id: 'usr-1',
        full_name: 'Custom Traveler',
      }

      const mockGroup1 = {
        id: 'grp-custom-1',
        trip_id: 'trip-custom-1',
        group_number: 1,
        status: 'open',
        current_participants: 1,
        max_participants: 6,
        price_per_person: new Prisma.Decimal(950000),
        total_price: new Prisma.Decimal(5700000),
      }

      ;(prisma.bookingGroup.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.bookingGroup.create as jest.Mock).mockResolvedValue({
        ...mockGroup1,
        current_participants: 0,
      })

      ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          user: { findUnique: jest.fn().mockResolvedValue({ id: 'usr-1' }) },
          participant: { create: jest.fn().mockResolvedValue(mockParticipant) },
          bookingGroup: { update: jest.fn().mockResolvedValue(mockGroup1) },
          trip: {
            update: jest.fn().mockResolvedValue({ ...mockCreatedTrip, current_participants: 1 }),
          },
        }
        return callback(tx)
      })

      const result = await BookingService.createBooking('usr-1', {
        tripId: 'custom-bromo-20261015',
        destinationId: 'dest-bromo',
        departureDate: '2026-10-15T00:00:00.000Z',
        pricePerPax: 950000,
        fullName: 'Custom Traveler',
        phoneNumber: '081234567890',
      })

      expect(prisma.trip.create).toHaveBeenCalledWith({
        data: {
          destination_id: 'dest-bromo',
          departure_date: new Date('2026-10-15T00:00:00.000Z'),
          return_date: expect.any(Date),
          status: 'scheduled',
          max_participants: 6,
          current_participants: 0,
        },
        include: { destination: true },
      })
      expect(result.participant).toEqual(mockParticipant)
      expect(result.bookingGroup.group_number).toBe(1)
      expect(result.bookingGroup.current_participants).toBe(1)
    })

    it('should save pickup location and coordinates properly on booking creation', async () => {
      const mockTrip = {
        id: 'trip-1',
        destination: { price_per_person: new Prisma.Decimal(750000) },
        booking_groups: [
          {
            id: 'grp-10',
            trip_id: 'trip-1',
            group_number: 1,
            status: 'open',
            current_participants: 1,
            max_participants: 6,
          },
        ],
      }
      ;(prisma.trip.findUnique as jest.Mock).mockResolvedValue(mockTrip)

      let capturedParticipantData: any = null
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          user: { findUnique: jest.fn().mockResolvedValue({ id: 'usr-1' }) },
          participant: {
            create: jest.fn().mockImplementation(({ data }) => {
              capturedParticipantData = data
              return { id: 'part-pickup-1', ...data }
            }),
          },
          bookingGroup: {
            update: jest.fn().mockResolvedValue({
              id: 'grp-10',
              current_participants: 2,
              max_participants: 6,
            }),
          },
          trip: { update: jest.fn().mockResolvedValue({ id: 'trip-1', current_participants: 2 }) },
        }
        return callback(tx)
      })

      const result = await BookingService.createBooking('usr-1', {
        tripId: 'trip-1',
        fullName: 'Traveler Pickup Test',
        phoneNumber: '081234567890',
        pickupLocation: 'Hotel Santika Malang',
        pickupLatitude: -7.962145,
        pickupLongitude: 112.634125,
        pickupNotes: 'Tunggu di lobi timur',
      })

      expect(result.participant.id).toBe('part-pickup-1')
      expect(capturedParticipantData.pickup_location).toBe('Hotel Santika Malang')
      expect(capturedParticipantData.pickup_latitude).toEqual(new Prisma.Decimal('-7.962145'))
      expect(capturedParticipantData.pickup_longitude).toEqual(new Prisma.Decimal('112.634125'))
      expect(capturedParticipantData.pickup_notes).toBe('Tunggu di lobi timur')
    })
  })
})

