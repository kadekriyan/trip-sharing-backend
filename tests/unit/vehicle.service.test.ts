import { VehicleService } from '../../src/services/vehicle.service'
import { prisma } from '../../src/config/database'
import { ApiError } from '../../src/utils/errors'

jest.mock('../../src/config/database', () => ({
  prisma: {
    vehicle: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    driver: {
      findUnique: jest.fn(),
    },
    bookingGroup: {
      findMany: jest.fn(),
    },
    area: {
      findFirst: jest.fn(),
    },
  },
}))

describe('VehicleService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('should create vehicle with normalized plate number', async () => {
      ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.vehicle.create as jest.Mock).mockResolvedValue({
        id: 'veh-1',
        name: 'Toyota HiAce Premio Luxury',
        plate_number: 'N 1234 XY',
        vehicle_type: 'Minivan',
        capacity: 6,
        transmission: 'Manual',
        fuel_type: 'Diesel',
        facility: ['AC', 'Reclining Seat'],
        cover_image: 'https://img.jpg',
        status: 'active',
        is_available: true,
        driver_id: null,
        created_at: new Date('2026-09-01'),
        updated_at: new Date('2026-09-01'),
      })
      ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'veh-1',
        name: 'Toyota HiAce Premio Luxury',
        plate_number: 'N 1234 XY',
        vehicle_type: 'Minivan',
        capacity: 6,
        transmission: 'Manual',
        fuel_type: 'Diesel',
        facility: ['AC', 'Reclining Seat'],
        cover_image: 'https://img.jpg',
        status: 'active',
        is_available: true,
        driver_id: null,
        created_at: new Date('2026-09-01'),
        updated_at: new Date('2026-09-01'),
        driver: null,
      })

      const result = await VehicleService.create({
        name: 'Toyota HiAce Premio Luxury',
        plateNumber: 'n 1234 xy',
        vehicleType: 'Minivan',
        capacity: 6,
      })

      expect(prisma.vehicle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            plate_number: 'N 1234 XY',
            name: 'Toyota HiAce Premio Luxury',
            capacity: 6,
          }),
        })
      )
      expect(result.plateNumber).toBe('N 1234 XY')
      expect(result.name).toBe('Toyota HiAce Premio Luxury')
    })

    it('should throw 409 if plate number already exists', async () => {
      ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue({
        id: 'veh-existing',
        plate_number: 'N 1234 XY',
      })

      await expect(
        VehicleService.create({
          name: 'HiAce Duplikat',
          plateNumber: 'N 1234 XY',
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringContaining('sudah terdaftar'),
      })
    })
  })

  describe('list', () => {
    it('should return formatted vehicles list with linked driver', async () => {
      ;(prisma.vehicle.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'veh-1',
          name: 'Toyota HiAce Premio',
          plate_number: 'N 1234 XY',
          vehicle_type: 'Minivan',
          capacity: 6,
          transmission: 'Manual',
          fuel_type: 'Diesel',
          facility: ['AC'],
          cover_image: null,
          status: 'active',
          is_available: true,
          driver_id: 'drv-1',
          driver: {
            id: 'drv-1',
            user_id: 'usr-1',
            license_number: 'SIM-A-1234',
            rating: 4.9,
            is_available: true,
            status: 'active',
            user: {
              id: 'usr-1',
              name: 'Pak Budi',
              phone: '+62812345678',
              email: 'budi@driver.local',
              profile_image_url: null,
            },
          },
        },
      ])

      const result = await VehicleService.list({ search: 'HiAce' })

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Toyota HiAce Premio')
      expect(result[0].driver?.fullName).toBe('Pak Budi')
      expect(result[0].driver?.phoneNumber).toBe('+62812345678')
    })

    it('should filter vehicles by area', async () => {
      ;(prisma.vehicle.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'veh-2',
          name: 'Isuzu Elf Long',
          plate_number: 'N 9999 ZZ',
          vehicle_type: 'Minibus',
          capacity: 12,
          status: 'active',
          is_available: true,
          area_id: 'area-malang',
          driver_id: null,
          driver: null,
          area: { id: 'area-malang', name: 'Malang', slug: 'malang', city: 'Malang', province: 'Jawa Timur' },
        },
      ])

      const result = await VehicleService.list({ area: 'malang' })

      expect(prisma.vehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { area: { slug: 'malang' } },
            ]),
          }),
        })
      )
      expect(result).toHaveLength(1)
      expect(result[0].area?.name).toBe('Malang')
      expect(result[0].areaId).toBe('area-malang')
    })
  })

  describe('assignDriver', () => {
    it('should assign driver to vehicle and clear previous assignment', async () => {
      const mockVehicle = {
        id: 'veh-1',
        name: 'Toyota HiAce',
        plate_number: 'N 1111 AA',
        driver_id: null,
      }
      const mockDriver = {
        id: 'drv-1',
        user: { name: 'Pak Joko', phone: '+6281234' },
      }

      ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue(mockVehicle)
      ;(prisma.driver.findUnique as jest.Mock).mockResolvedValue(mockDriver)
      ;(prisma.vehicle.updateMany as jest.Mock).mockResolvedValue({ count: 1 })
      ;(prisma.vehicle.update as jest.Mock).mockResolvedValue({
        ...mockVehicle,
        driver_id: 'drv-1',
        driver: {
          id: 'drv-1',
          user: mockDriver.user,
        },
      })

      const result = await VehicleService.assignDriver('veh-1', { driverId: 'drv-1' })

      expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({
        where: { driver_id: '1', id: { not: '1' } },
        data: { driver_id: null },
      })
      expect(result.driverId).toBe('drv-1')
      expect(result.driver?.fullName).toBe('Pak Joko')
    })

    it('should unassign driver when driverId is null', async () => {
      const mockVehicle = {
        id: 'veh-1',
        name: 'Toyota HiAce',
        plate_number: 'N 1111 AA',
        driver_id: 'drv-1',
      }

      ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue(mockVehicle)
      ;(prisma.vehicle.update as jest.Mock).mockResolvedValue({
        ...mockVehicle,
        driver_id: null,
        driver: null,
      })

      const result = await VehicleService.assignDriver('veh-1', { driverId: null })

      expect(prisma.vehicle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: { driver_id: null },
        })
      )
      expect(result.driverId).toBeNull()
      expect(result.driver).toBeNull()
    })
  })

  describe('delete', () => {
    it('should throw 400 if vehicle is assigned to active booking groups', async () => {
      ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue({
        id: 'veh-1',
        booking_groups: [{ id: 'grp-1', status: 'open' }],
      })

      await expect(VehicleService.delete('veh-1')).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('sedang ditugaskan pada grup perjalanan aktif'),
      })
    })

    it('should delete vehicle successfully if no active booking groups exist', async () => {
      ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue({
        id: 'veh-1',
        booking_groups: [],
      })
      ;(prisma.vehicle.delete as jest.Mock).mockResolvedValue({ id: 'veh-1' })

      const result = await VehicleService.delete('veh-1')
      expect(result.deleted).toBe(true)
      expect(prisma.vehicle.delete).toHaveBeenCalledWith({ where: { id: '1' } })
    })
  })
})
