import { DriverService } from '../../src/services/driver.service'
import { prisma } from '../../src/config/database'
import { ApiError } from '../../src/utils/errors'

jest.mock('../../src/config/database', () => ({
  prisma: {
    driver: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    vehicle: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    trip: {
      findMany: jest.fn(),
    },
    area: {
      findFirst: jest.fn(),
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
        license_expiry_date: new Date('2028-12-31'),
        is_available: true,
        user: { id: 'usr-1', name: 'Pak Budi', phone: '+62812345678' },
        vehicle: null,
      })
      ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.vehicle.create as jest.Mock).mockResolvedValue({
        id: 'veh-1',
        name: 'Toyota HiAce Premio',
        plate_number: 'N 1234 XY',
        driver_id: 'drv-1',
      })
      ;(prisma.driver.findUnique as jest.Mock).mockResolvedValue({
        id: 'drv-1',
        user_id: 'usr-1',
        license_number: 'SIM-A-1234',
        license_expiry_date: new Date('2028-12-31'),
        is_available: true,
        user: { id: 'usr-1', name: 'Pak Budi', phone: '+62812345678' },
        vehicle: {
          id: 'veh-1',
          name: 'Toyota HiAce Premio',
          plate_number: 'N 1234 XY',
          vehicle_type: 'Minivan',
          capacity: 6,
          status: 'active',
          is_available: true,
        },
      })

      const result = await DriverService.create({
        fullName: 'Pak Budi',
        phoneNumber: '+62812345678',
        licenseExpiryDate: '2028-12-31',
        vehicleModel: 'Toyota HiAce Premio',
        plateNumber: 'N 1234 XY',
      })

      expect(result.fullName).toBe('Pak Budi')
      expect(result.vehicleModel).toBe('Toyota HiAce Premio')
      expect(result.plateNumber).toBe('N 1234 XY')
      expect(result.licenseExpiryDate).toEqual(new Date('2028-12-31'))
    })
  })

  describe('list', () => {
    it('should return formatted drivers list with vehicle info', async () => {
      ;(prisma.driver.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'drv-1',
          user_id: 'usr-1',
          license_number: 'SIM-A-1234',
          license_expiry_date: new Date('2028-12-31'),
          is_available: true,
          user: { id: 'usr-1', name: 'Pak Budi', phone: '+62812345678' },
          vehicle: {
            id: 'veh-1',
            name: 'Toyota HiAce Premio',
            plate_number: 'N 1234 XY',
            vehicle_type: 'Minivan',
            capacity: 6,
            status: 'active',
            is_available: true,
          },
        },
      ])

      const result = await DriverService.list()

      expect(result).toHaveLength(1)
      expect(result[0].fullName).toBe('Pak Budi')
      expect(result[0].vehicleType).toBe('Toyota HiAce Premio')
      expect(result[0].plateNumber).toBe('N 1234 XY')
      expect(result[0].licenseExpiryDate).toEqual(new Date('2028-12-31'))
    })

    it('should filter drivers by area', async () => {
      ;(prisma.driver.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'drv-2',
          user_id: 'usr-2',
          license_number: 'SIM-A-5678',
          license_expiry_date: new Date('2027-06-15'),
          is_available: true,
          area_id: 'area-malang',
          user: { id: 'usr-2', name: 'Pak Samsul', phone: '+628999' },
          vehicle: null,
          area: { id: 'area-malang', name: 'Malang', slug: 'malang', city: 'Malang', province: 'Jawa Timur' },
        },
      ])

      const result = await DriverService.list({ area: 'malang' })

      expect(prisma.driver.findMany).toHaveBeenCalledWith(
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

  describe('update', () => {
    it('should update driver license expiry date and name', async () => {
      const mockDriver = {
        id: 'drv-1',
        user_id: 'usr-1',
        license_number: 'SIM-A-1234',
        license_expiry_date: new Date('2027-01-01'),
        is_available: true,
        user: { id: 'usr-1', name: 'Pak Budi', phone: '+62812345678' },
        vehicle: null,
      }

      ;(prisma.driver.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockDriver)
        .mockResolvedValueOnce({
          ...mockDriver,
          license_expiry_date: new Date('2029-05-20'),
          user: { id: 'usr-1', name: 'Pak Budi Santoso', phone: '+62812345678' },
        })
      ;(prisma.user.update as jest.Mock).mockResolvedValue({ id: 'usr-1', name: 'Pak Budi Santoso' })
      ;(prisma.driver.update as jest.Mock).mockResolvedValue({
        ...mockDriver,
        license_expiry_date: new Date('2029-05-20'),
      })

      const result = await DriverService.update('drv-1', {
        fullName: 'Pak Budi Santoso',
        licenseExpiryDate: '2029-05-20',
      })

      expect(prisma.driver.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          license_expiry_date: new Date('2029-05-20'),
        }),
      })
      expect(result.fullName).toBe('Pak Budi Santoso')
      expect(result.licenseExpiryDate).toEqual(new Date('2029-05-20'))
    })
  })

  describe('assignVehicle', () => {
    it('should assign vehicle to driver successfully', async () => {
      const mockDriver = { id: 'drv-1', user_id: 'usr-1' }
      const mockVehicle = { id: 'veh-1', name: 'Toyota HiAce', plate_number: 'N 1111 AA' }

      ;(prisma.driver.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockDriver)
        .mockResolvedValueOnce({
          ...mockDriver,
          user: { name: 'Pak Joko', phone: '+628123' },
          vehicle: mockVehicle,
        })
      ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue(mockVehicle)
      ;(prisma.vehicle.updateMany as jest.Mock).mockResolvedValue({ count: 1 })
      ;(prisma.vehicle.update as jest.Mock).mockResolvedValue({ ...mockVehicle, driver_id: 'drv-1' })

      const result = await DriverService.assignVehicle('drv-1', 'veh-1')

      expect(prisma.vehicle.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { driver_id: '1' },
      })
      expect(result.vehicleId).toBe('veh-1')
      expect(result.vehicle?.name).toBe('Toyota HiAce')
    })
  })

  describe('delete', () => {
    it('should throw 400 if driver is assigned to active trips or groups', async () => {
      ;(prisma.driver.findUnique as jest.Mock).mockResolvedValue({
        id: 'drv-1',
        user_id: 'usr-1',
        booking_groups: [{ id: 'grp-1', status: 'open' }],
      })

      await expect(DriverService.delete('drv-1')).rejects.toThrow(
        'Driver tidak dapat dihapus karena sedang ditugaskan pada grup armada aktif.'
      )
    })

    it('should delete driver when no active trips exist', async () => {
      ;(prisma.driver.findUnique as jest.Mock).mockResolvedValue({
        id: 'drv-1',
        user_id: 'usr-1',
        booking_groups: [],
      })
      ;(prisma.trip.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.vehicle.updateMany as jest.Mock).mockResolvedValue({ count: 1 })
      ;(prisma.driver.delete as jest.Mock).mockResolvedValue({ id: 'drv-1' })

      const result = await DriverService.delete('drv-1')
      expect(result.deleted).toBe(true)
      expect(prisma.driver.delete).toHaveBeenCalledWith({ where: { id: '1' } })
    })
  })
})
