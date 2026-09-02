import { TripService } from '../../src/services/trip.service'
import { prisma } from '../../src/config/database'
import { ApiError } from '../../src/utils/errors'

jest.mock('../../src/config/database', () => ({
  prisma: {
    trip: {
      findUnique: jest.fn(),
    },
  },
}))

describe('TripService.getAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should throw ApiError (404) when trip is not found', async () => {
    ;(prisma.trip.findUnique as jest.Mock).mockResolvedValue(null)
    await expect(TripService.getAvailability(999)).rejects.toThrow(ApiError)
  })

  it('should return trip availability with slots and groups calculation', async () => {
    const mockTrip = {
      id: 1,
      departure_date: new Date('2026-09-05T00:00:00.000Z'),
      booking_groups: [
        {
          id: 1,
          group_number: 1,
          max_participants: 6,
          current_participants: 4,
          status: 'open',
        },
        {
          id: 2,
          group_number: 2,
          max_participants: 6,
          current_participants: 2,
          status: 'open',
        },
      ],
    }
    ;(prisma.trip.findUnique as jest.Mock).mockResolvedValue(mockTrip)

    const result = await TripService.getAvailability(1)

    expect(result.tripId).toBe('trip-1')
    expect(result.groups).toHaveLength(2)
    expect(result.groups[0]).toEqual({
      id: 'grp-1',
      groupNumber: 1,
      capacity: 6,
      currentParticipants: 4,
      availableSlots: 2,
      status: 'open',
      vehicleModel: 'Toyota HiAce (6-Seater VIP)',
    })
    expect(result.groups[1].availableSlots).toBe(4)
  })
})
