import { AreaService } from '../../src/services/area.service'
import { prisma } from '../../src/config/database'
import { ApiError } from '../../src/utils/errors'

jest.mock('../../src/config/database', () => ({
  prisma: {
    area: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    driver: {
      updateMany: jest.fn(),
    },
    vehicle: {
      updateMany: jest.fn(),
    },
  },
}))

describe('AreaService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('should create an area with auto-generated slug', async () => {
      ;(prisma.area.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.area.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.area.create as jest.Mock).mockResolvedValue({
        id: 'area-1',
        name: 'Malang Raya',
        slug: 'malang-raya',
        city: 'Malang',
        province: 'Jawa Timur',
        description: 'Wilayah operasional Malang dan sekitarnya',
        is_active: true,
        created_at: new Date('2026-09-01'),
        updated_at: new Date('2026-09-01'),
        _count: { drivers: 0, vehicles: 0 },
      })

      const result = await AreaService.create({
        name: 'Malang Raya',
        city: 'Malang',
        province: 'Jawa Timur',
        description: 'Wilayah operasional Malang dan sekitarnya',
      })

      expect(prisma.area.create).toHaveBeenCalledWith({
        data: {
          name: 'Malang Raya',
          slug: 'malang-raya',
          city: 'Malang',
          province: 'Jawa Timur',
          description: 'Wilayah operasional Malang dan sekitarnya',
          is_active: true,
        },
        include: {
          _count: {
            select: { drivers: true, vehicles: true },
          },
        },
      })
      expect(result.id).toBe('area-1')
      expect(result.name).toBe('Malang Raya')
      expect(result.slug).toBe('malang-raya')
      expect(result.driversCount).toBe(0)
      expect(result.vehiclesCount).toBe(0)
    })

    it('should strip HTML tags from name and description', async () => {
      ;(prisma.area.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.area.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.area.create as jest.Mock).mockResolvedValue({
        id: 'area-2',
        name: 'Banyuwangi',
        slug: 'banyuwangi',
        city: 'Banyuwangi',
        province: 'Jawa Timur',
        description: 'Kota Gandrung',
        is_active: true,
        created_at: new Date('2026-09-01'),
        updated_at: new Date('2026-09-01'),
        _count: { drivers: 0, vehicles: 0 },
      })

      const result = await AreaService.create({
        name: '<script>alert(1)</script>Banyuwangi',
        description: '<b>Kota Gandrung</b>',
        city: 'Banyuwangi',
        province: 'Jawa Timur',
      })

      expect(prisma.area.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Banyuwangi',
            description: 'Kota Gandrung',
          }),
        })
      )
      expect(result.name).toBe('Banyuwangi')
    })

    it('should throw 400 if name is less than 2 characters after sanitize', async () => {
      await expect(
        AreaService.create({
          name: '   ',
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('Nama area wajib diisi minimal 2 karakter'),
      })
    })

    it('should throw 409 if area name already exists', async () => {
      ;(prisma.area.findFirst as jest.Mock).mockResolvedValue({
        id: 'area-existing',
        name: 'Malang',
      })

      await expect(
        AreaService.create({
          name: 'Malang',
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringContaining('sudah terdaftar'),
      })
    })

    it('should auto-disambiguate slug if custom slug collision occurs', async () => {
      ;(prisma.area.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.area.findUnique as jest.Mock).mockResolvedValue({
        id: 'area-old',
        slug: 'bali',
      })
      ;(prisma.area.create as jest.Mock).mockImplementation(({ data }) => ({
        id: 'area-new',
        ...data,
        _count: { drivers: 0, vehicles: 0 },
      }))

      const result = await AreaService.create({
        name: 'Bali Selatan',
        slug: 'bali',
      })

      expect(result.slug).toMatch(/^bali-\d+$/)
    })
  })

  describe('list', () => {
    it('should return list of areas with driver and vehicle counts', async () => {
      ;(prisma.area.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'area-1',
          name: 'Malang',
          slug: 'malang',
          city: 'Malang',
          province: 'Jawa Timur',
          description: null,
          is_active: true,
          created_at: new Date('2026-09-01'),
          updated_at: new Date('2026-09-01'),
          _count: { drivers: 5, vehicles: 3 },
        },
        {
          id: 'area-2',
          name: 'Banyuwangi',
          slug: 'banyuwangi',
          city: 'Banyuwangi',
          province: 'Jawa Timur',
          description: null,
          is_active: true,
          created_at: new Date('2026-09-01'),
          updated_at: new Date('2026-09-01'),
          _count: { drivers: 2, vehicles: 2 },
        },
      ])

      const result = await AreaService.list({ search: 'Malang', city: 'Malang' })

      expect(prisma.area.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          city: { contains: 'Malang', mode: 'insensitive' },
          OR: expect.any(Array),
        }),
        include: {
          _count: {
            select: { drivers: true, vehicles: true },
          },
        },
        orderBy: [{ is_active: 'desc' }, { name: 'asc' }],
      })
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Malang')
      expect(result[0].driversCount).toBe(5)
      expect(result[0].vehiclesCount).toBe(3)
    })
  })

  describe('get', () => {
    it('should find area by UUID or slug', async () => {
      const mockArea = {
        id: 'area-uuid-1',
        name: 'Surabaya',
        slug: 'surabaya',
        city: 'Surabaya',
        province: 'Jawa Timur',
        description: 'Kota Pahlawan',
        is_active: true,
        created_at: new Date('2026-09-01'),
        updated_at: new Date('2026-09-01'),
        _count: { drivers: 4, vehicles: 4 },
      }

      ;(prisma.area.findFirst as jest.Mock).mockResolvedValue(mockArea)

      const result = await AreaService.get('area-uuid-1')

      expect(prisma.area.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: 'uuid-1' }, { id: 'area-uuid-1' }, { slug: 'area-uuid-1' }],
        },
        include: {
          _count: {
            select: { drivers: true, vehicles: true },
          },
        },
      })
      expect(result.name).toBe('Surabaya')
      expect(result.driversCount).toBe(4)
    })

    it('should throw 404 if area not found', async () => {
      ;(prisma.area.findFirst as jest.Mock).mockResolvedValue(null)

      await expect(AreaService.get('non-existent')).rejects.toMatchObject({
        statusCode: 404,
        message: expect.stringContaining('tidak ditemukan'),
      })
    })
  })

  describe('update', () => {
    it('should update area details and auto-update slug when name changed', async () => {
      const existingArea = {
        id: 'area-1',
        name: 'Malang',
        slug: 'malang',
        city: 'Malang',
        province: 'Jawa Timur',
      }

      ;(prisma.area.findFirst as jest.Mock)
        .mockResolvedValueOnce(existingArea) // find existing
        .mockResolvedValueOnce(null) // dup name check
        .mockResolvedValueOnce(null) // dup slug check

      ;(prisma.area.update as jest.Mock).mockResolvedValue({
        id: 'area-1',
        name: 'Malang Raya',
        slug: 'malang-raya',
        city: 'Kota Malang',
        province: 'Jawa Timur',
        description: 'Updated description',
        is_active: true,
        created_at: new Date('2026-09-01'),
        updated_at: new Date('2026-09-02'),
        _count: { drivers: 3, vehicles: 2 },
      })

      const result = await AreaService.update('area-1', {
        name: 'Malang Raya',
        city: 'Kota Malang',
        description: 'Updated description',
      })

      expect(prisma.area.update).toHaveBeenCalledWith({
        where: { id: 'area-1' },
        data: {
          name: 'Malang Raya',
          slug: 'malang-raya',
          city: 'Kota Malang',
          description: 'Updated description',
        },
        include: {
          _count: {
            select: { drivers: true, vehicles: true },
          },
        },
      })
      expect(result.name).toBe('Malang Raya')
      expect(result.slug).toBe('malang-raya')
    })

    it('should throw 409 if updated name conflicts with another area', async () => {
      const existingArea = { id: 'area-1', name: 'Malang', slug: 'malang' }
      ;(prisma.area.findFirst as jest.Mock)
        .mockResolvedValueOnce(existingArea)
        .mockResolvedValueOnce({ id: 'area-2', name: 'Banyuwangi' })

      await expect(
        AreaService.update('area-1', {
          name: 'Banyuwangi',
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringContaining('sudah terdaftar'),
      })
    })

    it('should throw 404 if area to update does not exist', async () => {
      ;(prisma.area.findFirst as jest.Mock).mockResolvedValue(null)

      await expect(
        AreaService.update('not-found', {
          name: 'Test',
        })
      ).rejects.toMatchObject({
        statusCode: 404,
      })
    })
  })

  describe('delete', () => {
    it('should safely unlink drivers and vehicles and delete area', async () => {
      const existingArea = { id: 'area-1', name: 'Malang', slug: 'malang' }
      ;(prisma.area.findFirst as jest.Mock).mockResolvedValue(existingArea)
      ;(prisma.driver.updateMany as jest.Mock).mockResolvedValue({ count: 2 })
      ;(prisma.vehicle.updateMany as jest.Mock).mockResolvedValue({ count: 1 })
      ;(prisma.area.delete as jest.Mock).mockResolvedValue(existingArea)

      const result = await AreaService.delete('area-1')

      expect(prisma.driver.updateMany).toHaveBeenCalledWith({
        where: { area_id: 'area-1' },
        data: { area_id: null },
      })
      expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({
        where: { area_id: 'area-1' },
        data: { area_id: null },
      })
      expect(prisma.area.delete).toHaveBeenCalledWith({
        where: { id: 'area-1' },
      })
      expect(result.deleted).toBe(true)
      expect(result.id).toBe('area-1')
    })

    it('should throw 404 when deleting non-existent area', async () => {
      ;(prisma.area.findFirst as jest.Mock).mockResolvedValue(null)

      await expect(AreaService.delete('invalid')).rejects.toMatchObject({
        statusCode: 404,
      })
    })
  })
})
