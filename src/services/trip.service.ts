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
    const cleanId = id.replace(/^trip-/, '')
    const trip = await prisma.trip.findUnique({
      where: { id: cleanId },
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

  static async update(
    id: string,
    data: {
      destination_id?: string
      destinationId?: string
      departure_date?: Date | string
      departureDate?: Date | string
      return_date?: Date | string | null
      returnDate?: Date | string | null
      guide_id?: string | null
      guideId?: string | null
      max_participants?: number
      maxParticipants?: number
      status?: string
      notes?: string | null
      [key: string]: unknown
    }
  ) {
    const cleanId = id.replace(/^trip-/, '')
    await this.get(cleanId)

    const updateData: Record<string, unknown> = {}

    const destinationId = (data.destination_id ?? data.destinationId) as string | undefined
    if (destinationId !== undefined) {
      const destination = await prisma.destination.findUnique({ where: { id: destinationId } })
      if (!destination) throw new ApiError('Destination not found', 404)
      updateData.destination_id = destinationId
    }

    const rawDeparture = data.departure_date ?? data.departureDate
    if (rawDeparture !== undefined) {
      const departureDate = new Date(rawDeparture as string | number | Date)
      if (isNaN(departureDate.getTime())) {
        throw new ApiError('Invalid departure date', 400)
      }
      updateData.departure_date = departureDate
    }

    if (data.return_date !== undefined || data.returnDate !== undefined) {
      const rawReturn = data.return_date !== undefined ? data.return_date : data.returnDate
      if (rawReturn === null || rawReturn === '') {
        updateData.return_date = null
      } else {
        const returnDate = new Date(rawReturn as string | number | Date)
        if (isNaN(returnDate.getTime())) {
          throw new ApiError('Invalid return date', 400)
        }
        updateData.return_date = returnDate
      }
    }

    if (data.guide_id !== undefined || data.guideId !== undefined) {
      const rawGuide = (data.guide_id !== undefined ? data.guide_id : data.guideId) as string | null
      if (rawGuide === null || rawGuide === '') {
        updateData.guide_id = null
      } else {
        const guide = await prisma.user.findUnique({ where: { id: rawGuide } })
        if (!guide) throw new ApiError('Guide not found', 404)
        updateData.guide_id = rawGuide
      }
    }

    const rawMax = data.max_participants ?? data.maxParticipants
    if (rawMax !== undefined) {
      updateData.max_participants = Number(rawMax)
    }

    if (data.status !== undefined) {
      updateData.status = String(data.status)
    }

    if (data.notes !== undefined) {
      updateData.notes = data.notes === null ? null : String(data.notes)
    }

    return prisma.trip.update({
      where: { id: cleanId },
      data: updateData,
      include: { destination: true, guide: true, booking_groups: true },
    })
  }

  static async delete(id: string) {
    const cleanId = id.replace(/^trip-/, '')
    const trip = await this.get(cleanId)
    const totalGroupParticipants = trip.booking_groups.reduce(
      (sum, group) => sum + (group.current_participants || 0),
      0
    )
    const activeParticipants = Math.max(totalGroupParticipants, trip.current_participants || 0)

    if (activeParticipants > 0) {
      throw new ApiError(
        `Jadwal trip tidak dapat dihapus karena masih memiliki ${activeParticipants} peserta terdaftar. Silakan batalkan atau pindahkan peserta terlebih dahulu ke jadwal trip lain sebelum menghapus.`,
        400
      )
    }

    await prisma.trip.delete({ where: { id: cleanId } })
  }
}
