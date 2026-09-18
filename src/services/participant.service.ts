import { Prisma } from '@prisma/client'
import { prisma } from '../config/database'
import { ApiError } from '../utils/errors'
import { EmailService } from './email.service'

function cleanId(val: unknown): string {
  if (typeof val === 'string') {
    return val.replace(/^(part-|grp-|trip-|dest-|usr-|pay-)/, '')
  }
  return String(val || '')
}

export class ParticipantService {
  static async createParticipantAsAdmin(data: {
    trip_id?: string
    tripId?: string
    group_id?: string
    bookingGroupId?: string
    full_name?: string
    fullName?: string
    email?: string
    phone_number?: string
    phoneNumber?: string
    country?: string
    nationality?: string
    gender?: string
    date_of_birth?: Date | string
    dateOfBirth?: Date | string
    totalAmount?: number
    total_amount?: number
    payment_status?: string
    paymentStatus?: string
    healthNotes?: string
    health_notes?: string
    pickup_location?: string
    pickupLocation?: string
    pickup_latitude?: number
    pickupLatitude?: number
    pickup_longitude?: number
    pickupLongitude?: number
    pickup_notes?: string
    pickupNotes?: string
    packageType?: string
    package_type?: string
    admin_id?: string
  }) {
    const rawTripId = data.trip_id || data.tripId
    const tripId = rawTripId ? cleanId(rawTripId) : undefined
    const rawGroupId = data.group_id || data.bookingGroupId
    const groupId = cleanId(rawGroupId)
    const fullName = data.full_name || data.fullName || 'Participant'
    const phoneNumber = data.phone_number || data.phoneNumber || ''
    const country = data.country || data.nationality || 'Indonesia'
    const nationality = data.nationality || data.country || 'Indonesia'
    const gender = data.gender || null
    const packageType = (data.packageType || data.package_type || 'ALL_IN').toUpperCase()
    const totalAmount = data.totalAmount ?? data.total_amount ?? 0
    const paymentStatus = data.payment_status || data.paymentStatus || 'paid'
    const healthNotes = data.healthNotes || data.health_notes || null
    const pickupLocation = data.pickup_location || data.pickupLocation || null
    const pickupLatitude =
      data.pickup_latitude !== undefined && data.pickup_latitude !== null
        ? new Prisma.Decimal(data.pickup_latitude.toString())
        : data.pickupLatitude !== undefined && data.pickupLatitude !== null
        ? new Prisma.Decimal(data.pickupLatitude.toString())
        : null
    const pickupLongitude =
      data.pickup_longitude !== undefined && data.pickup_longitude !== null
        ? new Prisma.Decimal(data.pickup_longitude.toString())
        : data.pickupLongitude !== undefined && data.pickupLongitude !== null
        ? new Prisma.Decimal(data.pickupLongitude.toString())
        : null
    const pickupNotes = data.pickup_notes || data.pickupNotes || null
    const userEmail =
      data.email || `${phoneNumber.replace(/[^0-9]/g, '') || Date.now()}@booking.local`

    const group = await prisma.bookingGroup.findUnique({
      where: { id: groupId },
      include: { trip: true },
    })

    if (!group) throw new ApiError('Group not found', 404)
    if (tripId && group.trip_id !== tripId)
      throw new ApiError('Group does not belong to selected trip', 400)
    if (group.current_participants >= group.max_participants)
      throw new ApiError('Group is full', 400)

    const randomDigits = Math.floor(1000 + Math.random() * 9000)
    const bookingCode = `TRV-${randomDigits}`

    const result = await prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { email: userEmail } })

      if (!user) {
        user = await tx.user.create({
          data: {
            email: userEmail,
            password: 'manual_booking',
            name: fullName,
            phone: phoneNumber,
            role: 'participant',
          },
        })
      }

      const participant = await tx.participant.create({
        data: {
          booking_group_id: groupId,
          user_id: user.id,
          booking_code: bookingCode,
          full_name: fullName,
          phone_number: phoneNumber,
          country,
          nationality,
          gender,
          package_type: packageType,
          date_of_birth:
            data.date_of_birth || data.dateOfBirth
              ? new Date(data.date_of_birth || data.dateOfBirth!)
              : null,
          total_amount: totalAmount ? new Prisma.Decimal(totalAmount.toString()) : null,
          payment_status: paymentStatus,
          health_notes: healthNotes,
          pickup_location: pickupLocation,
          pickup_latitude: pickupLatitude,
          pickup_longitude: pickupLongitude,
          pickup_notes: pickupNotes,
        },
      })

      const updatedGroup = await tx.bookingGroup.update({
        where: { id: groupId },
        data: { current_participants: { increment: 1 } },
      })

      await tx.trip.update({
        where: { id: group.trip_id },
        data: { current_participants: { increment: 1 } },
      })

      if (updatedGroup.current_participants >= updatedGroup.max_participants) {
        await tx.bookingGroup.update({ where: { id: groupId }, data: { status: 'full' } })
      }

      // Generate payment record pelengkap
      const calculatedAmount = totalAmount || Number(group.price_per_person) || 0
      const isPaid = paymentStatus === 'paid'
      const isFailed = paymentStatus === 'cancelled' || paymentStatus === 'failed'

      await tx.payment.create({
        data: {
          participant_id: participant.id,
          booking_group_id: groupId,
          amount: new Prisma.Decimal(calculatedAmount.toString()),
          payment_method: 'manual_cash_or_transfer',
          midtrans_order_id: `MANUAL-${bookingCode}-${Date.now()}`,
          status: isPaid ? 'completed' : isFailed ? 'failed' : 'pending',
          completion_time: isPaid ? new Date() : null,
        },
      })

      await tx.auditLog.create({
        data: {
          user_id: data.admin_id,
          action: 'CREATE_PARTICIPANT_MANUAL',
          entity_type: 'Participant',
          entity_id: participant.id,
          new_values: JSON.parse(JSON.stringify(participant)),
        },
      })

      return {
        id: participant.id,
        bookingCode: participant.booking_code,
        fullName: participant.full_name,
        bookingGroupId: groupId,
        paymentStatus: participant.payment_status,
        userEmail: user.email,
        tripId: group.trip.id,
      }
    }, {
      maxWait: 10000,
      timeout: 30000,
    })

    await EmailService.sendParticipantCreated(result.userEmail, {
      participant_name: result.fullName,
      trip: result.tripId,
      payment_status: result.paymentStatus,
    })

    return {
      id: result.id,
      bookingCode: result.bookingCode,
      fullName: result.fullName,
      bookingGroupId: result.bookingGroupId,
      paymentStatus: result.paymentStatus,
    }
  }

  static async getParticipants(filters: {
    trip_id?: string
    tripId?: string
    status?: string
    search?: string
  }) {
    const rawTripId = filters.trip_id || filters.tripId
    const tripId = rawTripId ? cleanId(rawTripId) : undefined
    const status = filters.status
    const search = filters.search

    return prisma.participant.findMany({
      where: {
        ...(tripId && { booking_group: { trip_id: tripId } }),
        ...(status && { payment_status: status }),
        ...(search && {
          OR: [
            { full_name: { contains: search, mode: 'insensitive' } },
            { phone_number: { contains: search, mode: 'insensitive' } },
            { booking_code: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        booking_group: {
          include: {
            trip: {
              include: {
                destination: true,
              },
            },
            driver: {
              include: {
                user: true,
              },
            },
          },
        },
        user: true,
        payment: true,
      },
      orderBy: { created_at: 'desc' },
    })
  }

  static async updateParticipant(
    id: string,
    data: {
      full_name?: string
      fullName?: string
      phone_number?: string
      phoneNumber?: string
      country?: string
      nationality?: string
      gender?: string
      date_of_birth?: Date | string
      dateOfBirth?: Date | string
      payment_status?: string
      paymentStatus?: string
      checked_in?: boolean
      checkedIn?: boolean
      check_in_status?: string
      checkInStatus?: string
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
      total_amount?: number | string
      totalAmount?: number | string
      package_type?: string
      packageType?: string
      [key: string]: unknown
    }
  ) {
    const cleanPartId = cleanId(id)
    const existing = await prisma.participant.findUnique({
      where: { id: cleanPartId },
      include: { booking_group: true },
    })
    if (!existing) throw new ApiError('Participant not found', 404)

    const updateData: Record<string, unknown> = {}

    if (data.package_type !== undefined || data.packageType !== undefined) {
      const pkg = data.package_type ?? data.packageType
      updateData.package_type = pkg ? pkg.toString().toUpperCase() : 'ALL_IN'
    }

    if (data.full_name !== undefined || data.fullName !== undefined) {
      updateData.full_name = data.full_name ?? data.fullName
    }
    if (data.phone_number !== undefined || data.phoneNumber !== undefined) {
      updateData.phone_number = data.phone_number ?? data.phoneNumber
    }
    if (data.country !== undefined) {
      updateData.country = data.country
    }
    if (data.nationality !== undefined) {
      updateData.nationality = data.nationality
    }
    if (data.gender !== undefined) {
      updateData.gender = data.gender
    }
    if (data.date_of_birth !== undefined || data.dateOfBirth !== undefined) {
      const dob = data.date_of_birth ?? data.dateOfBirth
      updateData.date_of_birth = dob ? new Date(dob as string | number | Date) : null
    }
    if (data.payment_status !== undefined || data.paymentStatus !== undefined) {
      updateData.payment_status = data.payment_status ?? data.paymentStatus
    }
    if (data.checked_in !== undefined || data.checkedIn !== undefined) {
      updateData.checked_in = data.checked_in ?? data.checkedIn
    }
    if (data.check_in_status !== undefined || data.checkInStatus !== undefined) {
      updateData.check_in_status = data.check_in_status ?? data.checkInStatus
    }
    if (data.health_notes !== undefined || data.healthNotes !== undefined) {
      updateData.health_notes = data.health_notes ?? data.healthNotes
    }
    if (data.preferred_language !== undefined || data.preferredLanguage !== undefined) {
      updateData.preferred_language = data.preferred_language ?? data.preferredLanguage
    }
    if (data.pickup_location !== undefined || data.pickupLocation !== undefined) {
      updateData.pickup_location = data.pickup_location ?? data.pickupLocation
    }
    if (data.pickup_latitude !== undefined || data.pickupLatitude !== undefined) {
      const lat = data.pickup_latitude ?? data.pickupLatitude
      updateData.pickup_latitude =
        lat !== null && lat !== undefined ? new Prisma.Decimal(lat.toString()) : null
    }
    if (data.pickup_longitude !== undefined || data.pickupLongitude !== undefined) {
      const lng = data.pickup_longitude ?? data.pickupLongitude
      updateData.pickup_longitude =
        lng !== null && lng !== undefined ? new Prisma.Decimal(lng.toString()) : null
    }
    if (data.pickup_notes !== undefined || data.pickupNotes !== undefined) {
      updateData.pickup_notes = data.pickup_notes ?? data.pickupNotes
    }
    if (data.total_amount !== undefined || data.totalAmount !== undefined) {
      const total = data.total_amount ?? data.totalAmount
      updateData.total_amount =
        total !== null && total !== undefined ? new Prisma.Decimal(total.toString()) : null
    }

    const updated = await prisma.participant.update({
      where: { id: cleanPartId },
      data: updateData as never,
    })

    if (updateData.payment_status) {
      const isPaid = updateData.payment_status === 'paid'
      const isFailed = updateData.payment_status === 'cancelled' || updateData.payment_status === 'failed'
      const status = isPaid ? 'completed' : isFailed ? 'failed' : 'pending'
      const amount = updated.total_amount || existing.booking_group.price_per_person

      await prisma.payment.upsert({
        where: { participant_id: cleanPartId },
        update: {
          status,
          completion_time: isPaid ? new Date() : null,
        },
        create: {
          participant_id: cleanPartId,
          booking_group_id: existing.booking_group_id,
          amount: new Prisma.Decimal(amount ? amount.toString() : '0'),
          midtrans_order_id: `MANUAL-${existing.booking_code || cleanPartId}-${Date.now()}`,
          payment_method: 'manual_cash_or_transfer',
          status,
          completion_time: isPaid ? new Date() : null,
        },
      })
    }

    return updated
  }

  static async deleteParticipant(id: string) {
    const cleanPartId = cleanId(id)
    const participant = await prisma.participant.findUnique({
      include: { booking_group: true },
      where: { id: cleanPartId },
    })
    if (!participant) throw new ApiError('Participant not found', 404)

    await prisma.$transaction([
      prisma.participant.update({
        where: { id: cleanPartId },
        data: { payment_status: 'cancelled' },
      }),
      prisma.bookingGroup.update({
        where: { id: participant.booking_group.id },
        data: { current_participants: { decrement: 1 }, status: 'open' },
      }),
      prisma.trip.update({
        where: { id: participant.booking_group.trip_id },
        data: { current_participants: { decrement: 1 } },
      }),
    ])
  }

  static async moveParticipant(
    participantId: string,
    newGroupId: string,
    reason?: string,
    adminId?: string
  ) {
    const cleanPartId = cleanId(participantId)
    const cleanNewGroupId = cleanId(newGroupId)

    const participant = await prisma.participant.findUnique({
      where: { id: cleanPartId },
      include: { booking_group: true, user: true },
    })
    if (!participant) throw new ApiError('Participant not found', 404)

    const newGroup = await prisma.bookingGroup.findUnique({ where: { id: cleanNewGroupId } })
    if (!newGroup) throw new ApiError('Target group not found', 404)
    if (newGroup.current_participants >= newGroup.max_participants) {
      throw new ApiError(
        'Grup tujuan sudah penuh (Kapasitas Maksimal 6 Orang). Silakan pilih grup lain.',
        409
      )
    }

    const oldGroupId = participant.booking_group.id

    const moved = await prisma.$transaction(async (tx) => {
      const updated = await tx.participant.update({
        where: { id: cleanPartId },
        data: { booking_group_id: cleanNewGroupId },
      })
      await tx.bookingGroup.update({
        where: { id: oldGroupId },
        data: { current_participants: { decrement: 1 }, status: 'open' },
      })
      const updatedNewGroup = await tx.bookingGroup.update({
        where: { id: cleanNewGroupId },
        data: { current_participants: { increment: 1 } },
      })
      if (updatedNewGroup.current_participants >= updatedNewGroup.max_participants) {
        await tx.bookingGroup.update({ where: { id: cleanNewGroupId }, data: { status: 'full' } })
      }

      await tx.auditLog.create({
        data: {
          user_id: adminId,
          action: 'MOVE_PARTICIPANT',
          entity_type: 'BookingGroup',
          entity_id: cleanNewGroupId,
          new_values: {
            details: `Memindahkan peserta ${participant.full_name} (${participant.booking_code || participant.id}) dari Grup ${participant.booking_group.group_number} ke Grup ${newGroup.group_number}. ${reason || ''}`,
            reason,
          },
        },
      })

      return updated
    }, {
      maxWait: 10000,
      timeout: 30000,
    })

    await EmailService.sendParticipantMoved(participant.user.email, {
      participant_name: participant.full_name,
      old_group: oldGroupId,
      new_group: cleanNewGroupId,
    })

    return { participant: moved, newGroup }
  }
}
