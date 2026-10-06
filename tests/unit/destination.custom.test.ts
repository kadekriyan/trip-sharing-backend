import { Prisma } from '@prisma/client'
import { DestinationService } from '../../src/services/destination.service'
import { destinationValidator } from '../../src/validators/destination.validator'
import { prisma } from '../../src/config/database'

jest.mock('../../src/config/database', () => ({
  prisma: {
    destination: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

describe('Custom / Unlisted Destination Feature (Phase 13)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('destinationValidator', () => {
    it('should validate is_unlisted and isUnlisted on create', () => {
      const input = {
        name: 'VIP Private Borobudur Tour',
        pricePerPax: 1500000,
        is_unlisted: true,
      }
      const { error, value } = destinationValidator.create.validate(input)
      expect(error).toBeUndefined()
      expect(value.is_unlisted).toBe(true)
    })

    it('should validate is_unlisted on update', () => {
      const input = {
        isUnlisted: false,
      }
      const { error, value } = destinationValidator.update.validate(input)
      expect(error).toBeUndefined()
      expect(value.isUnlisted).toBe(false)
    })
  })

  describe('DestinationService.list (Public Catalog)', () => {
    it('should automatically exclude unlisted destinations from public catalog', async () => {
      ;(prisma.destination.count as jest.Mock).mockResolvedValue(1)
      ;(prisma.destination.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'dest-public-1',
          name: 'Public Bromo Sunrise',
          slug: 'public-bromo-sunrise',
          price_per_person: new Prisma.Decimal(750000),
          is_active: true,
          is_unlisted: false,
          created_at: new Date('2026-09-01'),
          updated_at: new Date('2026-09-01'),
        },
      ])

      const result = await DestinationService.list({ search: 'Bromo' })

      expect(prisma.destination.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            is_active: true,
            is_unlisted: false,
          }),
        })
      )
      expect(result.data.length).toBe(1)
      expect(result.data[0].isUnlisted).toBe(false)
    })
  })

  describe('DestinationService.adminList', () => {
    it('should return all destinations including unlisted ones for admin', async () => {
      ;(prisma.destination.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'dest-public-1',
          name: 'Public Bromo Sunrise',
          slug: 'public-bromo-sunrise',
          price_per_person: new Prisma.Decimal(750000),
          is_active: true,
          is_unlisted: false,
          created_at: new Date('2026-09-01'),
          updated_at: new Date('2026-09-01'),
        },
        {
          id: 'dest-private-1',
          name: 'Private VIP Merapi Lava',
          slug: 'private-vip-merapi',
          price_per_person: new Prisma.Decimal(1200000),
          is_active: true,
          is_unlisted: true,
          created_at: new Date('2026-09-02'),
          updated_at: new Date('2026-09-02'),
        },
      ])

      const result = await DestinationService.adminList()

      expect(result.length).toBe(2)
      expect(result[0].isUnlisted).toBe(false)
      expect(result[1].isUnlisted).toBe(true)
    })
  })

  describe('DestinationService.createDestination', () => {
    it('should save is_unlisted flag and set no_index to true if unlisted', async () => {
      const mockCreated = {
        id: 'dest-private-2',
        name: 'Exclusive Dieng Plateau',
        slug: 'exclusive-dieng-plateau',
        price_per_person: new Prisma.Decimal(1500000),
        is_active: true,
        is_unlisted: true,
        no_index: true,
        created_at: new Date('2026-10-01'),
        updated_at: new Date('2026-10-01'),
      }
      ;(prisma.destination.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.destination.create as jest.Mock).mockResolvedValue(mockCreated)

      const result = await DestinationService.createDestination({
        name: 'Exclusive Dieng Plateau',
        pricePerPax: 1500000,
        is_unlisted: true,
      })

      expect(prisma.destination.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            is_unlisted: true,
            no_index: true,
          }),
        })
      )
      expect(result.isUnlisted).toBe(true)
      expect(result.noIndex).toBe(true)
    })
  })

  describe('DestinationService.getBySlug', () => {
    it('should return unlisted destination directly when accessed via slug', async () => {
      const mockUnlistedDest = {
        id: 'dest-private-1',
        name: 'Private VIP Merapi Lava',
        slug: 'private-vip-merapi',
        price_per_person: new Prisma.Decimal(1200000),
        is_active: true,
        is_unlisted: true,
        trips: [],
        created_at: new Date('2026-09-02'),
        updated_at: new Date('2026-09-02'),
      }
      ;(prisma.destination.findUnique as jest.Mock).mockResolvedValue(mockUnlistedDest)

      const result = await DestinationService.getBySlug('private-vip-merapi')

      expect(result.isUnlisted).toBe(true)
      expect(result.name).toBe('Private VIP Merapi Lava')
    })
  })
})
