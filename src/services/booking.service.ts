import { Prisma } from '@prisma/client'
import { prisma } from '../config/database'
import { ApiError } from '../utils/errors'

function cleanId(val: unknown): string {
  if (typeof val === 'string') {
    return val.replace(/^(part-|grp-|trip-|dest-|usr-|pay-)/, '')
  }
  return String(val || '')
}

export class BookingService {
  static async getOrCreateBookingGroup(tripId: string, destinationPrice: Prisma.Decimal | number) {
    const cleanTripId = cleanId(tripId)
    const trip = await prisma.trip.findUnique({
      where: { id: cleanTripId },
      include: { booking_groups: { where: { status: 'open' }, orderBy: { group_number: 'asc' } } },
    })

    if (!trip) throw new ApiError('Trip not found', 404)

    const openGroup = trip.booking_groups[0]
    if (openGroup && openGroup.current_participants < openGroup.max_participants) return openGroup

    const lastGroup = await prisma.bookingGroup.findFirst({
      where: { trip_id: cleanTripId },
      orderBy: { group_number: 'desc' },
      select: { group_number: true },
    })

    return prisma.bookingGroup.create({
      data: {
        trip_id: cleanTripId,
        group_number: (lastGroup?.group_number || 0) + 1,
        status: 'open',
        price_per_person: destinationPrice,
        total_price: new Prisma.Decimal(destinationPrice.toString()).mul(6),
      },
    })
  }

  static async createBooking(
    userId: string | number | undefined,
    bookingData: {
      trip_id?: string
      tripId?: string
      destination_id?: string
      destinationId?: string
      full_name?: string
      fullName?: string
      email?: string
      phone_number?: string
      phoneNumber?: string
      country?: string
      nationality?: string
      date_of_birth?: Date | string
      identity_number?: string
      identityNumber?: string
      gender?: string
      room_preference?: string
      roomPreference?: string
      hotel_preference?: string
      passport_number?: string
      identity_type?: string
      room_type?: string
      health_notes?: string
      healthNotes?: string
      preferred_language?: string
      travel_insurance?: boolean
      hasInsurance?: boolean
    }
  ) {
    const rawTripId = bookingData.trip_id || bookingData.tripId
    if (!rawTripId) throw new ApiError('Trip ID is required', 400)
    const tripId = cleanId(rawTripId)

    const fullName = bookingData.full_name || bookingData.fullName || 'Traveler'
    const phoneNumber = bookingData.phone_number || bookingData.phoneNumber || ''
    const country = bookingData.country || bookingData.nationality || 'Indonesia'
    const nationality = bookingData.nationality || bookingData.country || 'Indonesia'
    const identityNumber = bookingData.identityNumber || bookingData.identity_number || null
    const gender = bookingData.gender || null
    const roomPreference =
      bookingData.roomPreference ||
      bookingData.room_preference ||
      bookingData.hotel_preference ||
      null
    const healthNotes = bookingData.healthNotes || bookingData.health_notes || null
    const hasInsurance = bookingData.hasInsurance ?? bookingData.travel_insurance ?? false
    const userEmail =
      bookingData.email || `${phoneNumber.replace(/[^0-9]/g, '') || Date.now()}@booking.local`

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { destination: true },
    })

    if (!trip) throw new ApiError('Trip not found', 404)

    const basePrice = Number(trip.destination.price_per_person)
    const insuranceFee = hasInsurance ? 50000 : 0
    const totalAmount = basePrice + insuranceFee

    const randomDigits = Math.floor(1000 + Math.random() * 9000)
    const bookingCode = `TRV-${randomDigits}`

    return prisma.$transaction(async (tx) => {
      let resolvedUserId = typeof userId === 'string' && userId ? cleanId(userId) : undefined
      if (!resolvedUserId || resolvedUserId === '0') {
        let user = await tx.user.findUnique({ where: { email: userEmail } })
        if (!user) {
          user = await tx.user.create({
            data: {
              email: userEmail,
              password: 'guest_booking',
              name: fullName,
              phone: phoneNumber,
              role: 'participant',
            },
          })
        }
        resolvedUserId = user.id
      }

      const bookingGroup = await this.getOrCreateBookingGroup(
        tripId,
        trip.destination.price_per_person
      )

      const participant = await tx.participant.create({
        data: {
          booking_group_id: bookingGroup.id,
          user_id: resolvedUserId,
          booking_code: bookingCode,
          full_name: fullName,
          phone_number: phoneNumber,
          country,
          nationality,
          identity_number: identityNumber,
          gender,
          date_of_birth: bookingData.date_of_birth
            ? new Date(bookingData.date_of_birth)
            : new Date(),
          room_preference: roomPreference,
          hotel_preference: roomPreference,
          passport_number: bookingData.passport_number,
          identity_type: bookingData.identity_type,
          room_type: bookingData.room_type,
          health_notes: healthNotes,
          preferred_language: bookingData.preferred_language,
          travel_insurance: hasInsurance,
          has_insurance: hasInsurance,
          insurance_fee: new Prisma.Decimal(insuranceFee.toString()),
          total_amount: new Prisma.Decimal(totalAmount.toString()),
          payment_status: 'pending',
          check_in_status: 'pending',
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
        where: { id: tripId },
        data: { current_participants: { increment: 1 } },
      })

      return {
        participant,
        groupOccupancy: {
          currentParticipants: updatedGroup.current_participants,
          capacity: updatedGroup.max_participants,
          isFull: updatedGroup.current_participants >= updatedGroup.max_participants,
        },
        bookingGroup: updatedGroup,
      }
    })
  }

  static async getAvailableGroups(destinationId: string, departureDate: string) {
    const cleanDestId = cleanId(destinationId)
    const date = new Date(departureDate)
    date.setHours(0, 0, 0, 0)

    return prisma.bookingGroup.findMany({
      where: {
        trip: {
          destination_id: cleanDestId,
          departure_date: { gte: date, lt: new Date(date.getTime() + 24 * 60 * 60 * 1000) },
        },
        status: { in: ['open', 'waiting'] },
      },
      include: { trip: { include: { destination: true } }, participants: true },
      orderBy: { group_number: 'asc' },
    })
  }

  static async getUserBookings(filter: { userId?: string; email?: string; bookingCode?: string }) {
    const where: Prisma.ParticipantWhereInput = {}
    if (filter.userId && filter.userId !== '0') {
      where.user_id = cleanId(filter.userId)
    } else if (filter.email || filter.bookingCode) {
      where.OR = [
        ...(filter.email ? [{ user: { email: filter.email } }] : []),
        ...(filter.bookingCode ? [{ booking_code: filter.bookingCode }] : []),
      ]
    } else {
      return []
    }

    const participants = await prisma.participant.findMany({
      where,
      include: {
        booking_group: {
          include: {
            trip: {
              include: {
                destination: true,
                guide: {
                  include: {
                    driver: true,
                  },
                },
              },
            },
          },
        },
        payment: true,
      },
      orderBy: { created_at: 'desc' },
    })

    return participants.map((p) => {
      const trip = p.booking_group.trip
      const dest = trip.destination
      const bookingCode = p.booking_code || `TRV-${p.id}`

      return {
        id: p.id,
        bookingCode,
        destination: {
          title: dest.name,
          slug: dest.slug || `destination-${dest.id}`,
          coverImage: dest.cover_image || dest.image_url || '',
          meetingPoint: dest.meeting_point || '',
        },
        trip: {
          id: trip.id,
          departureDate: trip.departure_date,
          returnDate: trip.return_date,
        },
        group: {
          id: p.booking_group.id,
          groupNumber: p.booking_group.group_number,
          capacity: p.booking_group.max_participants,
          currentParticipants: p.booking_group.current_participants,
          driver: trip.guide?.driver
            ? {
                fullName: trip.guide.name,
                phoneNumber: trip.guide.phone || '',
                vehicleModel: trip.guide.driver.vehicle_type,
                plateNumber: trip.guide.driver.vehicle_plat,
              }
            : {
                fullName: 'Budi Santoso',
                phoneNumber: '+6281233445566',
                vehicleModel: 'Toyota HiAce Commuter',
                plateNumber: 'N 1234 XY',
              },
        },
        totalAmount: p.total_amount
          ? Number(p.total_amount)
          : Number(p.booking_group.price_per_person),
        paymentStatus: p.payment_status,
        checkInStatus: p.check_in_status || (p.checked_in ? 'checked_in' : 'pending'),
        voucherQrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${bookingCode}`,
      }
    })
  }
}
