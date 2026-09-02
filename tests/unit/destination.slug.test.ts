import { DestinationService } from '../../src/services/destination.service'
import { prisma } from '../../src/config/database'
import { ApiError } from '../../src/utils/errors'

jest.mock('../../src/config/database', () => ({
  prisma: {
    destination: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

describe('DestinationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getBySlug', () => {
    it('should throw ApiError (404) if destination is not found', async () => {
      ;(prisma.destination.findUnique as jest.Mock).mockResolvedValue(null)
      await expect(DestinationService.getBySlug('non-existent')).rejects.toThrow(ApiError)
    })

    it('should return destination details by slug with activeTrips formatted', async () => {
      const mockDest = {
        id: 'dest-1',
        name: 'Bromo Sunrise',
        slug: 'bromo-sunrise',
        description: 'Trip sharing Bromo',
        price_per_person: 850000,
        is_active: true,
        trips: [
          {
            id: 'trip-10',
            departure_date: new Date('2026-09-05'),
            return_date: new Date('2026-09-06'),
            status: 'scheduled',
            booking_groups: [
              {
                id: 'grp-100',
                group_number: 1,
                max_participants: 6,
                current_participants: 4,
                status: 'open',
              },
            ],
            guide: {
              name: 'Budi Santoso',
              driver: {
                id: 'drv-5',
                vehicle_type: 'Toyota HiAce',
                vehicle_plat: 'N 1234 XY',
              },
            },
          },
        ],
      }
      ;(prisma.destination.findUnique as jest.Mock).mockResolvedValue(mockDest)

      const result = await DestinationService.getBySlug('bromo-sunrise')

      expect(result.slug).toBe('bromo-sunrise')
      expect(result.title).toBe('Bromo Sunrise')
      expect(result.activeTrips).toHaveLength(1)
      expect(result.activeTrips[0].groups[0].driver.fullName).toBe('Budi Santoso')
    })
  })

  describe('list with pagination and filters', () => {
    it('should return paginated destinations with meta', async () => {
      ;(prisma.destination.count as jest.Mock).mockResolvedValue(1)
      ;(prisma.destination.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'dest-1',
          name: 'Bromo Sunrise',
          slug: 'bromo-sunrise',
          price_per_person: 850000,
          is_active: true,
        },
      ])

      const result = await DestinationService.list({ search: 'bromo', page: 1, limit: 10 })

      expect(result.data).toHaveLength(1)
      expect(result.meta.page).toBe(1)
      expect(result.meta.total).toBe(1)
      expect(result.meta.totalPages).toBe(1)
    })
  })
})
