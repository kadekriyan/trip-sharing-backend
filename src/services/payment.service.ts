import crypto from 'crypto'
import { prisma } from '../config/database'
import { snap } from '../config/midtrans'
import { MidtransNotification } from '../types/payment'
import { ApiError } from '../utils/errors'
import { logger } from '../utils/logger'
import { EmailService } from './email.service'
import { TelegramService } from './telegram.service'

function parseBulkParticipantIds(notes?: string | null): string[] {
  if (!notes) return []
  try {
    const parsed = JSON.parse(notes)
    if (parsed && Array.isArray(parsed.participantIds)) {
      return parsed.participantIds.map(String)
    }
  } catch {
    // Not a JSON notes
  }
  return []
}

export class PaymentService {
  static async createTransaction(participantId: string) {
    const cleanPartId = participantId.replace(/^part-/, '')
    const participant = await prisma.participant.findUnique({
      where: { id: cleanPartId },
      include: {
        booking_group: { include: { trip: { include: { destination: true } } } },
        user: true,
      },
    })
    if (!participant) throw new ApiError('Participant not found', 404)

    const existingPayment = await prisma.payment.findUnique({
      where: { participant_id: cleanPartId },
    })
    if (existingPayment?.status === 'completed')
      throw new ApiError('Payment already completed', 400)

    const amount = participant.booking_group.price_per_person
    const orderId = `TRIP-${cleanPartId}-${Date.now()}`

    const payment = await prisma.payment.upsert({
      where: { participant_id: cleanPartId },
      update: { amount, midtrans_order_id: orderId, status: 'pending' },
      create: {
        participant_id: cleanPartId,
        booking_group_id: participant.booking_group.id,
        amount,
        midtrans_order_id: orderId,
      },
    })

    const transaction = await snap.createTransaction({
      transaction_details: { order_id: orderId, gross_amount: Math.ceil(Number(amount)) },
      customer_details: {
        first_name: participant.full_name,
        email: participant.user.email,
        phone: participant.phone_number,
      },
      item_details: [
        {
          id: participant.booking_group.trip.destination.id,
          price: Math.ceil(Number(amount)),
          quantity: 1,
          name: participant.booking_group.trip.destination.name,
        },
      ],
    })

    return {
      paymentId: payment.id,
      snapToken: transaction.token,
      redirectUrl: transaction.redirect_url,
      orderId,
      amount: Number(amount),
      currency: 'IDR',
    }
  }

  static async handleWebhook(notification: MidtransNotification) {
    const hash = crypto
      .createHash('sha512')
      .update(
        `${notification.order_id}${notification.status_code || ''}${notification.gross_amount || ''}${process.env.MIDTRANS_SERVER_KEY || ''}`
      )
      .digest('hex')

    if (notification.signature_key && notification.signature_key !== hash) {
      throw new ApiError('Invalid signature', 400)
    }

    const payment = await prisma.payment.findUnique({
      where: { midtrans_order_id: notification.order_id },
      include: {
        participant: {
          include: {
            user: true,
            booking_group: {
              include: {
                trip: {
                  include: { destination: true },
                },
              },
            },
          },
        },
        booking_group: {
          include: {
            trip: {
              include: { destination: true },
            },
          },
        },
      },
    })
    if (!payment) throw new ApiError('Payment not found', 404)

    const completed = ['capture', 'settlement'].includes(notification.transaction_status)
    const failed = ['deny', 'cancel', 'expire', 'failure'].includes(notification.transaction_status)
    const status = completed ? 'completed' : failed ? 'failed' : 'pending'

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status,
        midtrans_transaction_id: notification.transaction_id,
        completion_time: completed ? new Date() : null,
      },
    })

    const bulkParticipantIds = parseBulkParticipantIds(payment.notes)
    const allParticipantIds = Array.from(new Set([payment.participant_id, ...bulkParticipantIds]))

    if (completed) {
      if (bulkParticipantIds.length > 0) {
        await prisma.participant.updateMany({
          where: { id: { in: allParticipantIds } },
          data: { payment_status: 'paid' },
        })
      } else {
        await prisma.participant.update({
          where: { id: payment.participant_id },
          data: { payment_status: 'paid' },
        })
      }

      if (payment.participant?.user?.email) {
        EmailService.sendPaymentReceipt(payment.participant.user.email, {
          participant_name: payment.participant.full_name,
          amount: payment.amount,
        }).catch((err) => {
          logger.error('Failed to send payment receipt email', err)
        })
      }

      // Dispatch asynchronous Telegram notification (non-blocking)
      TelegramService.sendPaymentSuccessNotification({
        orderId: payment.midtrans_order_id || `ORDER-${payment.id}`,
        bookingCode: payment.participant?.booking_code || undefined,
        customerName: payment.participant?.full_name || 'Traveler',
        customerEmail: payment.participant?.user?.email,
        destinationName:
          payment.participant?.booking_group?.trip?.destination?.name ||
          payment.booking_group?.trip?.destination?.name ||
          'Open Trip Jogja',
        tripDate:
          payment.participant?.booking_group?.trip?.departure_date ||
          payment.booking_group?.trip?.departure_date,
        paxCount: allParticipantIds.length || 1,
        amount: Number(payment.amount),
        paymentMethod: notification.payment_type || payment.payment_method || 'Midtrans',
        paidAt: new Date(),
      }).catch((err) => {
        logger.error('Failed to dispatch telegram payment notification', err)
      })
    } else if (failed) {
      if (bulkParticipantIds.length > 0) {
        await prisma.participant.updateMany({
          where: { id: { in: allParticipantIds } },
          data: { payment_status: 'cancelled' },
        })
      } else {
        await prisma.participant.update({
          where: { id: payment.participant_id },
          data: { payment_status: 'cancelled' },
        })
      }
    }

    return { status: 'ok', payment: updated }
  }

  static async simulatePayment(id: string, action = 'settle') {
    const cleanId = id.replace(/^part-/, '').replace(/^pay-/, '').replace(/^blk-/, '')
    const act = (action || 'settle').toLowerCase()

    let payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { id: cleanId },
          { participant_id: cleanId },
          { midtrans_order_id: cleanId },
          { notes: { contains: cleanId } },
        ],
      },
      include: {
        participant: {
          include: {
            user: true,
            booking_group: {
              include: {
                trip: {
                  include: { destination: true },
                },
              },
            },
          },
        },
        booking_group: {
          include: {
            trip: {
              include: { destination: true },
            },
          },
        },
      },
    })

    if (!payment) {
      const participant = await prisma.participant.findUnique({
        where: { id: cleanId },
        include: {
          user: true,
          booking_group: {
            include: {
              trip: {
                include: { destination: true },
              },
            },
          },
        },
      })
      if (!participant) {
        throw new ApiError('Payment or Participant not found', 404)
      }

      const amount = participant.booking_group.price_per_person
      const orderId = `TRIP-${cleanId}-${Date.now()}`

      payment = await prisma.payment.create({
        data: {
          participant_id: participant.id,
          booking_group_id: participant.booking_group.id,
          amount,
          midtrans_order_id: orderId,
          status: 'pending',
        },
        include: {
          participant: {
            include: {
              user: true,
              booking_group: {
                include: {
                  trip: {
                    include: { destination: true },
                  },
                },
              },
            },
          },
          booking_group: {
            include: {
              trip: {
                include: { destination: true },
              },
            },
          },
        },
      })
    }

    const completed = ['capture', 'settlement', 'settle', 'success'].includes(act)
    const failed = [
      'deny',
      'cancel',
      'expire',
      'failure',
      'denied',
      'cancelled',
      'expired',
    ].includes(act)
    const status = completed ? 'completed' : failed ? 'failed' : 'pending'

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status,
        completion_time: completed ? new Date() : null,
      },
    })

    const bulkParticipantIds = parseBulkParticipantIds(payment.notes)
    const allParticipantIds = Array.from(new Set([payment.participant_id, ...bulkParticipantIds]))

    if (completed) {
      if (bulkParticipantIds.length > 0) {
        await prisma.participant.updateMany({
          where: { id: { in: allParticipantIds } },
          data: { payment_status: 'paid' },
        })
      } else {
        await prisma.participant.update({
          where: { id: payment.participant_id },
          data: { payment_status: 'paid' },
        })
      }

      if (payment.participant?.user?.email) {
        EmailService.sendPaymentReceipt(payment.participant.user.email, {
          participant_name: payment.participant.full_name,
          amount: payment.amount,
        }).catch((err) => {
          logger.error('Failed to send payment receipt email in simulation', err)
        })
      }

      // Dispatch asynchronous Telegram notification (non-blocking)
      TelegramService.sendPaymentSuccessNotification({
        orderId: payment.midtrans_order_id || `ORDER-${payment.id}`,
        bookingCode: payment.participant?.booking_code || undefined,
        customerName: payment.participant?.full_name || 'Traveler',
        customerEmail: payment.participant?.user?.email,
        destinationName:
          payment.participant?.booking_group?.trip?.destination?.name ||
          payment.booking_group?.trip?.destination?.name ||
          'Open Trip Jogja',
        tripDate:
          payment.participant?.booking_group?.trip?.departure_date ||
          payment.booking_group?.trip?.departure_date,
        paxCount: allParticipantIds.length || 1,
        amount: Number(payment.amount),
        paymentMethod: payment.payment_method || 'Midtrans Simulation',
        paidAt: new Date(),
      }).catch((err) => {
        logger.error('Failed to dispatch telegram payment simulation notification', err)
      })
    } else if (failed) {
      if (bulkParticipantIds.length > 0) {
        await prisma.participant.updateMany({
          where: { id: { in: allParticipantIds } },
          data: { payment_status: 'cancelled' },
        })
      } else {
        await prisma.participant.update({
          where: { id: payment.participant_id },
          data: { payment_status: 'cancelled' },
        })
      }
    }

    return {
      status: 'ok',
      message: `Simulasi pembayaran berhasil diproses: ${status}`,
      payment: updated,
    }
  }
}
