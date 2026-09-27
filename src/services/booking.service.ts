import { Prisma } from '@prisma/client'
import { prisma } from '../config/database'
import { snap } from '../config/midtrans'
import { TelegramService } from './telegram.service'
import { logger } from '../utils/logger'
import { BookingItemInput, CreateBulkBookingInput } from '../types/booking'
import { ApiError } from '../utils/errors'
import {
  isGroupCompatibleWithMultipleTravelers,
  isGroupCompatibleWithTraveler,
} from '../utils/country-conflict'

function cleanId(val: unknown): string {
  if (typeof val === 'string') {
    return val.replace(/^(part-|grp-|trip-|dest-|usr-|pay-|blk-)/, '')
  }
  return String(val || '')
}

export class BookingService {
  static async resolveTrip(
    bookingData: {
      trip_id?: string
      tripId?: string
      destination_id?: string
      destinationId?: string
      departure_date?: Date | string
      departureDate?: Date | string
      return_date?: Date | string
      returnDate?: Date | string
      duration_days?: number
      durationDays?: number
    },
    tx: Prisma.TransactionClient = prisma
  ) {
    const rawTripId = bookingData.trip_id || bookingData.tripId
    const rawDestId = bookingData.destination_id || bookingData.destinationId
    const customDepartureDate = bookingData.departure_date || bookingData.departureDate
    const customReturnDate = bookingData.return_date || bookingData.returnDate

    if (!rawTripId && !rawDestId) {
      throw new ApiError('Trip ID or Destination ID is required', 400)
    }

    let trip = null

    // 1. Try finding by trip ID if provided and not a synthetic custom prefix
    if (rawTripId && !rawTripId.startsWith('custom-') && !rawTripId.startsWith('trip-custom-')) {
      trip = await tx.trip.findUnique({
        where: { id: cleanId(rawTripId) },
        include: { destination: true },
      })
    }

    // 2. If trip not found by ID or if custom schedule/trip is requested:
    if (!trip) {
      const destIdToSearch =
        rawDestId ||
        (rawTripId && !rawTripId.startsWith('custom-') && !rawTripId.startsWith('trip-custom-')
          ? rawTripId
          : undefined)

      let destination = null

      if (destIdToSearch) {
        destination = await tx.destination.findUnique({
          where: { id: cleanId(destIdToSearch) },
        })
      }

      // If still not found and rawTripId exists, attempt resolution via slug/name search
      if (!destination && rawTripId) {
        const cleanedSlug = rawTripId
          .replace(/^(custom-|trip-custom-|trip-)/, '')
          .replace(/-\d{8,}$/, '')
        destination = await tx.destination.findFirst({
          where: {
            OR: [
              { id: cleanId(rawTripId) },
              { slug: cleanedSlug },
              { name: { contains: cleanedSlug, mode: 'insensitive' } },
            ],
          },
        })
      }

      if (destination) {
        // If specific custom departure date is provided, check if a trip already exists on that date for this destination
        if (customDepartureDate) {
          const depDate = new Date(customDepartureDate)
          const startOfDay = new Date(depDate)
          startOfDay.setHours(0, 0, 0, 0)
          const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

          trip = await tx.trip.findFirst({
            where: {
              destination_id: destination.id,
              departure_date: { gte: startOfDay, lt: endOfDay },
              status: { in: ['active', 'scheduled', 'planning'] },
            },
            include: { destination: true },
          })
        }

        // If trip does not exist for this destination/custom date, auto-provision a new scheduled trip
        if (!trip) {
          const departureDate = customDepartureDate ? new Date(customDepartureDate) : new Date()
          if (!customDepartureDate) {
            departureDate.setDate(departureDate.getDate() + 7)
          }

          const returnDate = customReturnDate ? new Date(customReturnDate) : new Date(departureDate)
          if (!customReturnDate) {
            const durationDays =
              bookingData.duration_days ||
              bookingData.durationDays ||
              destination.duration_days ||
              1
            returnDate.setDate(returnDate.getDate() + durationDays)
          }

          trip = await tx.trip.create({
            data: {
              destination_id: destination.id,
              departure_date: departureDate,
              return_date: returnDate,
              status: 'scheduled',
              max_participants: destination.max_group_capacity || 6,
              current_participants: 0,
            },
            include: { destination: true },
          })
        }
      }
    }

    if (!trip) throw new ApiError('Trip or destination not found', 404)
    return trip
  }

  static async getOrCreateBookingGroup(
    tripId: string,
    destinationPrice: Prisma.Decimal | number,
    tx?: Prisma.TransactionClient,
    travelerNationalities?: string | string[],
    requestedPax: number = 1
  ) {
    const cleanTripId = cleanId(tripId)
    const tripClient = tx?.trip?.findUnique ? tx.trip : prisma.trip
    const groupClient = tx?.bookingGroup?.findFirst ? tx.bookingGroup : prisma.bookingGroup

    const trip = await tripClient.findUnique({
      where: { id: cleanTripId },
      include: {
        booking_groups: {
          where: { status: 'open' },
          include: {
            participants: {
              select: { nationality: true, country: true },
            },
          },
          orderBy: { group_number: 'asc' },
        },
      },
    })

    if (!trip) throw new ApiError('Trip not found', 404)

    const countries = Array.isArray(travelerNationalities)
      ? travelerNationalities
      : travelerNationalities !== undefined && travelerNationalities !== null
      ? [travelerNationalities]
      : []

    const openGroup = trip.booking_groups.find((g) => {
      if (g.current_participants + requestedPax > g.max_participants) {
        return false
      }
      if (countries.length > 0 && g.participants && g.participants.length > 0) {
        return isGroupCompatibleWithMultipleTravelers(g, countries, requestedPax)
      }
      return true
    })
    if (openGroup) return openGroup

    const lastGroup = await groupClient.findFirst({
      where: { trip_id: cleanTripId },
      orderBy: { group_number: 'desc' },
      select: { group_number: true },
    })

    return groupClient.create({
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
    bookingData: BookingItemInput
  ) {
    const trip = await this.resolveTrip(bookingData)
    const tripId = trip.id
    const fullName = bookingData.full_name || bookingData.fullName || bookingData.name || 'Traveler'
    const phoneNumber =
      bookingData.phone_number || bookingData.phoneNumber || bookingData.phone || ''
    const country = bookingData.country || bookingData.nationality || 'Indonesia'
    const nationality = bookingData.nationality || bookingData.country || 'Indonesia'
    const gender = bookingData.gender || null
    const healthNotes = bookingData.healthNotes || bookingData.health_notes || null
    const rawUserEmail =
      bookingData.email || `${phoneNumber.replace(/[^0-9]/g, '') || Date.now()}@booking.local`
    const userEmail = rawUserEmail.toLowerCase().trim()
    const rawPackageType = (bookingData.packageType || bookingData.package_type || 'ALL_IN').toUpperCase()
    const packageType = rawPackageType === 'TRANSPORT_ONLY' ? 'TRANSPORT_ONLY' : 'ALL_IN'

    const customPrice = bookingData.price_per_pax ?? bookingData.pricePerPax
    let pricePerPerson: number
    if (customPrice !== undefined && customPrice !== null) {
      pricePerPerson = Number(customPrice)
    } else if (packageType === 'TRANSPORT_ONLY') {
      const transportPrice = trip.destination.price_transport_only ? Number(trip.destination.price_transport_only) : 0
      pricePerPerson = transportPrice > 0 ? transportPrice : Number(trip.destination.price_per_person)
    } else {
      pricePerPerson = Number(trip.destination.price_per_person)
    }

    const totalAmount = pricePerPerson
    const randomDigits = Math.floor(1000 + Math.random() * 9000)
    const bookingCode = `TRV-${randomDigits}`

    const result = await prisma.$transaction(async (tx) => {
      let resolvedUserId = typeof userId === 'string' && userId ? cleanId(userId) : undefined
      if (!resolvedUserId || resolvedUserId === '0') {
        let user = await tx.user.findFirst({
          where: {
            email: { equals: userEmail, mode: 'insensitive' },
          },
        })
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

      let bookingGroup = null
      const rawGroupId = bookingData.booking_group_id || bookingData.bookingGroupId
      if (rawGroupId) {
        const cleanGroupId = cleanId(rawGroupId)
        const requestedGroup = await tx.bookingGroup.findUnique({
          where: { id: cleanGroupId },
          include: {
            participants: {
              select: { nationality: true, country: true },
            },
          },
        })
        if (
          requestedGroup &&
          requestedGroup.trip_id === tripId &&
          requestedGroup.current_participants < requestedGroup.max_participants &&
          isGroupCompatibleWithTraveler(requestedGroup, nationality || country, 1)
        ) {
          bookingGroup = requestedGroup
        }
      }

      if (!bookingGroup) {
        bookingGroup = await this.getOrCreateBookingGroup(
          tripId,
          pricePerPerson,
          tx,
          nationality || country,
          1
        )
      }

      const participant = await tx.participant.create({
        data: {
          booking_group_id: bookingGroup.id,
          user_id: resolvedUserId,
          booking_code: bookingCode,
          full_name: fullName,
          phone_number: phoneNumber,
          country,
          nationality,
          gender,
          date_of_birth:
            bookingData.date_of_birth || bookingData.dateOfBirth
              ? new Date(bookingData.date_of_birth || bookingData.dateOfBirth!)
              : null,
          health_notes: healthNotes,
          preferred_language: bookingData.preferred_language || bookingData.preferredLanguage,
          pickup_location: bookingData.pickup_location || bookingData.pickupLocation || null,
          pickup_latitude:
            bookingData.pickup_latitude !== undefined && bookingData.pickup_latitude !== null
              ? new Prisma.Decimal(bookingData.pickup_latitude.toString())
              : bookingData.pickupLatitude !== undefined && bookingData.pickupLatitude !== null
              ? new Prisma.Decimal(bookingData.pickupLatitude.toString())
              : null,
          pickup_longitude:
            bookingData.pickup_longitude !== undefined && bookingData.pickup_longitude !== null
              ? new Prisma.Decimal(bookingData.pickup_longitude.toString())
              : bookingData.pickupLongitude !== undefined && bookingData.pickupLongitude !== null
              ? new Prisma.Decimal(bookingData.pickupLongitude.toString())
              : null,
          pickup_notes: bookingData.pickup_notes || bookingData.pickupNotes || null,
          package_type: packageType,
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
    }, {
      maxWait: 10000,
      timeout: 30000,
    })

    // Dispatch asynchronous Telegram notification (non-blocking)
    TelegramService.sendNewBookingNotification({
      bookingCode: result.participant.booking_code,
      customerName: result.participant.full_name,
      customerPhone: result.participant.phone_number || undefined,
      customerEmail: userEmail,
      destinationName: trip.destination.name,
      tripDate: trip.departure_date,
      paxCount: 1,
      packageType,
      pickupLocation: bookingData.pickup_location || bookingData.pickupLocation || null,
      totalAmount,
      paymentStatus: 'PENDING',
    }).catch((err) => {
      logger.error('Failed to dispatch telegram new booking notification', err)
    })

    return result
  }

  static async createBulkBooking(
    userId: string | number | undefined,
    input: CreateBulkBookingInput
  ) {
    const bookings = input.bookings || []
    if (!Array.isArray(bookings) || bookings.length === 0) {
      throw new ApiError('Daftar pemesanan tidak boleh kosong', 400)
    }

    // 1. Resolve trips & validate capacity beforehand
    const tripBookingCountMap = new Map<string, number>()
    for (let i = 0; i < bookings.length; i++) {
      const b = bookings[i]
      const trip = await this.resolveTrip(b)
      const currentCount = tripBookingCountMap.get(trip.id) || 0
      tripBookingCountMap.set(trip.id, currentCount + 1)
    }

    // Check capacity for each trip
    for (const [tripId, count] of tripBookingCountMap.entries()) {
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: { destination: true },
      })
      if (!trip) throw new ApiError('Trip not found', 404)
      const maxCap = trip.max_participants || trip.destination.max_group_capacity || 6
      if (maxCap > 0 && trip.current_participants + count > maxCap) {
        throw new ApiError(
          `Kapasitas kursi trip "${trip.destination.name}" tidak mencukupi untuk ${count} peserta rombongan ini (Sisa kursi: ${Math.max(0, maxCap - trip.current_participants)}).`,
          409
        )
      }
    }

    const randomSuffix = Math.random().toString(36).substring(2, 10)
    const bulkBookingId = `blk-${Date.now().toString(36)}-${randomSuffix}`
    const orderId = `BULK-TRIP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`

    // 2. Run Database Transaction
    const transactionResult = await prisma.$transaction(async (tx) => {
      const createdItems: Array<{
        participant: Prisma.ParticipantGetPayload<{ include: { user: true } }>
        group: { id: string; group_number: number; trip_id: string }
        trip: Prisma.TripGetPayload<{ include: { destination: true } }>
        price: number
        email: string
      }> = []

      let totalAmount = 0

      for (let idx = 0; idx < bookings.length; idx++) {
        const b = bookings[idx]
        const trip = await this.resolveTrip(b, tx)

        const fullName = b.full_name || b.fullName || b.name || `Traveler ${idx + 1}`
        const phoneNumber = b.phone_number || b.phoneNumber || b.phone || ''
        const country = b.country || b.nationality || 'Indonesia'
        const nationality = b.nationality || b.country || 'Indonesia'
        const gender = b.gender || null
        const healthNotes = b.healthNotes || b.health_notes || null
        const rawUserEmail =
          b.email || `${phoneNumber.replace(/[^0-9]/g, '') || Date.now() + '-' + idx}@booking.local`
        const userEmail = rawUserEmail.toLowerCase().trim()

        const rawPackageType = (b.packageType || b.package_type || 'ALL_IN').toUpperCase()
        const packageType = rawPackageType === 'TRANSPORT_ONLY' ? 'TRANSPORT_ONLY' : 'ALL_IN'

        const customPrice = b.price_per_pax ?? b.pricePerPax
        let pricePerPerson: number
        if (customPrice !== undefined && customPrice !== null) {
          pricePerPerson = Number(customPrice)
        } else if (packageType === 'TRANSPORT_ONLY') {
          const transportPrice = trip.destination.price_transport_only ? Number(trip.destination.price_transport_only) : 0
          pricePerPerson = transportPrice > 0 ? transportPrice : Number(trip.destination.price_per_person)
        } else {
          pricePerPerson = Number(trip.destination.price_per_person)
        }

        totalAmount += pricePerPerson

        let resolvedUserId = typeof userId === 'string' && userId ? cleanId(userId) : undefined
        if (!resolvedUserId || resolvedUserId === '0') {
          let user = await tx.user.findFirst({
            where: {
              email: { equals: userEmail, mode: 'insensitive' },
            },
          })
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

        let bookingGroup = null
        const rawGroupId = b.booking_group_id || b.bookingGroupId
        if (rawGroupId) {
          const cleanGroupId = cleanId(rawGroupId)
          const requestedGroup = await tx.bookingGroup.findUnique({
            where: { id: cleanGroupId },
            include: {
              participants: {
                select: { nationality: true, country: true },
              },
            },
          })
          if (
            requestedGroup &&
            requestedGroup.trip_id === trip.id &&
            requestedGroup.current_participants < requestedGroup.max_participants &&
            isGroupCompatibleWithTraveler(requestedGroup, nationality || country, 1)
          ) {
            bookingGroup = requestedGroup
          }
        }

        if (!bookingGroup) {
          bookingGroup = await this.getOrCreateBookingGroup(
            trip.id,
            pricePerPerson,
            tx,
            nationality || country,
            1
          )
        }

        const randomDigits = Math.floor(1000 + Math.random() * 9000)
        const bookingCode = `TRV-${randomDigits}`

        const participant = await tx.participant.create({
          data: {
            booking_group_id: bookingGroup.id,
            user_id: resolvedUserId,
            booking_code: bookingCode,
            full_name: fullName,
            phone_number: phoneNumber,
            country,
            nationality,
            gender,
            date_of_birth:
              b.date_of_birth || b.dateOfBirth
                ? new Date(b.date_of_birth || b.dateOfBirth!)
                : null,
            health_notes: healthNotes,
            preferred_language: b.preferred_language || b.preferredLanguage,
            pickup_location: b.pickup_location || b.pickupLocation || null,
            pickup_latitude:
              b.pickup_latitude !== undefined && b.pickup_latitude !== null
                ? new Prisma.Decimal(b.pickup_latitude.toString())
                : b.pickupLatitude !== undefined && b.pickupLatitude !== null
                ? new Prisma.Decimal(b.pickupLatitude.toString())
                : null,
            pickup_longitude:
              b.pickup_longitude !== undefined && b.pickup_longitude !== null
                ? new Prisma.Decimal(b.pickup_longitude.toString())
                : b.pickupLongitude !== undefined && b.pickupLongitude !== null
                ? new Prisma.Decimal(b.pickupLongitude.toString())
                : null,
            pickup_notes: b.pickup_notes || b.pickupNotes || null,
            package_type: packageType,
            total_amount: new Prisma.Decimal(pricePerPerson.toString()),
            payment_status: 'pending',
            check_in_status: 'pending',
          },
          include: { user: true },
        })

        const updatedGroup = await tx.bookingGroup.update({
          where: { id: bookingGroup.id },
          data: { current_participants: { increment: 1 } },
        })

        if (updatedGroup.current_participants >= updatedGroup.max_participants) {
          await tx.bookingGroup.update({ where: { id: bookingGroup.id }, data: { status: 'full' } })
        }

        await tx.trip.update({
          where: { id: trip.id },
          data: { current_participants: { increment: 1 } },
        })

        createdItems.push({
          participant,
          group: { id: updatedGroup.id, group_number: updatedGroup.group_number, trip_id: trip.id },
          trip,
          price: pricePerPerson,
          email: userEmail,
        })
      }

      const firstItem = createdItems[0]

      const payment = await tx.payment.create({
        data: {
          participant_id: firstItem.participant.id,
          booking_group_id: firstItem.group.id,
          amount: new Prisma.Decimal(totalAmount.toString()),
          midtrans_order_id: orderId,
          status: 'pending',
          notes: JSON.stringify({
            bulkBookingId,
            participantIds: createdItems.map((c) => c.participant.id),
          }),
        },
      })

      return {
        bulkBookingId,
        orderId,
        totalAmount,
        createdItems,
        payment,
      }
    }, {
      maxWait: 15000,
      timeout: 60000,
    })

    // 3. Generate Aggregated Midtrans Snap Token
    let snapToken = `snap-token-${bulkBookingId}`
    let redirectUrl = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${snapToken}`

    try {
      const firstItem = transactionResult.createdItems[0]
      const snapTx = await snap.createTransaction({
        transaction_details: {
          order_id: transactionResult.orderId,
          gross_amount: Math.ceil(transactionResult.totalAmount),
        },
        customer_details: {
          first_name: firstItem.participant.full_name,
          email: firstItem.email,
          phone: firstItem.participant.phone_number,
        },
        item_details: transactionResult.createdItems.map((c, i) => ({
          id: `${c.trip.destination.id}-${i + 1}`,
          price: Math.ceil(c.price),
          quantity: 1,
          name: `${c.trip.destination.name} - ${c.participant.full_name}`.slice(0, 50),
        })),
      })

      if (snapTx && snapTx.token) {
        snapToken = snapTx.token
        redirectUrl = snapTx.redirect_url
      }
    } catch (snapErr) {
      console.warn('Midtrans snap transaction generation notice:', (snapErr as Error).message)
    }

    // Dispatch aggregated Telegram notification for bulk booking (non-blocking)
    const firstItem = transactionResult.createdItems[0]
    TelegramService.sendNewBookingNotification({
      bookingCode: transactionResult.createdItems.map((c) => c.participant.booking_code),
      customerName: firstItem.participant.full_name,
      customerPhone: firstItem.participant.phone_number || undefined,
      customerEmail: firstItem.email,
      destinationName: firstItem.trip.destination.name,
      tripDate: firstItem.trip.departure_date,
      paxCount: transactionResult.createdItems.length,
      packageType: firstItem.participant.package_type || 'ALL_IN',
      pickupLocation: firstItem.participant.pickup_location || null,
      totalAmount: transactionResult.totalAmount,
      paymentStatus: 'PENDING',
    }).catch((err) => {
      logger.error('Failed to dispatch telegram bulk booking notification', err)
    })

    return {
      bulkBookingId: transactionResult.bulkBookingId,
      totalAmount: transactionResult.totalAmount,
      paymentStatus: 'pending',
      participants: transactionResult.createdItems.map((c) => ({
        id: c.participant.id,
        bookingCode: c.participant.booking_code,
        tripId: c.trip.id,
        bookingGroupId: c.group.id,
        groupNumber: c.group.group_number,
        fullName: c.participant.full_name,
        email: c.email,
        price: c.price,
      })),
      payment: {
        id: transactionResult.payment.id,
        amount: transactionResult.totalAmount,
        snapToken,
        redirectUrl,
        orderId: transactionResult.orderId,
      },
    }
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
    const cleanUserId = filter.userId && filter.userId !== '0' ? cleanId(filter.userId) : undefined
    let userEmail = filter.email?.toLowerCase().trim()

    // If cleanUserId is given, also fetch the user's registered email to cross-match any guest booking records
    if (cleanUserId && !userEmail) {
      const userRec = await prisma.user.findUnique({
        where: { id: cleanUserId },
        select: { email: true },
      })
      if (userRec?.email) {
        userEmail = userRec.email.toLowerCase().trim()
      }
    }

    const conditions: Prisma.ParticipantWhereInput[] = []

    if (cleanUserId) {
      conditions.push({ user_id: cleanUserId })
    }
    if (userEmail) {
      conditions.push({
        user: {
          email: { equals: userEmail, mode: 'insensitive' },
        },
      })
    }
    if (filter.bookingCode) {
      conditions.push({
        booking_code: { equals: filter.bookingCode.trim(), mode: 'insensitive' },
      })
    }

    if (conditions.length === 0) {
      return []
    }

    const where: Prisma.ParticipantWhereInput = conditions.length === 1 ? conditions[0] : { OR: conditions }

    const participants = await prisma.participant.findMany({
      where,
      include: {
        user: true,
        booking_group: {
          include: {
            vehicle: true,
            driver: {
              include: {
                user: true,
                vehicle: true,
              },
            },
            trip: {
              include: {
                destination: true,
                guide: {
                  include: {
                    driver: {
                      include: {
                        vehicle: true,
                      },
                    },
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

    // Deduplicate by participant ID if matched across multiple OR conditions
    const seenIds = new Set<string>()
    const uniqueParticipants = participants.filter((p) => {
      if (seenIds.has(p.id)) return false
      seenIds.add(p.id)
      return true
    })

    return uniqueParticipants.map((p) => {
      const trip = p.booking_group.trip
      const dest = trip.destination
      const bookingCode = p.booking_code || `TRV-${p.id}`
      const groupVehicle = p.booking_group.vehicle || p.booking_group.driver?.vehicle || trip.guide?.driver?.vehicle || null
      const driverObj = p.booking_group.driver || trip.guide?.driver || null

      const resolvedFullName = p.full_name || p.user?.name || 'Traveler'
      const resolvedPhone = p.phone_number || p.user?.phone || ''
      const resolvedEmail = p.user?.email || (p.phone_number ? `${p.phone_number.replace(/[^0-9]/g, '')}@booking.local` : '')
      const resolvedNationality = p.nationality || p.country || 'Indonesia'

      return {
        id: p.id,
        bookingCode,
        fullName: resolvedFullName,
        name: resolvedFullName,
        email: resolvedEmail,
        phoneNumber: resolvedPhone,
        phone: resolvedPhone,
        nationality: resolvedNationality,
        country: resolvedNationality,
        dateOfBirth: p.date_of_birth,
        gender: p.gender,
        healthNotes: p.health_notes,
        preferredLanguage: p.preferred_language,
        pickupLocation: p.pickup_location,
        pickupLatitude: p.pickup_latitude ? Number(p.pickup_latitude) : null,
        pickupLongitude: p.pickup_longitude ? Number(p.pickup_longitude) : null,
        pickupNotes: p.pickup_notes,
        departureDate: trip.departure_date,
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
        user: p.user
          ? {
              id: p.user.id,
              fullName: p.user.name,
              email: p.user.email,
              phoneNumber: p.user.phone,
            }
          : null,
        group: {
          id: p.booking_group.id,
          groupNumber: p.booking_group.group_number,
          capacity: p.booking_group.max_participants,
          currentParticipants: p.booking_group.current_participants,
          driver: driverObj
            ? {
                fullName: p.booking_group.driver?.user?.name || trip.guide?.name || 'Driver',
                phoneNumber: p.booking_group.driver?.user?.phone || trip.guide?.phone || '',
                vehicleModel: groupVehicle?.name || groupVehicle?.vehicle_type || 'Toyota HiAce Premio',
                plateNumber: groupVehicle?.plate_number || 'N 1234 XY',
                vehicle: groupVehicle
                  ? {
                      id: groupVehicle.id,
                      name: groupVehicle.name,
                      plateNumber: groupVehicle.plate_number,
                      vehicleType: groupVehicle.vehicle_type,
                    }
                  : null,
              }
            : {
                fullName: 'Budi Santoso',
                phoneNumber: '+6281233445566',
                vehicleModel: 'Toyota HiAce Commuter',
                plateNumber: 'N 1234 XY',
                vehicle: null,
              },
          vehicle: groupVehicle
            ? {
                id: groupVehicle.id,
                name: groupVehicle.name,
                plateNumber: groupVehicle.plate_number,
                vehicleType: groupVehicle.vehicle_type,
                capacity: groupVehicle.capacity,
                transmission: groupVehicle.transmission,
                fuelType: groupVehicle.fuel_type,
                facility: groupVehicle.facility,
                coverImage: groupVehicle.cover_image,
                status: groupVehicle.status,
                isAvailable: groupVehicle.is_available,
              }
            : null,
        },
        packageType: p.package_type || 'ALL_IN',
        package_type: p.package_type || 'ALL_IN',
        totalAmount: p.total_amount
          ? Number(p.total_amount)
          : Number(p.booking_group.price_per_person),
        paymentStatus: p.payment_status,
        checkInStatus: p.check_in_status || (p.checked_in ? 'checked_in' : 'pending'),
        createdAt: p.created_at,
      }
    })
  }

  static async getInvoice(identifier: string, options?: { userId?: string; email?: string; isAdmin?: boolean }) {
    const isCleanId = identifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) || identifier.match(/^[a-z0-9_-]{10,}$/i)

    const participant = await prisma.participant.findFirst({
      where: {
        OR: [
          { booking_code: { equals: identifier, mode: 'insensitive' } },
          ...(isCleanId ? [{ id: cleanId(identifier) }] : []),
        ],
      },
      include: {
        user: true,
        payment: true,
        booking_group: {
          include: {
            vehicle: true,
            driver: {
              include: {
                user: true,
                vehicle: true,
              },
            },
            trip: {
              include: {
                destination: true,
                guide: {
                  include: {
                    driver: {
                      include: {
                        vehicle: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!participant) {
      throw new ApiError('Invoice or booking not found', 404)
    }

    // Access check if restricted by user credentials
    if (options?.userId && !options.isAdmin) {
      const isOwner =
        participant.user_id === options.userId ||
        (participant.user?.email &&
          options.email &&
          participant.user.email.toLowerCase() === options.email.toLowerCase())
      if (!isOwner && participant.booking_code?.toLowerCase() !== identifier.toLowerCase()) {
        throw new ApiError('Unauthorized to view this invoice', 403)
      }
    }

    const group = participant.booking_group
    const trip = group.trip
    const dest = trip.destination
    const payment = participant.payment
    const bookingCode = participant.booking_code || `TRV-${participant.id.slice(0, 8).toUpperCase()}`

    const dateStr = participant.created_at.toISOString().slice(0, 10).replace(/-/g, '')
    const invoiceNumber = `INV-${dateStr}-${bookingCode}`

    const totalAmount = participant.total_amount
      ? Number(participant.total_amount)
      : Number(group.price_per_person)
    const basePrice = totalAmount

    const invoiceStatus =
      participant.payment_status === 'paid'
        ? 'PAID'
        : participant.payment_status === 'cancelled'
        ? 'CANCELLED'
        : participant.payment_status === 'refunded'
        ? 'REFUNDED'
        : 'PENDING'

    const paidAt =
      payment?.completion_time || (participant.payment_status === 'paid' ? participant.updated_at : null)

    const resolvedVehicle = group.vehicle || group.driver?.vehicle || trip.guide?.driver?.vehicle || null

    const assignedDriver =
      group.driver?.user?.name
        ? {
            fullName: group.driver.user.name,
            phoneNumber: group.driver.user.phone || '',
            vehicleModel: resolvedVehicle?.name || resolvedVehicle?.vehicle_type || 'Toyota HiAce Premio',
            plateNumber: resolvedVehicle?.plate_number || 'N 1234 XY',
            vehicle: resolvedVehicle
              ? {
                  id: resolvedVehicle.id,
                  name: resolvedVehicle.name,
                  plateNumber: resolvedVehicle.plate_number,
                  vehicleType: resolvedVehicle.vehicle_type,
                }
              : null,
          }
        : trip.guide?.driver
        ? {
            fullName: trip.guide.name,
            phoneNumber: trip.guide.phone || '',
            vehicleModel: resolvedVehicle?.name || resolvedVehicle?.vehicle_type || 'Toyota HiAce Premio',
            plateNumber: resolvedVehicle?.plate_number || 'N 1234 XY',
            vehicle: resolvedVehicle
              ? {
                  id: resolvedVehicle.id,
                  name: resolvedVehicle.name,
                  plateNumber: resolvedVehicle.plate_number,
                  vehicleType: resolvedVehicle.vehicle_type,
                }
              : null,
          }
        : {
            fullName: 'Budi Santoso',
            phoneNumber: '+6281233445566',
            vehicleModel: 'Toyota HiAce Commuter',
            plateNumber: 'N 1234 XY',
            vehicle: null,
          }

    const items = [
      {
        itemNumber: 1,
        description: `Paket Trip Sharing - ${dest.name} (1 Pax)`,
        category: 'Trip Package',
        quantity: 1,
        unitPrice: basePrice,
        amount: basePrice,
      },
    ]

    const durationDays = dest.duration_days || 1
    const durationNights = dest.duration_nights || Math.max(0, durationDays - 1)
    const durationText = `${durationDays} Hari ${durationNights > 0 ? `${durationNights} Malam` : 'Day Trip'}`

    return {
      invoice: {
        invoiceNumber,
        invoiceDate: participant.created_at,
        dueDate: payment?.transaction_time || participant.created_at,
        paidAt,
        status: invoiceStatus,
        paymentStatus: participant.payment_status,
        checkInStatus: participant.check_in_status || (participant.checked_in ? 'checked_in' : 'pending'),
        bookingCode,
        packageType: participant.package_type || 'ALL_IN',
        package_type: participant.package_type || 'ALL_IN',
        participantId: participant.id,
        bookingGroupId: group.id,
        tripId: trip.id,
      },
      issuer: {
        companyName: 'Trip Sharing Platform Indonesia',
        legalName: 'PT Trip Sharing Nusantara',
        tagline: 'Teman Berbagi Perjalanan Wisata Indonesia',
        website: 'https://tripsharing.id',
        supportEmail: 'support@tripsharing.id',
        supportPhone: '+62 812-3456-7890',
        address: 'Jl. Ijen No. 88, Oro-oro Dowo, Kec. Klojen, Kota Malang, Jawa Timur 65119',
      },
      customer: {
        userId: participant.user_id,
        fullName: participant.full_name,
        email: participant.user?.email || `${participant.phone_number}@booking.local`,
        phoneNumber: participant.phone_number,
        country: participant.country || 'Indonesia',
        nationality: participant.nationality || 'Indonesia',
        gender: participant.gender || '-',
        dateOfBirth: participant.date_of_birth ? participant.date_of_birth.toISOString().slice(0, 10) : null,
      },
      tripDetails: {
        destinationId: dest.id,
        destinationName: dest.name,
        destinationSlug: dest.slug || `destination-${dest.id}`,
        destinationCoverImage: dest.cover_image || dest.image_url || '',
        departureDate: trip.departure_date,
        returnDate: trip.return_date,
        duration: durationText,
        meetingPoint: dest.meeting_point || 'Meeting point tertera pada e-voucher',
        pickupLocation: participant.pickup_location || dest.meeting_point || 'Sesuai titik meeting point',
        pickupLatitude: participant.pickup_latitude ? Number(participant.pickup_latitude) : null,
        pickupLongitude: participant.pickup_longitude ? Number(participant.pickup_longitude) : null,
        pickupNotes: participant.pickup_notes || 'Tidak ada catatan khusus',
        groupNumber: group.group_number,
        vehicleModel: assignedDriver.vehicleModel,
        vehiclePlateNumber: assignedDriver.plateNumber,
        driverName: assignedDriver.fullName,
        driverPhone: assignedDriver.phoneNumber,
      },
      pricing: {
        currency: 'IDR',
        items,
        basePrice,
        adminFee: 0,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount,
      },
      paymentDetails: {
        paymentId: payment?.id || null,
        paymentMethod:
          payment?.payment_method === 'manual_cash_or_transfer'
            ? 'Manual Transfer / Cash'
            : payment?.payment_method
            ? payment.payment_method
            : 'Midtrans Snap Gateway',
        midtransOrderId: payment?.midtrans_order_id || `TRIP-${bookingCode}`,
        midtransTransactionId: payment?.midtrans_transaction_id || null,
        paymentStatus: payment?.status || participant.payment_status,
        transactionTime: payment?.transaction_time || participant.created_at,
        completionTime: paidAt,
        paymentProofUrl: payment?.payment_proof_url || null,
      },
      verification: {
        voucherQrCode: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${bookingCode}`,
        invoiceUrl: `http://localhost:3001/api/bookings/${bookingCode}/invoice`,
      },
    }
  }
}
