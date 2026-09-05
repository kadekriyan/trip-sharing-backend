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
})
