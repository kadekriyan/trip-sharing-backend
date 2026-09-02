import { AdminService } from '../../src/services/admin.service'
import { prisma } from '../../src/config/database'

jest.mock('../../src/config/database', () => ({
  prisma: {
    payment: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    trip: {
      count: jest.fn(),
    },
    bookingGroup: {
      findMany: jest.fn(),
    },
    participant: {
      count: jest.fn(),
    },
    auditLog: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

describe('AdminService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getMetrics', () => {
    it('should calculate revenue, active trips, occupancy rate, and participant counts correctly', async () => {
      ;(prisma.payment.findMany as jest.Mock).mockResolvedValue([
        { amount: 850000, created_at: new Date() },
        { amount: 1250000, created_at: new Date() },
      ])
      ;(prisma.trip.count as jest.Mock).mockResolvedValue(14)
      ;(prisma.bookingGroup.findMany as jest.Mock).mockResolvedValue([
        { current_participants: 4, max_participants: 6, status: 'open' },
        { current_participants: 6, max_participants: 6, status: 'full' },
      ])
      ;(prisma.participant.count as jest.Mock).mockResolvedValue(84)
      ;(prisma.payment.count as jest.Mock).mockResolvedValue(5)

      const metrics = await AdminService.getMetrics()

      expect(metrics.totalRevenue).toBe(2100000)
      expect(metrics.activeTripsCount).toBe(14)
      expect(metrics.availableSeats).toBe(2)
      expect(metrics.averageOccupancyRate).toBe(83.3)
      expect(metrics.totalParticipants).toBe(84)
      expect(metrics.pendingPaymentsCount).toBe(5)
    })
  })

  describe('getAuditLogs', () => {
    it('should return paginated audit logs with formatted structure', async () => {
      ;(prisma.auditLog.count as jest.Mock).mockResolvedValue(1)
      ;(prisma.auditLog.findMany as jest.Mock).mockResolvedValue([
        {
          id: 1,
          action: 'MOVE_PARTICIPANT',
          entity_type: 'BookingGroup',
          entity_id: 2,
          new_values: { details: 'Moved participant from group 1 to group 2' },
          ip_address: '180.252.164.12',
          created_at: new Date('2026-08-31T12:30:00.000Z'),
          user: { id: 1, email: 'admin@tripsharing.id', name: 'Admin', role: 'admin' },
        },
      ])

      const result = await AdminService.getAuditLogs(1, 10)

      expect(result.data).toHaveLength(1)
      expect(result.data[0].id).toBe('log-1')
      expect(result.data[0].adminEmail).toBe('admin@tripsharing.id')
      expect(result.data[0].targetResource).toBe('BookingGroup')
      expect(result.meta.total).toBe(1)
      expect(result.meta.totalPages).toBe(1)
    })
  })
})
