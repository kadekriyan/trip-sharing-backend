import { prisma } from '../config/database'
import { ApiError } from '../utils/errors'

export class TripService {
  static async create(data: {
    destination_id: number
    departure_date: Date
    return_date?: Date
    guide_id?: number
    max_participants?: number
    status?: string
    notes?: string
  }) {
    const destination = await prisma.destination.findUnique({ where: { id: data.destination_id } })
    if (!destination) throw new ApiError('Destination not found', 404)

    if (data.guide_id) {
      const guide = await prisma.user.findUnique({ where: { id: data.guide_id } })
      if (!guide) throw new ApiError('Guide not found', 404)
    }

    return prisma.trip.create({ data: data as never })
  }

  static async list(filters: { destination_id?: number; status?: string }) {
    return prisma.trip.findMany({
      where: {
        ...(filters.destination_id && { destination_id: filters.destination_id }),
        ...(filters.status && { status: filters.status }),
      },
      include: { destination: true, guide: true, booking_groups: true },
      orderBy: { departure_date: 'asc' },
    })
  }

  static async get(id: number) {
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { destination: true, guide: true, booking_groups: { include: { participants: true } } },
    })
    if (!trip) throw new ApiError('Trip not found', 404)
    return trip
  }

  static async update(id: number, data: Record<string, unknown>) {
    await this.get(id)
    return prisma.trip.update({ where: { id }, data: data as never })
  }

  static async delete(id: number) {
    const trip = await this.get(id)
    if (trip.booking_groups.some((group) => group.current_participants > 0)) {
      throw new ApiError('Trip has participants and cannot be deleted', 400)
    }

    await prisma.trip.delete({ where: { id } })
  }
}
