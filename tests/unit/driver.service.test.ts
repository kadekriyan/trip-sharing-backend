import { DriverService } from '../../src/services/driver.service'
import { prisma } from '../../src/config/database'
import { ApiError } from '../../src/utils/errors'

jest.mock('../../src/config/database', () => ({
  prisma: {
    driver: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    trip: {
      findMany: jest.fn(),
    },
  },
}))

describe('DriverService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('should create driver and auto-create user when fullName provided', async () => {
      ;(prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'usr-1',
        name: 'Pak Budi',
        phone: '+62812345678',
        role: 'driver',
      })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'usr-1' })
      ;(prisma.driver.create as jest.Mock).mockResolvedValue({
        id: 'drv-1',
        user_id: 'usr-1',
        license_number: 'SIM-A-1234',
        vehicle_type: 'Toyota HiAce Premio',
        vehicle_plat: 'N 1234 XY',
        experience_years: 5,
        is_available: true,
        user: { id: 'usr-1', name: 'Pak Budi', phone: '+62812345678' },
      })

      const result = await DriverService.create({
        fullName: 'Pak Budi',
        phoneNumber: '+62812345678',
        vehicleModel: 'Toyota HiAce Premio',
        plateNumber: 'N 1234 XY',
      })

      expect(result.fullName).toBe('Pak Budi')
      expect(result.vehicleModel).toBe('Toyota HiAce Premio')
      expect(result.plateNumber).toBe('N 1234 XY')
    })
  })

  describe('list', () => {
    it('should return formatted drivers list', async () => {
      ;(prisma.driver.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'drv-1',
          user_id: 'usr-1',
          license_number: 'SIM-A-1234',
          vehicle_type: 'Toyota HiAce Premio',
          vehicle_plat: 'N 1234 XY',
          experience_years: 5,
          is_available: true,
          user: { id: 'usr-1', name: 'Pak Budi', phone: '+62812345678' },
        },
      ])

      const result = await DriverService.list()

      expect(result).toHaveLength(1)
      expect(result[0].fullName).toBe('Pak Budi')
      expect(result[0].vehicleType).toBe('Toyota HiAce Premio')
    })
  })

  describe('update', () => {
    it('should update driver and linked user', async () => {
      ;(prisma.driver.findUnique as jest.Mock).mockResolvedValue({
        id: 'drv-1',
        user_id: 'usr-1',
        user: { id: 'usr-1', name: 'Pak Budi' },
      })
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        id: 'usr-1',
        name: 'Pak Budi Updated',
      })
      ;(prisma.driver.update as jest.Mock).mockResolvedValue({
        id: 'drv-1',
        user_id: 'usr-1',
        license_number: 'SIM-A-9999',
        vehicle_type: 'Toyota HiAce Commuter',
        vehicle_plat: 'N 9999 ZZ',
        experience_years: 7,
        is_available: false,
        user: { id: 'usr-1', name: 'Pak Budi Updated', phone: '+62812345678' },
      })

      const result = await DriverService.update('drv-1', {
        fullName: 'Pak Budi Updated',
        vehicleModel: 'Toyota HiAce Commuter',
        isAvailable: false,
      })

      expect(result.fullName).toBe('Pak Budi Updated')
      expect(result.vehicleModel).toBe('Toyota HiAce Commuter')
      expect(result.isAvailable).toBe(false)
    })
  })

  describe('delete', () => {
    it('should throw 400 if driver is assigned to active trips', async () => {
      ;(prisma.driver.findUnique as jest.Mock).mockResolvedValue({
        id: 'drv-1',
        user_id: 'usr-1',
      })
      ;(prisma.trip.findMany as jest.Mock).mockResolvedValue([{ id: 'trip-1', status: 'active' }])

      await expect(DriverService.delete('drv-1')).rejects.toThrow(
        'Driver tidak dapat dihapus karena sedang ditugaskan pada jadwal trip aktif.'
      )
    })

    it('should delete driver when no active trips exist', async () => {
      ;(prisma.driver.findUnique as jest.Mock).mockResolvedValue({
        id: 'drv-1',
        user_id: 'usr-1',
      })
      ;(prisma.trip.findMany as jest.Mock).mockResolvedValue([])

      await expect(DriverService.delete('drv-1')).resolves.not.toThrow()
      expect(prisma.driver.delete).toHaveBeenCalledWith({ where: { id: 'drv-1' } })
    })
  })
})
