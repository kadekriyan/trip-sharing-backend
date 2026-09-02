import { prisma } from '../config/database'
import { ApiError } from '../utils/errors'

export class TripService {
  static async create(data: {
    destination_id?: string
    destinationId?: string
    departure_date?: Date | string
    departureDate?: Date | string
    return_date?: Date | string
    returnDate?: Date | string
    guide_id?: string
    guideId?: string
    max_participants?: number
    maxParticipants?: number
    status?: string
    notes?: string
  }) {
    const destinationId = data.destination_id || data.destinationId
    if (!destinationId) throw new ApiError('Destination ID is required', 400)

    const destination = await prisma.destination.findUnique({ where: { id: destinationId } })
    if (!destination) throw new ApiError('Destination not found', 404)

    const guideId = data.guide_id || data.guideId
    if (guideId) {
      const guide = await prisma.user.findUnique({ where: { id: guideId } })
      if (!guide) throw new ApiError('Guide not found', 404)
    }

    const departureDate = new Date(data.departure_date || data.departureDate || new Date())
    const returnDate =
      data.return_date || data.returnDate ? new Date(data.return_date || data.returnDate!) : null

    return prisma.trip.create({
      data: {
        destination_id: destinationId,
        departure_date: departureDate,
        return_date: returnDate,
        guide_id: guideId || null,
        max_participants: data.max_participants ?? data.maxParticipants ?? 6,
        status: data.status || 'planning',
        notes: data.notes || null,
      },
      include: { destination: true, guide: true },
    })
  }

  static async list(filters: { destination_id?: string; destinationId?: string; status?: string }) {
    const destinationId = filters.destination_id || filters.destinationId
    return prisma.trip.findMany({
      where: {
        ...(destinationId && { destination_id: destinationId }),
        ...(filters.status && { status: filters.status }),
      },
      include: { destination: true, guide: true, booking_groups: true },
      orderBy: { departure_date: 'asc' },
    })
  }

  static async get(id: string) {
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        destination: true,
        guide: true,
        booking_groups: { include: { participants: true } },
      },
    })
    if (!trip) throw new ApiError('Trip not found', 404)
    return trip
  }

  static async getAvailability(tripId: string) {
    const cleanId = tripId.replace(/^trip-/, '')
    const trip = await prisma.trip.findUnique({
      where: { id: cleanId },
      include: {
        booking_groups: {
          orderBy: { group_number: 'asc' },
        },
      },
    })
    if (!trip) throw new ApiError('Trip not found', 404)

    const groups = trip.booking_groups.map((g) => ({
      id: g.id,
      groupNumber: g.group_number,
      capacity: g.max_participants,
      currentParticipants: g.current_participants,
      availableSlots: Math.max(0, g.max_participants - g.current_participants),
      status: g.status,
      vehicleModel: 'Toyota HiAce (6-Seater VIP)',
    }))

    return {
      tripId: trip.id,
      departureDate: trip.departure_date,
      groups,
    }
  }

  static async update(id: string, data: Record<string, unknown>) {
    await this.get(id)
    return prisma.trip.update({ where: { id }, data: data as never })
  }

  static async delete(id: string) {
    const trip = await this.get(id)
    if (trip.booking_groups.some((group) => group.current_participants > 0)) {
      throw new ApiError('Trip has participants and cannot be deleted', 400)
    }

    await prisma.trip.delete({ where: { id } })
  }
}
