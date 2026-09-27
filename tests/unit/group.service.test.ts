import { Prisma } from '@prisma/client'
import { GroupService } from '../../src/services/group.service'
import { prisma } from '../../src/config/database'

jest.mock('../../src/config/database', () => ({
  prisma: {
    bookingGroup: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    trip: {
      findUnique: jest.fn(),
    },
    driver: {
      findUnique: jest.fn(),
    },
    vehicle: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}))

describe('GroupService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('list', () => {
    it('should return formatted list of groups with relations', async () => {
      const mockRawGroups = [
        {
          id: 'grp-1',
          trip_id: 'trip-1',
          driver_id: 'drv-1',
          group_number: 1,
          status: 'open',
          current_participants: 2,
          max_participants: 6,
          price_per_person: new Prisma.Decimal(750000),
          total_price: new Prisma.Decimal(4500000),
          created_at: new Date('2026-09-01'),
          updated_at: new Date('2026-09-01'),
          trip: {
            id: 'trip-1',
            destination_id: 'dest-1',
            departure_date: new Date('2026-10-01'),
            return_date: new Date('2026-10-03'),
            status: 'active',
            destination: {
              id: 'dest-1',
              name: 'Bromo Sunrise',
              slug: 'bromo-sunrise',
              location: 'Malang',
              cover_image: 'https://img.jpg',
            },
          },
          driver: {
            id: 'drv-1',
            user_id: 'usr-drv-1',
            license_number: 'SIM-123',
            vehicle_type: 'Toyota HiAce',
            vehicle_plat: 'N 1234 XY',
            rating: new Prisma.Decimal(4.8),
            is_available: true,
            user: {
              id: 'usr-drv-1',
              name: 'Pak Budi',
              email: 'budi@driver.local',
              phone: '+62812345678',
              profile_image_url: null,
            },
          },
          participants: [
            {
              id: 'part-1',
              booking_code: 'TRV-1111',
              full_name: 'Jane Doe',
              phone_number: '+6281111',
              payment_status: 'paid',
              check_in_status: 'pending',
              user: { id: 'usr-1', name: 'Jane Doe', email: 'jane@local', phone: '+6281111' },
              payment: { id: 'pay-1', amount: 750000, status: 'completed' },
            },
          ],
        },
      ]

      ;(prisma.bookingGroup.findMany as jest.Mock).mockResolvedValue(mockRawGroups)

      const result = await GroupService.list({ tripId: 'trip-1' })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('grp-1')
      expect(result[0].groupNumber).toBe(1)
      expect(result[0].driver?.fullName).toBe('Pak Budi')
      expect(result[0].driver?.plateNumber).toBe('N 1234 XY')
      expect(result[0].trip?.destination?.name).toBe('Bromo Sunrise')
      expect(result[0].participants).toHaveLength(1)
    })
  })

  describe('get', () => {
    it('should throw 404 when group is not found', async () => {
      ;(prisma.bookingGroup.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(GroupService.get('grp-999')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Booking group not found',
      })
    })

    it('should return group details when found', async () => {
      const mockRawGroup = {
        id: 'grp-1',
        trip_id: 'trip-1',
        driver_id: null,
        group_number: 1,
        status: 'open',
        current_participants: 0,
        max_participants: 6,
        price_per_person: new Prisma.Decimal(500000),
        total_price: new Prisma.Decimal(3000000),
        created_at: new Date(),
        updated_at: new Date(),
        trip: null,
        driver: null,
        participants: [],
      }

      ;(prisma.bookingGroup.findUnique as jest.Mock).mockResolvedValue(mockRawGroup)

      const result = await GroupService.get('grp-1')
      expect(result.id).toBe('grp-1')
      expect(result.driverId).toBeNull()
      expect(result.driver).toBeNull()
    })
  })

  describe('create', () => {
    it('should create group and calculate total price', async () => {
      const mockTrip = {
        id: 'trip-1',
        destination: { price_per_person: new Prisma.Decimal(600000) },
      }
      ;(prisma.trip.findUnique as jest.Mock).mockResolvedValue(mockTrip)
      ;(prisma.bookingGroup.findFirst as jest.Mock).mockResolvedValue({ group_number: 1 })
      ;(prisma.bookingGroup.create as jest.Mock).mockResolvedValue({
        id: 'grp-2',
        trip_id: 'trip-1',
        driver_id: null,
        group_number: 2,
        status: 'open',
        current_participants: 0,
        max_participants: 6,
        price_per_person: new Prisma.Decimal(600000),
        total_price: new Prisma.Decimal(3600000),
        created_at: new Date(),
        updated_at: new Date(),
        trip: { destination: { name: 'Ijen Crater' } },
        driver: null,
        participants: [],
      })

      const result = await GroupService.create({ tripId: 'trip-1' }, 'admin-1')

      expect(prisma.bookingGroup.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          trip_id: '1',
          group_number: 2,
          status: 'open',
          max_participants: 6,
        }),
        include: expect.any(Object),
      })
      expect(result.groupNumber).toBe(2)
      expect(prisma.auditLog.create).toHaveBeenCalled()
    })

    it('should throw 404 if driverId is invalid', async () => {
      ;(prisma.trip.findUnique as jest.Mock).mockResolvedValue({
        id: 'trip-1',
        destination: { price_per_person: 500000 },
      })
      ;(prisma.driver.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        GroupService.create({ tripId: 'trip-1', driverId: 'drv-invalid' })
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Driver not found',
      })
    })
  })

  describe('assignDriver', () => {
    it('should assign valid driver to group', async () => {
      const mockExistingGroup = {
        id: 'grp-1',
        driver_id: null,
        driver: null,
      }
      const mockDriver = {
        id: 'drv-1',
        user_id: 'usr-1',
        user: { name: 'Pak Joko', email: 'joko@driver.local' },
      }

      ;(prisma.bookingGroup.findUnique as jest.Mock).mockResolvedValue(mockExistingGroup)
      ;(prisma.driver.findUnique as jest.Mock).mockResolvedValue(mockDriver)
      ;(prisma.bookingGroup.update as jest.Mock).mockResolvedValue({
        id: 'grp-1',
        trip_id: 'trip-1',
        driver_id: 'drv-1',
        group_number: 1,
        status: 'open',
        current_participants: 0,
        max_participants: 6,
        price_per_person: new Prisma.Decimal(500000),
        total_price: new Prisma.Decimal(3000000),
        created_at: new Date(),
        updated_at: new Date(),
        driver: mockDriver,
        trip: null,
        participants: [],
      })

      const result = await GroupService.assignDriver('grp-1', { driverId: 'drv-1' }, 'admin-1')

      expect(prisma.bookingGroup.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { driver_id: '1' },
        include: expect.any(Object),
      })
      expect(result.driverId).toBe('drv-1')
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'ASSIGN_DRIVER_TO_GROUP',
          }),
        })
      )
    })

    it('should throw 400 when assigning a driver who is inactive/on leave on trip departure date', async () => {
      const mockExistingGroup = {
        id: 'grp-1',
        driver_id: null,
        trip: {
          id: 'trip-10',
          departure_date: new Date('2026-10-03'),
        },
      }
      const mockDriverOnLeave = {
        id: 'drv-leave',
        license_number: 'SIM-999',
        status: 'active',
        is_available: true,
        inactive_start_date: new Date('2026-10-01'),
        inactive_end_date: new Date('2026-10-05'),
        user: { name: 'Driver Sedang Cuti' },
      }

      ;(prisma.bookingGroup.findUnique as jest.Mock).mockResolvedValue(mockExistingGroup)
      ;(prisma.driver.findUnique as jest.Mock).mockResolvedValue(mockDriverOnLeave)

      await expect(
        GroupService.assignDriver('grp-1', { driverId: 'drv-leave' }, 'admin-1')
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('tidak aktif pada tanggal trip'),
      })
      expect(prisma.bookingGroup.update).not.toHaveBeenCalled()
    })

    it('should unassign driver when driverId is null', async () => {
      const mockExistingGroup = {
        id: 'grp-1',
        driver_id: 'drv-1',
      }
      ;(prisma.bookingGroup.findUnique as jest.Mock).mockResolvedValue(mockExistingGroup)
      ;(prisma.bookingGroup.update as jest.Mock).mockResolvedValue({
        id: 'grp-1',
        trip_id: 'trip-1',
        driver_id: null,
        group_number: 1,
        status: 'open',
        current_participants: 0,
        max_participants: 6,
        price_per_person: new Prisma.Decimal(500000),
        total_price: new Prisma.Decimal(3000000),
        created_at: new Date(),
        updated_at: new Date(),
        driver: null,
        trip: null,
        participants: [],
      })

      const result = await GroupService.assignDriver('grp-1', { driverId: null }, 'admin-1')

      expect(prisma.bookingGroup.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { driver_id: null },
        include: expect.any(Object),
      })
      expect(result.driverId).toBeNull()
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'UNASSIGN_DRIVER_FROM_GROUP',
          }),
        })
      )
    })
  })

  describe('assignVehicle', () => {
    it('should assign valid vehicle to group', async () => {
      const mockExistingGroup = {
        id: 'grp-1',
        vehicle_id: null,
        vehicle: null,
      }
      const mockVehicle = {
        id: 'veh-1',
        name: 'Toyota HiAce Premio',
        plate_number: 'N 1234 XY',
        vehicle_type: 'Minivan',
        capacity: 6,
        status: 'active',
        is_available: true,
      }

      ;(prisma.bookingGroup.findUnique as jest.Mock).mockResolvedValue(mockExistingGroup)
      ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue(mockVehicle)
      ;(prisma.bookingGroup.update as jest.Mock).mockResolvedValue({
        id: 'grp-1',
        trip_id: 'trip-1',
        driver_id: null,
        vehicle_id: 'veh-1',
        group_number: 1,
        status: 'open',
        current_participants: 0,
        max_participants: 6,
        price_per_person: new Prisma.Decimal(500000),
        total_price: new Prisma.Decimal(3000000),
        created_at: new Date(),
        updated_at: new Date(),
        vehicle: mockVehicle,
        driver: null,
        trip: null,
        participants: [],
      })

      const result = await GroupService.assignVehicle('grp-1', { vehicleId: 'veh-1' }, 'admin-1')

      expect(prisma.bookingGroup.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { vehicle_id: '1' },
        include: expect.any(Object),
      })
      expect(result.vehicleId).toBe('veh-1')
      expect(result.vehicle?.name).toBe('Toyota HiAce Premio')
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'ASSIGN_VEHICLE_TO_GROUP',
          }),
        })
      )
    })

    it('should unassign vehicle when vehicleId is null', async () => {
      const mockExistingGroup = {
        id: 'grp-1',
        vehicle_id: 'veh-1',
      }
      ;(prisma.bookingGroup.findUnique as jest.Mock).mockResolvedValue(mockExistingGroup)
      ;(prisma.bookingGroup.update as jest.Mock).mockResolvedValue({
        id: 'grp-1',
        trip_id: 'trip-1',
        driver_id: null,
        vehicle_id: null,
        group_number: 1,
        status: 'open',
        current_participants: 0,
        max_participants: 6,
        price_per_person: new Prisma.Decimal(500000),
        total_price: new Prisma.Decimal(3000000),
        created_at: new Date(),
        updated_at: new Date(),
        vehicle: null,
        driver: null,
        trip: null,
        participants: [],
      })

      const result = await GroupService.assignVehicle('grp-1', { vehicleId: null }, 'admin-1')

      expect(prisma.bookingGroup.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { vehicle_id: null },
        include: expect.any(Object),
      })
      expect(result.vehicleId).toBeNull()
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'UNASSIGN_VEHICLE_FROM_GROUP',
          }),
        })
      )
    })
  })

  describe('delete', () => {
    it('should throw 400 if group has active participants', async () => {
      ;(prisma.bookingGroup.findUnique as jest.Mock).mockResolvedValue({
        id: 'grp-1',
        current_participants: 2,
        participants: [{ id: 'part-1' }, { id: 'part-2' }],
      })

      await expect(GroupService.delete('grp-1')).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('Cannot delete booking group with existing participants'),
      })
    })

    it('should delete empty group successfully', async () => {
      ;(prisma.bookingGroup.findUnique as jest.Mock).mockResolvedValue({
        id: 'grp-1',
        current_participants: 0,
        participants: [],
      })
      ;(prisma.bookingGroup.delete as jest.Mock).mockResolvedValue({ id: 'grp-1' })

      const result = await GroupService.delete('grp-1', 'admin-1')
      expect(result.deleted).toBe(true)
      expect(prisma.bookingGroup.delete).toHaveBeenCalledWith({ where: { id: '1' } })
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'DELETE_BOOKING_GROUP',
          }),
        })
      )
    })
  })

  describe('getManifest', () => {
    it('should throw 404 if booking group not found', async () => {
      ;(prisma.bookingGroup.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(GroupService.getManifest('grp-non-existent')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Booking group not found',
      })
    })

    it('should return passenger manifest with formatted group and participants including packageType', async () => {
      const mockManifestGroup = {
        id: 'grp-manifest-1',
        group_number: 1,
        trip_id: 'trip-1',
        status: 'open',
        current_participants: 2,
        max_participants: 6,
        price_per_person: new Prisma.Decimal(500000),
        total_price: new Prisma.Decimal(3000000),
        departure_date: new Date('2026-10-10'),
        return_date: new Date('2026-10-12'),
        created_at: new Date('2026-09-01'),
        updated_at: new Date('2026-09-01'),
        trip: {
          id: 'trip-1',
          departure_date: new Date('2026-10-10'),
          return_date: new Date('2026-10-12'),
          destination: {
            id: 'dest-bromo',
            name: 'Bromo Sunrise Tour',
            slug: 'bromo-sunrise-tour',
            location: 'East Java',
          },
        },
        driver: {
          id: 'drv-1',
          user: { name: 'Pak Supir', phone: '08123456789' },
          vehicle: { brand: 'Toyota', model: 'HiAce', plate_number: 'N 1234 AB' },
        },
        vehicle: { id: 'veh-1', name: 'HiAce Commuter', plate_number: 'N 1234 AB' },
        participants: [
          {
            id: 'part-1',
            booking_code: 'TRV-1001',
            full_name: 'Traveler All In',
            phone_number: '0811111111',
            package_type: 'ALL_IN',
            payment_status: 'paid',
            total_amount: new Prisma.Decimal(500000),
            created_at: new Date('2026-09-02'),
            user: { email: 'allin@example.com' },
            payment: { id: 'pay-1', status: 'completed', amount: new Prisma.Decimal(500000) },
          },
          {
            id: 'part-2',
            booking_code: 'TRV-1002',
            full_name: 'Traveler Transport Only',
            phone_number: '0822222222',
            package_type: 'TRANSPORT_ONLY',
            payment_status: 'paid',
            total_amount: new Prisma.Decimal(300000),
            created_at: new Date('2026-09-03'),
            user: { email: 'transport@example.com' },
            payment: { id: 'pay-2', status: 'completed', amount: new Prisma.Decimal(300000) },
          },
        ],
      }

      ;(prisma.bookingGroup.findUnique as jest.Mock).mockResolvedValue(mockManifestGroup)

      const result = await GroupService.getManifest('grp-manifest-1')

      expect(result.manifestNumber).toContain('MNF-BROMO-SUNRISE-TOUR-GRP1')
      expect(result.generatedAt).toBeDefined()
      expect(result.group.participants).toHaveLength(2)
      expect(result.group.participants[0].packageType).toBe('ALL_IN')
      expect(result.group.participants[1].packageType).toBe('TRANSPORT_ONLY')
    })
  })
})
