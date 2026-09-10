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
      departure_date?: Date | string
      departureDate?: Date | string
      return_date?: Date | string
      returnDate?: Date | string
      price_per_pax?: number
      pricePerPax?: number
      duration_days?: number
      durationDays?: number
      full_name?: string
      fullName?: string
      name?: string
      email?: string
      phone_number?: string
      phoneNumber?: string
      phone?: string
      country?: string
      nationality?: string
      date_of_birth?: Date | string
      dateOfBirth?: Date | string
      identity_number?: string
      identityNumber?: string
      gender?: string
      room_preference?: string
      roomPreference?: string
      hotel_preference?: string
      passport_number?: string
      passportNumber?: string
      identity_type?: string
      identityType?: string
      room_type?: string
      roomType?: string
      health_notes?: string
      healthNotes?: string
      preferred_language?: string
      preferredLanguage?: string
      pickup_location?: string
      pickupLocation?: string
      pickup_latitude?: number
      pickupLatitude?: number
      pickup_longitude?: number
      pickupLongitude?: number
      pickup_notes?: string
      pickupNotes?: string
      travel_insurance?: boolean
      hasInsurance?: boolean
    }
  ) {
    const rawTripId = bookingData.trip_id || bookingData.tripId
    const rawDestId = bookingData.destination_id || bookingData.destinationId
    const customDepartureDate = bookingData.departure_date || bookingData.departureDate
    const customReturnDate = bookingData.return_date || bookingData.returnDate
    const customPrice = bookingData.price_per_pax ?? bookingData.pricePerPax

    if (!rawTripId && !rawDestId) {
      throw new ApiError('Trip ID or Destination ID is required', 400)
    }

    let trip = null

    // 1. Try finding by trip ID if provided and not a synthetic custom prefix
    if (rawTripId && !rawTripId.startsWith('custom-') && !rawTripId.startsWith('trip-custom-')) {
      trip = await prisma.trip.findUnique({
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
        destination = await prisma.destination.findUnique({
          where: { id: cleanId(destIdToSearch) },
        })
      }

      // If still not found and rawTripId exists, attempt resolution via slug/name search
      if (!destination && rawTripId) {
        const cleanedSlug = rawTripId
          .replace(/^(custom-|trip-custom-|trip-)/, '')
          .replace(/-\d{8,}$/, '')
        destination = await prisma.destination.findFirst({
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

          trip = await prisma.trip.findFirst({
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

          trip = await prisma.trip.create({
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

    const tripId = trip.id
    const fullName = bookingData.full_name || bookingData.fullName || bookingData.name || 'Traveler'
    const phoneNumber =
      bookingData.phone_number || bookingData.phoneNumber || bookingData.phone || ''
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

    const pricePerPerson =
      customPrice !== undefined && customPrice !== null
        ? Number(customPrice)
        : Number(trip.destination.price_per_person)

    const basePrice = pricePerPerson
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

      const bookingGroup = await this.getOrCreateBookingGroup(tripId, pricePerPerson)

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
          date_of_birth:
            bookingData.date_of_birth || bookingData.dateOfBirth
              ? new Date(bookingData.date_of_birth || bookingData.dateOfBirth!)
              : new Date(),
          room_preference: roomPreference,
          hotel_preference: roomPreference,
          passport_number: bookingData.passport_number || bookingData.passportNumber,
          identity_type: bookingData.identity_type || bookingData.identityType,
          room_type: bookingData.room_type || bookingData.roomType,
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

  static async getInvoice(
    identifier: string,
    options?: {
      userId?: string
      email?: string
      isAdmin?: boolean
    }
  ) {
    const cleanIdVal = cleanId(identifier)

    const participant = await prisma.participant.findFirst({
      where: {
        OR: [
          { id: cleanIdVal },
          { id: identifier },
          { booking_code: identifier },
          { booking_code: identifier.toUpperCase() },
          { payment: { id: cleanIdVal } },
          { payment: { midtrans_order_id: identifier } },
          { payment: { midtrans_transaction_id: identifier } },
        ],
      },
      include: {
        user: true,
        payment: true,
        booking_group: {
          include: {
            driver: {
              include: {
                user: true,
              },
            },
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
      },
    })

    if (!participant) {
      throw new ApiError('Invoice or booking not found', 404)
    }

    // Access check if restricted by user credentials
    if (options?.userId && !options.isAdmin) {
      const isOwner =
        participant.user_id === options.userId ||
        (participant.user?.email && options.email && participant.user.email.toLowerCase() === options.email.toLowerCase())
      if (!isOwner && participant.booking_code !== identifier && participant.booking_code !== identifier.toUpperCase()) {
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

    const insuranceFee = participant.insurance_fee ? Number(participant.insurance_fee) : participant.has_insurance ? 50000 : 0
    const totalAmount = participant.total_amount
      ? Number(participant.total_amount)
      : Number(group.price_per_person) + insuranceFee
    const basePrice = Math.max(0, totalAmount - insuranceFee)

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

    const assignedDriver =
      group.driver?.user?.name
        ? {
            fullName: group.driver.user.name,
            phoneNumber: group.driver.user.phone || '',
            vehicleModel: group.driver.vehicle_type,
            plateNumber: group.driver.vehicle_plat,
          }
        : trip.guide?.driver
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

    if (insuranceFee > 0 || participant.has_insurance || participant.travel_insurance) {
      items.push({
        itemNumber: 2,
        description: 'Premi Asuransi Perjalanan (Travel Insurance Protection & Emergency Assistance)',
        category: 'Add-on Insurance',
        quantity: 1,
        unitPrice: insuranceFee || 50000,
        amount: insuranceFee || 50000,
      })
    }

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
        identityNumber: participant.identity_number || '-',
        identityType: participant.identity_type || 'KTP/Passport',
        country: participant.country || 'Indonesia',
        nationality: participant.nationality || 'Indonesia',
        gender: participant.gender || '-',
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
        roomPreference: participant.room_preference || participant.hotel_preference || 'Standard Shared',
        roomType: participant.room_type || 'Standard',
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
        insuranceFee,
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

