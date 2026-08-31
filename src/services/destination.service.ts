import { Prisma } from '@prisma/client'
import { prisma } from '../config/database'
import { ApiError } from '../utils/errors'

export class DestinationService {
  static create(data: {
    name: string
    description?: string
    image_url?: string
    price_per_person: number
    duration_days?: number
    itinerary?: Prisma.InputJsonValue
    is_active?: boolean
  }) {
    return prisma.destination.create({ data })
  }

  static list() {
    return prisma.destination.findMany({ where: { is_active: true }, orderBy: { created_at: 'desc' } })
  }

  static adminList(filters: { is_active?: boolean }) {
    return prisma.destination.findMany({
      where: { ...(filters.is_active !== undefined && { is_active: filters.is_active }) },
      orderBy: { created_at: 'desc' },
    })
  }

  static get(id: number) {
    return prisma.destination.findUnique({ where: { id }, include: { trips: true } })
  }

  static async update(id: number, data: Record<string, unknown>) {
    const destination = await this.get(id)
    if (!destination) throw new ApiError('Destination not found', 404)

    return prisma.destination.update({ where: { id }, data: data as never })
  }

  static async delete(id: number) {
    const destination = await this.get(id)
    if (!destination) throw new ApiError('Destination not found', 404)
    if (destination.trips.length > 0) throw new ApiError('Destination has trips and cannot be deleted', 400)

    await prisma.destination.delete({ where: { id } })
  }
}
