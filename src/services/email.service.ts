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
    const host = process.env.SMTP_HOST
    const from = process.env.SMTP_FROM
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS

    if (
      !host ||
      !from ||
      !user ||
      !pass ||
      user === 'your_email@gmail.com' ||
      pass === 'your_app_password' ||
      user.includes('example.com')
    ) {
      logger.warn('SMTP is not configured or placeholder detected, email skipped', { to, subject })
      return null
    }

    try {
      return await transporter.sendMail({ from, to, subject, html })
    } catch (err: unknown) {
      logger.error('Failed to send email notification', {
        to,
        subject,
        error: (err as Error)?.message || String(err),
      })
      return null
    }
  }

  static async sendBookingConfirmation(email: string, data: Record<string, unknown>) {
    return this.send(
      email,
      'Booking Confirmation - Trip Sharing',
      `<h1>Booking Confirmation</h1><pre>${JSON.stringify(data, null, 2)}</pre>`
    )
  }

  static async sendPaymentReceipt(email: string, data: Record<string, unknown>) {
    return this.send(
      email,
      'Payment Receipt - Trip Sharing',
      `<h1>Payment Receipt</h1><pre>${JSON.stringify(data, null, 2)}</pre>`
    )
  }

  static async sendParticipantCreated(email: string, data: Record<string, unknown>) {
    return this.send(
      email,
      'Participant Created - Trip Sharing',
      `<h1>Participant Created</h1><pre>${JSON.stringify(data, null, 2)}</pre>`
    )
  }

  static async sendParticipantMoved(email: string, data: Record<string, unknown>) {
    return this.send(
      email,
      'Participant Moved - Trip Sharing',
      `<h1>Participant Moved</h1><pre>${JSON.stringify(data, null, 2)}</pre>`
    )
  }

  static async sendPasswordResetEmail(email: string, resetUrl: string, name?: string) {
    const userName = name || 'Traveler'
    const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Kata Sandi Akun</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f9fb; margin: 0; padding: 0; color: #191c1e; }
        .container { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #00677d 0%, #0087a3 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
        .content { padding: 32px 28px; line-height: 1.6; }
        .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
        .button-wrapper { text-align: center; margin: 30px 0; }
        .reset-btn { display: inline-block; background-color: #00677d; color: #ffffff !important; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 2px 8px rgba(0, 103, 125, 0.3); }
        .expiry-note { font-size: 13px; color: #64748b; background-color: #f1f5f9; padding: 12px 16px; border-radius: 8px; margin: 20px 0; }
        .fallback-link { font-size: 12px; color: #64748b; word-break: break-all; margin-top: 16px; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Java Shared Tour</h1>
        </div>
        <div class="content">
          <div class="greeting">Halo, ${userName}!</div>
          <p>Kami menerima permintaan untuk mereset kata sandi akun Anda di <strong>Java Shared Tour</strong>.</p>
          <p>Klik tombol di bawah ini untuk mengatur kata sandi baru Anda:</p>
          <div class="button-wrapper">
            <a href="${resetUrl}" class="reset-btn" target="_blank">Atur Ulang Kata Sandi</a>
          </div>
          <div class="expiry-note">
            ⏳ <strong>Penting:</strong> Tautan ini hanya berlaku selama <strong>1 jam</strong> dan hanya dapat digunakan satu kali demi keamanan akun Anda.
          </div>
          <p style="font-size: 13px; color: #475569;">Jika Anda tidak pernah meminta reset kata sandi, Anda dapat mengabaikan email ini dengan aman. Kata sandi akun Anda tidak akan berubah.</p>
          <div class="fallback-link">
            Jika tombol di atas tidak berfungsi, salin dan tempel tautan berikut di browser Anda:<br>
            <a href="${resetUrl}" style="color: #00677d;">${resetUrl}</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Java Shared Tour. All rights reserved.
        </div>
      </div>
    </body>
    </html>
    `

    return this.send(email, 'Reset Kata Sandi Akun - Java Shared Tour', html)
  }
}

