import { TripService } from '../../src/services/trip.service'
import { prisma } from '../../src/config/database'
import { ApiError } from '../../src/utils/errors'

jest.mock('../../src/config/database', () => ({
  prisma: {
    trip: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    destination: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}))

describe('TripService.update', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should map camelCase payload fields (departureDate, returnDate, maxParticipants, guideId) to database columns', async () => {
    const existingTrip = {
      id: 'trip-123',
      destination_id: 'dest-1',
      departure_date: new Date('2026-09-10T00:00:00.000Z'),
      return_date: new Date('2026-09-12T00:00:00.000Z'),
      max_participants: 6,
      current_participants: 0,
      guide_id: null,
      status: 'planning',
      notes: null,
      booking_groups: [],
    }

    ;(prisma.trip.findUnique as jest.Mock).mockResolvedValue(existingTrip)
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'guide-1' })
    ;(prisma.trip.update as jest.Mock).mockResolvedValue({
      ...existingTrip,
      departure_date: new Date('2026-09-18T00:00:00.000Z'),
      return_date: new Date('2026-09-21T10:00:00.000Z'),
      guide_id: 'guide-1',
      max_participants: 12,
      status: 'scheduled',
    })

    const payload = {
      departureDate: '2026-09-18T00:00:00.000Z',
      returnDate: '2026-09-21T10:00:00.000Z',
      maxParticipants: 12,
      guideId: 'guide-1',
      status: 'scheduled',
    }

    await TripService.update('trip-123', payload)

    expect(prisma.trip.update).toHaveBeenCalledWith({
      where: { id: '123' },
      data: {
        departure_date: new Date('2026-09-18T00:00:00.000Z'),
        return_date: new Date('2026-09-21T10:00:00.000Z'),
        max_participants: 12,
        guide_id: 'guide-1',
        status: 'scheduled',
      },
      include: {
        destination: true,
        guide: true,
        booking_groups: true,
      },
    })
  })

  it('should handle null returnDate and guideId correctly', async () => {
    const existingTrip = {
      id: '123',
      destination_id: 'dest-1',
      departure_date: new Date('2026-09-10T00:00:00.000Z'),
      return_date: new Date('2026-09-12T00:00:00.000Z'),
      max_participants: 6,
      current_participants: 0,
      guide_id: 'guide-1',
      status: 'planning',
      notes: 'Initial notes',
      booking_groups: [],
    }

    ;(prisma.trip.findUnique as jest.Mock).mockResolvedValue(existingTrip)
    ;(prisma.trip.update as jest.Mock).mockResolvedValue({
      ...existingTrip,
      return_date: null,
      guide_id: null,
      notes: null,
    })

    await TripService.update('123', {
      returnDate: null,
      guideId: null,
      notes: null,
    })

    expect(prisma.trip.update).toHaveBeenCalledWith({
      where: { id: '123' },
      data: {
        return_date: null,
        guide_id: null,
        notes: null,
      },
      include: {
        destination: true,
        guide: true,
        booking_groups: true,
      },
    })
  })

  it('should throw 404 ApiError if destination is not found during update', async () => {
    const existingTrip = {
      id: 'trip-123',
      booking_groups: [],
    }
    ;(prisma.trip.findUnique as jest.Mock).mockResolvedValue(existingTrip)
    ;(prisma.destination.findUnique as jest.Mock).mockResolvedValue(null)

    await expect(
      TripService.update('trip-123', { destinationId: 'non-existent-dest' })
    ).rejects.toThrow(ApiError)
  })
})

describe('TripService.delete', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should throw ApiError (400) with clear descriptive message if trip has registered participants', async () => {
    const tripWithParticipants = {
      id: '100',
      current_participants: 2,
      booking_groups: [
        { id: 'grp-1', current_participants: 2 },
      ],
    }
    ;(prisma.trip.findUnique as jest.Mock).mockResolvedValue(tripWithParticipants)

    await expect(TripService.delete('trip-100')).rejects.toThrow(ApiError)
    await expect(TripService.delete('trip-100')).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('masih memiliki 2 peserta terdaftar'),
    })
    expect(prisma.trip.delete).not.toHaveBeenCalled()
  })

  it('should delete trip successfully if trip has 0 participants', async () => {
    const emptyTrip = {
      id: '200',
      current_participants: 0,
      booking_groups: [
        { id: 'grp-1', current_participants: 0 },
      ],
    }
    ;(prisma.trip.findUnique as jest.Mock).mockResolvedValue(emptyTrip)
    ;(prisma.trip.delete as jest.Mock).mockResolvedValue({ id: '200' })

    await TripService.delete('trip-200')

    expect(prisma.trip.delete).toHaveBeenCalledWith({
      where: { id: '200' },
    })
  })
})

