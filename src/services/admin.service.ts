import { prisma } from '../config/database'

export class AdminService {
  static async getMetrics() {
    // 1. Total Revenue
    const completedPayments = await prisma.payment.findMany({
      where: { status: 'completed' },
      select: { amount: true, created_at: true },
    })
    const totalRevenue = completedPayments.reduce((acc, p) => acc + Number(p.amount), 0)

    // Revenue growth (this month vs last month)
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const thisMonthRev = completedPayments
      .filter((p) => p.created_at >= thisMonthStart)
      .reduce((acc, p) => acc + Number(p.amount), 0)
    const lastMonthRev = completedPayments
      .filter((p) => p.created_at >= lastMonthStart && p.created_at < thisMonthStart)
      .reduce((acc, p) => acc + Number(p.amount), 0)

    const revenueGrowthPercentage =
      lastMonthRev > 0
        ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 1000) / 10
        : thisMonthRev > 0
          ? 100
          : 0

    // 2. Active Trips Count
    const activeTripsCount = await prisma.trip.count({
      where: { status: { in: ['planning', 'active', 'scheduled'] } },
    })

    // 3. Occupancy Rate & Available Seats
    const openGroups = await prisma.bookingGroup.findMany({
      where: { status: { in: ['open', 'waiting', 'full'] } },
      select: { current_participants: true, max_participants: true, status: true },
    })

    const totalCapacity = openGroups.reduce((acc, g) => acc + g.max_participants, 0)
    const totalOccupied = openGroups.reduce((acc, g) => acc + g.current_participants, 0)
    const averageOccupancyRate =
      totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 1000) / 10 : 0

    const availableSeats = openGroups
      .filter((g) => g.status === 'open')
      .reduce((acc, g) => acc + Math.max(0, g.max_participants - g.current_participants), 0)

    // 4. Participants & Bookings
    const totalParticipants = await prisma.participant.count({
      where: { payment_status: { not: 'cancelled' } },
    })
    const totalBookings = await prisma.participant.count()

    // 5. Pending Payments
    const pendingPaymentsCount = await prisma.payment.count({
      where: { status: 'pending' },
    })

    return {
      totalRevenue,
      revenueGrowthPercentage,
      activeTripsCount,
      averageOccupancyRate,
      totalParticipants,
      totalBookings,
      availableSeats,
      pendingPaymentsCount,
    }
  }

  static async getAuditLogs(page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [total, logs] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        include: { user: { select: { id: true, email: true, name: true, role: true } } },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
    ])

    const formattedLogs = logs.map((log) => ({
      id: `log-${log.id}`,
      adminEmail: log.user?.email || 'system@tripsharing.id',
      action: log.action,
      targetResource: log.entity_type,
      targetId: log.entity_id ? `res-${log.entity_id}` : undefined,
      details:
        typeof log.new_values === 'string'
          ? log.new_values
          : log.new_values
            ? JSON.stringify(log.new_values)
            : log.action,
      ipAddress: log.ip_address || '127.0.0.1',
      createdAt: log.created_at,
    }))

    return {
      data: formattedLogs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    }
  }
}
