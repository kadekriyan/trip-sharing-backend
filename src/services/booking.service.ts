import { Prisma } from '@prisma/client'
import { prisma } from '../config/database'
import { CreateBookingInput } from '../types/booking'
import { ApiError } from '../utils/errors'

export class BookingService {
  static async getOrCreateBookingGroup(tripId: number, destinationPrice: Prisma.Decimal | number) {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { booking_groups: { where: { status: 'open' }, orderBy: { group_number: 'asc' } } },
    })

    if (!trip) throw new ApiError('Trip not found', 404)

    const openGroup = trip.booking_groups[0]
    if (openGroup && openGroup.current_participants < openGroup.max_participants) return openGroup

    const lastGroup = await prisma.bookingGroup.findFirst({
      where: { trip_id: tripId },
      orderBy: { group_number: 'desc' },
      select: { group_number: true },
    })

    return prisma.bookingGroup.create({
      data: {
        trip_id: tripId,
        group_number: (lastGroup?.group_number || 0) + 1,
        status: 'open',
        price_per_person: destinationPrice,
        total_price: new Prisma.Decimal(destinationPrice.toString()).mul(6),
      },
    })
  }

  static async createBooking(userId: number, bookingData: CreateBookingInput) {
    const trip = await prisma.trip.findUnique({
      where: { id: bookingData.trip_id },
      include: { destination: true },
    })

    if (!trip) throw new ApiError('Trip not found', 404)

    return prisma.$transaction(async (tx) => {
      const bookingGroup = await this.getOrCreateBookingGroup(
        bookingData.trip_id,
        trip.destination.price_per_person
      )

      const participant = await tx.participant.create({
        data: {
          booking_group_id: bookingGroup.id,
          user_id: userId,
          full_name: bookingData.full_name,
          phone_number: bookingData.phone_number,
          country: bookingData.country,
          date_of_birth: new Date(bookingData.date_of_birth),
          hotel_preference: bookingData.hotel_preference,
          passport_number: bookingData.passport_number,
          identity_type: bookingData.identity_type,
          room_type: bookingData.room_type,
          health_notes: bookingData.health_notes,
          preferred_language: bookingData.preferred_language,
          travel_insurance: bookingData.travel_insurance || false,
        },
      })

      const updatedGroup = await tx.bookingGroup.update({
        where: { id: bookingGroup.id },
        data: { current_participants: { increment: 1 } },
      })

      if (updatedGroup.current_participants >= updatedGroup.max_participants) {
        await tx.bookingGroup.update({ where: { id: bookingGroup.id }, data: { status: 'full' } })
      }

      await tx.trip.update({
        where: { id: bookingData.trip_id },
        data: { current_participants: { increment: 1 } },
      })

      return { participant, bookingGroup: updatedGroup }
    })
  }

  static async getAvailableGroups(destinationId: number, departureDate: string) {
    const date = new Date(departureDate)
    date.setHours(0, 0, 0, 0)

    return prisma.bookingGroup.findMany({
      where: {
        trip: {
          destination_id: destinationId,
          departure_date: { gte: date, lt: new Date(date.getTime() + 24 * 60 * 60 * 1000) },
        },
        status: { in: ['open', 'waiting'] },
      },
      include: { trip: { include: { destination: true } }, participants: true },
      orderBy: { group_number: 'asc' },
    })
  }

  static async getUserBookings(userId: number) {
    return prisma.participant.findMany({
      where: { user_id: userId },
      include: { booking_group: { include: { trip: { include: { destination: true } } } }, payment: true },
      orderBy: { created_at: 'desc' },
    })
  }
}
