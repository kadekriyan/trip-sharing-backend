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
    identityNumber?: string
    identity_number?: string
    gender?: string
    date_of_birth?: Date | string
    hotel_preference?: string
    roomPreference?: string
    room_preference?: string
    hasInsurance?: boolean
    has_insurance?: boolean
    insuranceFee?: number
    insurance_fee?: number
    totalAmount?: number
    total_amount?: number
    payment_status?: string
    paymentStatus?: string
    healthNotes?: string
    health_notes?: string
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
    const identityNumber = data.identityNumber || data.identity_number || null
    const gender = data.gender || null
    const roomPreference =
      data.roomPreference || data.room_preference || data.hotel_preference || null
    const hasInsurance = data.hasInsurance ?? data.has_insurance ?? false
    const insuranceFee = data.insuranceFee ?? data.insurance_fee ?? 0
    const totalAmount = data.totalAmount ?? data.total_amount ?? 0
    const paymentStatus = data.payment_status || data.paymentStatus || 'paid'
    const healthNotes = data.healthNotes || data.health_notes || null
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

    return prisma.$transaction(async (tx) => {
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
          identity_number: identityNumber,
          gender,
          date_of_birth: data.date_of_birth ? new Date(data.date_of_birth) : new Date(),
          room_preference: roomPreference,
          hotel_preference: roomPreference,
          has_insurance: hasInsurance,
          insurance_fee: insuranceFee ? new Prisma.Decimal(insuranceFee.toString()) : null,
          total_amount: totalAmount ? new Prisma.Decimal(totalAmount.toString()) : null,
          payment_status: paymentStatus,
          health_notes: healthNotes,
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

      await tx.auditLog.create({
        data: {
          user_id: data.admin_id,
          action: 'CREATE_PARTICIPANT_MANUAL',
          entity_type: 'Participant',
          entity_id: participant.id,
          new_values: JSON.parse(JSON.stringify(participant)),
        },
      })

      await EmailService.sendParticipantCreated(user.email, {
        participant_name: fullName,
        trip: group.trip.id,
        payment_status: paymentStatus,
      })

      return {
        id: participant.id,
        bookingCode: participant.booking_code,
        fullName: participant.full_name,
        bookingGroupId: groupId,
        paymentStatus: participant.payment_status,
      }
    })
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
            { booking_code: { contains: search, mode: 'insensitive' } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
          ],
        }),
      },
      include: {
        booking_group: { include: { trip: { include: { destination: true } } } },
        user: true,
        payment: true,
      },
      orderBy: { created_at: 'desc' },
    })
  }

  static async updateParticipant(id: string, data: Record<string, unknown>) {
    const cleanPartId = cleanId(id)
    const updateData: Record<string, unknown> = {}

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
    if (data.identity_number !== undefined || data.identityNumber !== undefined) {
      updateData.identity_number = data.identity_number ?? data.identityNumber
    }
    if (data.identity_type !== undefined || data.identityType !== undefined) {
      updateData.identity_type = data.identity_type ?? data.identityType
    }
    if (data.gender !== undefined) {
      updateData.gender = data.gender
    }
    if (data.date_of_birth !== undefined || data.dateOfBirth !== undefined) {
      const dob = data.date_of_birth ?? data.dateOfBirth
      updateData.date_of_birth = dob ? new Date(dob as string | number | Date) : null
    }
    if (data.room_preference !== undefined || data.roomPreference !== undefined) {
      updateData.room_preference = data.room_preference ?? data.roomPreference
    }
    if (data.hotel_preference !== undefined || data.hotelPreference !== undefined) {
      updateData.hotel_preference = data.hotel_preference ?? data.hotelPreference
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
    if (data.passport_number !== undefined || data.passportNumber !== undefined) {
      updateData.passport_number = data.passport_number ?? data.passportNumber
    }
    if (data.room_type !== undefined || data.roomType !== undefined) {
      updateData.room_type = data.room_type ?? data.roomType
    }
    if (data.preferred_language !== undefined || data.preferredLanguage !== undefined) {
      updateData.preferred_language = data.preferred_language ?? data.preferredLanguage
    }
    if (data.travel_insurance !== undefined || data.travelInsurance !== undefined) {
      updateData.travel_insurance = data.travel_insurance ?? data.travelInsurance
    }
    if (data.has_insurance !== undefined || data.hasInsurance !== undefined) {
      updateData.has_insurance = data.has_insurance ?? data.hasInsurance
    }
    if (data.insurance_fee !== undefined || data.insuranceFee !== undefined) {
      const fee = data.insurance_fee ?? data.insuranceFee
      updateData.insurance_fee =
        fee !== null && fee !== undefined ? new Prisma.Decimal(fee.toString()) : null
    }
    if (data.total_amount !== undefined || data.totalAmount !== undefined) {
      const total = data.total_amount ?? data.totalAmount
      updateData.total_amount =
        total !== null && total !== undefined ? new Prisma.Decimal(total.toString()) : null
    }

    return prisma.participant.update({ where: { id: cleanPartId }, data: updateData as never })
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
    })

    await EmailService.sendParticipantMoved(participant.user.email, {
      participant_name: participant.full_name,
      old_group: oldGroupId,
      new_group: cleanNewGroupId,
    })

    return { participant: moved, newGroup }
  }
}
