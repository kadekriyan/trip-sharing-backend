import crypto from 'crypto'
import { prisma } from '../config/database'
import { snap } from '../config/midtrans'
import { MidtransNotification } from '../types/payment'
import { ApiError } from '../utils/errors'
import { EmailService } from './email.service'

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
      include: { participant: { include: { user: true } } },
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

    if (completed) {
      await prisma.participant.update({
        where: { id: payment.participant_id },
        data: { payment_status: 'paid' },
      })
      await EmailService.sendPaymentReceipt(payment.participant.user.email, {
        participant_name: payment.participant.full_name,
        amount: payment.amount,
      })
    }

    return { status: 'ok', payment: updated }
  }

  static async simulatePayment(id: string, action = 'settle') {
    const cleanId = id.replace(/^part-/, '').replace(/^pay-/, '')
    const act = (action || 'settle').toLowerCase()

    let payment = await prisma.payment.findFirst({
      where: {
        OR: [{ id: cleanId }, { participant_id: cleanId }, { midtrans_order_id: cleanId }],
      },
      include: {
        participant: { include: { user: true } },
        booking_group: { include: { trip: true } },
      },
    })

    if (!payment) {
      const participant = await prisma.participant.findUnique({
        where: { id: cleanId },
        include: {
          booking_group: { include: { trip: true } },
          user: true,
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
          participant: { include: { user: true } },
          booking_group: { include: { trip: true } },
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

    if (completed) {
      await prisma.participant.update({
        where: { id: payment.participant_id },
        data: { payment_status: 'paid' },
      })
      if (payment.participant?.user?.email) {
        await EmailService.sendPaymentReceipt(payment.participant.user.email, {
          participant_name: payment.participant.full_name,
          amount: payment.amount,
        })
      }
    } else if (failed) {
      await prisma.participant.update({
        where: { id: payment.participant_id },
        data: { payment_status: 'cancelled' },
      })
    }

    return {
      status: 'ok',
      message: `Simulasi pembayaran berhasil diproses: ${status}`,
      payment: updated,
    }
  }
}
