import nodemailer from 'nodemailer'
import { logger } from '../utils/logger'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
})

export class EmailService {
  private static async send(to: string, subject: string, html: string) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) {
      logger.warn('SMTP is not configured, email skipped', { to, subject })
      return null
    }

    return transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, html })
  }

  static async sendBookingConfirmation(email: string, data: Record<string, unknown>) {
    return this.send(email, 'Booking Confirmation - Trip Sharing', `<h1>Booking Confirmation</h1><pre>${JSON.stringify(data, null, 2)}</pre>`)
  }

  static async sendPaymentReceipt(email: string, data: Record<string, unknown>) {
    return this.send(email, 'Payment Receipt - Trip Sharing', `<h1>Payment Receipt</h1><pre>${JSON.stringify(data, null, 2)}</pre>`)
  }

  static async sendParticipantCreated(email: string, data: Record<string, unknown>) {
    return this.send(email, 'Participant Created - Trip Sharing', `<h1>Participant Created</h1><pre>${JSON.stringify(data, null, 2)}</pre>`)
  }

  static async sendParticipantMoved(email: string, data: Record<string, unknown>) {
    return this.send(email, 'Participant Moved - Trip Sharing', `<h1>Participant Moved</h1><pre>${JSON.stringify(data, null, 2)}</pre>`)
  }
}
