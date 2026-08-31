import { prisma } from '../config/database'
import { ApiError } from '../utils/errors'
import { EmailService } from './email.service'

export class ParticipantService {
  static async createParticipantAsAdmin(data: {
    trip_id: number
    group_id: number
    full_name: string
    phone_number: string
    country: string
    date_of_birth: Date
    hotel_preference?: string
    payment_status?: string
    admin_id?: number
  }) {
    const group = await prisma.bookingGroup.findUnique({
      where: { id: data.group_id },
      include: { trip: true },
    })

    if (!group) throw new ApiError('Group not found', 404)
    if (group.trip_id !== data.trip_id) throw new ApiError('Group does not belong to selected trip', 400)
    if (group.current_participants >= group.max_participants) throw new ApiError('Group is full', 400)

    return prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { email: `${data.phone_number}@booking.local` } })

      if (!user) {
        user = await tx.user.create({
          data: {
            email: `${data.phone_number}@booking.local`,
            password: 'manual_booking',
            name: data.full_name,
            phone: data.phone_number,
            role: 'participant',
          },
        })
      }

      const participant = await tx.participant.create({
        data: {
          booking_group_id: data.group_id,
          user_id: user.id,
          full_name: data.full_name,
          phone_number: data.phone_number,
          country: data.country,
          date_of_birth: data.date_of_birth,
          hotel_preference: data.hotel_preference,
          payment_status: data.payment_status || 'pending',
        },
      })

      const updatedGroup = await tx.bookingGroup.update({
        where: { id: data.group_id },
        data: { current_participants: { increment: 1 } },
      })

      await tx.trip.update({ where: { id: data.trip_id }, data: { current_participants: { increment: 1 } } })

      if (updatedGroup.current_participants >= updatedGroup.max_participants) {
        await tx.bookingGroup.update({ where: { id: data.group_id }, data: { status: 'full' } })
      }

      await tx.auditLog.create({
        data: {
          user_id: data.admin_id,
          action: 'CREATE_PARTICIPANT',
          entity_type: 'Participant',
          entity_id: participant.id,
          new_values: JSON.parse(JSON.stringify(participant)),
        },
      })

      await EmailService.sendParticipantCreated(user.email, {
        participant_name: data.full_name,
        trip: group.trip.id,
        payment_status: data.payment_status || 'pending',
      })

      return { participant, group: updatedGroup }
    })
  }

  static async getParticipants(filters: { trip_id?: number; status?: string }) {
    return prisma.participant.findMany({
      where: {
        ...(filters.trip_id && { booking_group: { trip_id: filters.trip_id } }),
        ...(filters.status && { payment_status: filters.status }),
      },
      include: { booking_group: { include: { trip: { include: { destination: true } } } }, user: true, payment: true },
      orderBy: { created_at: 'desc' },
    })
  }

  static async updateParticipant(id: number, data: Record<string, unknown>) {
    return prisma.participant.update({ where: { id }, data: data as never })
  }

  static async deleteParticipant(id: number) {
    const participant = await prisma.participant.findUnique({ include: { booking_group: true }, where: { id } })
    if (!participant) throw new ApiError('Participant not found', 404)

    await prisma.$transaction([
      prisma.participant.update({ where: { id }, data: { payment_status: 'cancelled' } }),
      prisma.bookingGroup.update({ where: { id: participant.booking_group.id }, data: { current_participants: { decrement: 1 }, status: 'open' } }),
      prisma.trip.update({ where: { id: participant.booking_group.trip_id }, data: { current_participants: { decrement: 1 } } }),
    ])
  }

  static async moveParticipant(participantId: number, newGroupId: number) {
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: { booking_group: true, user: true },
    })
    if (!participant) throw new ApiError('Participant not found', 404)

    const newGroup = await prisma.bookingGroup.findUnique({ where: { id: newGroupId } })
    if (!newGroup) throw new ApiError('Target group not found', 404)
    if (newGroup.current_participants >= newGroup.max_participants) throw new ApiError('Target group is full', 400)

    const oldGroupId = participant.booking_group.id

    const moved = await prisma.$transaction(async (tx) => {
      const updated = await tx.participant.update({ where: { id: participantId }, data: { booking_group_id: newGroupId } })
      await tx.bookingGroup.update({ where: { id: oldGroupId }, data: { current_participants: { decrement: 1 }, status: 'open' } })
      await tx.bookingGroup.update({ where: { id: newGroupId }, data: { current_participants: { increment: 1 } } })
      return updated
    })

    await EmailService.sendParticipantMoved(participant.user.email, {
      participant_name: participant.full_name,
      old_group: oldGroupId,
      new_group: newGroupId,
    })

    return { participant: moved, newGroup }
  }
}
