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
    trip: {
      deleteMany: jest.fn(),
    },
    bookingGroup: {
      deleteMany: jest.fn(),
    },
    payment: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((cb) =>
      cb({
        payment: { deleteMany: jest.fn() },
        bookingGroup: { deleteMany: jest.fn() },
        trip: { deleteMany: jest.fn() },
        destination: { delete: jest.fn() },
      })
    ),
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

  describe('adminList', () => {
    it('should return formatted destinations with title and location', async () => {
      ;(prisma.destination.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'dest-1',
          name: 'Kawah Ijen Blue Fire',
          slug: 'kawah-ijen-blue-fire',
          location: 'Banyuwangi',
          price_per_person: 750000,
          is_active: true,
        },
      ])

      const result = await DestinationService.adminList()

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Kawah Ijen Blue Fire')
      expect(result[0].location).toBe('Banyuwangi')
      expect(result[0].pricePerPax).toBe(750000)
    })
  })

  describe('update', () => {
    it('should throw 404 if destination not found', async () => {
      ;(prisma.destination.findUnique as jest.Mock).mockResolvedValue(null)
      await expect(DestinationService.update('dest-not-found', { title: 'New' })).rejects.toThrow(
        ApiError
      )
    })

    it('should update destination and return formatted object', async () => {
      ;(prisma.destination.findUnique as jest.Mock).mockResolvedValue({
        id: 'dest-1',
        name: 'Old Name',
        slug: 'old-name',
      })
      ;(prisma.destination.update as jest.Mock).mockResolvedValue({
        id: 'dest-1',
        name: 'Updated Name',
        slug: 'updated-name',
        price_per_person: 900000,
        is_active: true,
      })

      const result = await DestinationService.update('dest-1', {
        title: 'Updated Name',
        pricePerPax: 900000,
      })

      expect(result.title).toBe('Updated Name')
      expect(result.pricePerPax).toBe(900000)
    })
  })

  describe('delete', () => {
    it('should throw 404 if destination not found', async () => {
      ;(prisma.destination.findUnique as jest.Mock).mockResolvedValue(null)
      await expect(DestinationService.delete('dest-not-found')).rejects.toThrow(ApiError)
    })

    it('should throw 400 if destination has active participants', async () => {
      ;(prisma.destination.findUnique as jest.Mock).mockResolvedValue({
        id: 'dest-1',
        trips: [
          {
            id: 'trip-1',
            booking_groups: [
              {
                participants: [{ id: 'p1' }],
              },
            ],
          },
        ],
      })

      await expect(DestinationService.delete('dest-1')).rejects.toThrow(
        'Destinasi tidak dapat dihapus karena sudah memiliki peserta booking yang terdaftar.'
      )
    })

    it('should delete destination if no participants exist', async () => {
      ;(prisma.destination.findUnique as jest.Mock).mockResolvedValue({
        id: 'dest-1',
        trips: [
          {
            id: 'trip-1',
            booking_groups: [
              {
                participants: [],
              },
            ],
          },
        ],
      })

      await expect(DestinationService.delete('dest-1')).resolves.not.toThrow()
    })
  })

  describe('generateUniqueSlug & createDestination', () => {
    it('should sanitize special characters and uppercase into URL friendly slug', async () => {
      ;(prisma.destination.findUnique as jest.Mock).mockResolvedValue(null)
      const slug = await DestinationService.generateUniqueSlug('Promo Bromo & Ijen Tour 2026!')
      expect(slug).toBe('promo-bromo-ijen-tour-2026')
    })

    it('should increment slug counter if collision exists', async () => {
      ;(prisma.destination.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'existing-1' }) // first try 'bromo-sunrise'
        .mockResolvedValueOnce({ id: 'existing-2' }) // second try 'bromo-sunrise-1'
        .mockResolvedValueOnce(null) // third try 'bromo-sunrise-2'

      const slug = await DestinationService.generateUniqueSlug('Bromo Sunrise')
      expect(slug).toBe('bromo-sunrise-2')
    })

    it('should allow same slug if matching currentId when updating', async () => {
      ;(prisma.destination.findUnique as jest.Mock).mockResolvedValue({ id: 'dest-same' })
      const slug = await DestinationService.generateUniqueSlug('Bromo Sunrise', 'dest-same')
      expect(slug).toBe('bromo-sunrise')
    })

    it('should create destination with sanitized and unique slug', async () => {
      ;(prisma.destination.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.destination.create as jest.Mock).mockResolvedValue({
        id: 'dest-created',
        name: 'Labuan Bajo Trip',
        slug: 'labuan-bajo-trip',
        price_per_person: 2500000,
      })

      const result = await DestinationService.createDestination({
        title: 'Labuan Bajo Trip',
        pricePerPax: 2500000,
      })

      expect(prisma.destination.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'labuan-bajo-trip',
            name: 'Labuan Bajo Trip',
          }),
        })
      )
      expect(result.id).toBe('dest-created')
    })
  })
})

