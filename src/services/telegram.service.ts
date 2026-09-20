import axios from 'axios'
import { logger } from '../utils/logger'

export interface NewBookingNotificationPayload {
  bookingCode?: string | (string | null | undefined)[] | null
  customerName: string
  customerPhone?: string
  customerEmail?: string
  destinationName: string
  tripDate: string | Date
  paxCount: number
  packageType?: string
  pickupLocation?: string | null
  totalAmount: number | string
  paymentStatus?: string
}

export interface PaymentSuccessNotificationPayload {
  orderId: string
  bookingCode?: string | (string | null | undefined)[] | null
  customerName: string
  customerEmail?: string
  destinationName: string
  tripDate?: string | Date
  paxCount?: number
  amount: number | string
  paymentMethod?: string
  paidAt?: Date | string
}

export class TelegramService {
  private static formatCurrency(amount: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(num)) return `Rp ${amount}`
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num)
  }

  private static formatDate(date: string | Date): string {
    try {
      const d = typeof date === 'string' ? new Date(date) : date
      if (isNaN(d.getTime())) return String(date)
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return String(date)
    }
  }

  private static formatDateTime(date?: string | Date): string {
    try {
      const d = date ? (typeof date === 'string' ? new Date(date) : date) : new Date()
      if (isNaN(d.getTime())) return String(date)
      return d.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    } catch {
      return String(date || '')
    }
  }

  static async sendMessage(
    text: string,
    options?: {
      parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
      chatId?: string
      messageThreadId?: string | number
    }
  ): Promise<boolean> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = options?.chatId || process.env.TELEGRAM_CHAT_ID
    const threadId = options?.messageThreadId || process.env.TELEGRAM_THREAD_ID

    if (!botToken || !chatId) {
      logger.warn('Telegram bot is not configured, notification skipped', {
        hasToken: Boolean(botToken),
        hasChatId: Boolean(chatId),
      })
      return false
    }

    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`
      const payload: Record<string, unknown> = {
        chat_id: chatId,
        text,
        parse_mode: options?.parseMode || 'HTML',
      }

      if (threadId) {
        payload.message_thread_id = threadId
      }

      const response = await axios.post(url, payload, { timeout: 8000 })
      if (response.data && response.data.ok) {
        logger.info('Telegram notification sent successfully', { chatId })
        return true
      } else {
        logger.warn('Telegram API returned non-ok response', response.data)
        return false
      }
    } catch (error: unknown) {
      const err = error as { message?: string; response?: { data?: unknown } }
      logger.error('Failed to send Telegram notification', {
        error: err.message,
        details: err.response?.data,
      })
      return false
    }
  }

  static async sendNewBookingNotification(
    data: NewBookingNotificationPayload
  ): Promise<boolean> {
    try {
      const bookingCodes = Array.isArray(data.bookingCode)
        ? data.bookingCode.filter(Boolean).join(', ')
        : data.bookingCode || '-'

      const packageLabel =
        data.packageType === 'TRANSPORT_ONLY' ? 'Transport Only' : 'All-In (Termasuk Tiket)'

      const lines = [
        '🛎️ <b>PESANAN BARU MASUK (NEW BOOKING)</b>',
        '━━━━━━━━━━━━━━━━━━━━',
        `🔖 <b>Kode Booking:</b> <code>${bookingCodes}</code>`,
        `👤 <b>Nama Pemesan:</b> ${data.customerName}`,
        data.customerPhone ? `📞 <b>No. HP / WA:</b> ${data.customerPhone}` : null,
        data.customerEmail ? `✉️ <b>Email:</b> ${data.customerEmail}` : null,
        `🗺️ <b>Destinasi:</b> ${data.destinationName}`,
        `📅 <b>Tanggal Trip:</b> ${this.formatDate(data.tripDate)}`,
        `👥 <b>Jumlah Peserta:</b> ${data.paxCount} Orang (Pax)`,
        `📦 <b>Tipe Paket:</b> ${packageLabel}`,
        data.pickupLocation ? `📍 <b>Lokasi Jemput:</b> ${data.pickupLocation}` : null,
        `💰 <b>Total Biaya:</b> <b>${this.formatCurrency(data.totalAmount)}</b>`,
        `⏳ <b>Status Pembayaran:</b> <i>${(data.paymentStatus || 'PENDING').toUpperCase()}</i>`,
        '━━━━━━━━━━━━━━━━━━━━',
        `🕒 <i>Waktu Order: ${this.formatDateTime()}</i>`,
      ].filter(Boolean)

      const message = lines.join('\n')
      return await this.sendMessage(message)
    } catch (err) {
      logger.error('Error constructing new booking telegram message', err)
      return false
    }
  }

  static async sendPaymentSuccessNotification(
    data: PaymentSuccessNotificationPayload
  ): Promise<boolean> {
    try {
      const bookingCodes = data.bookingCode
        ? Array.isArray(data.bookingCode)
          ? data.bookingCode.filter(Boolean).join(', ')
          : data.bookingCode
        : null

      const lines = [
        '💸 <b>PEMBAYARAN TERKONFIRMASI LUNAS</b>',
        '━━━━━━━━━━━━━━━━━━━━',
        `🆔 <b>Order ID:</b> <code>${data.orderId}</code>`,
        bookingCodes ? `🔖 <b>Kode Booking:</b> <code>${bookingCodes}</code>` : null,
        `👤 <b>Nama Peserta:</b> ${data.customerName}`,
        data.customerEmail ? `✉️ <b>Email:</b> ${data.customerEmail}` : null,
        `🗺️ <b>Destinasi:</b> ${data.destinationName}`,
        data.tripDate ? `📅 <b>Tanggal Trip:</b> ${this.formatDate(data.tripDate)}` : null,
        data.paxCount ? `👥 <b>Jumlah Peserta:</b> ${data.paxCount} Orang` : null,
        data.paymentMethod ? `💳 <b>Metode Bayar:</b> ${data.paymentMethod}` : null,
        `💵 <b>Nominal Lunas:</b> <b>${this.formatCurrency(data.amount)}</b>`,
        `✅ <b>Status:</b> <b>SUCCESS / SETTLEMENT</b>`,
        '━━━━━━━━━━━━━━━━━━━━',
        `🕒 <i>Waktu Lunas: ${this.formatDateTime(data.paidAt)}</i>`,
      ].filter(Boolean)

      const message = lines.join('\n')
      return await this.sendMessage(message)
    } catch (err) {
      logger.error('Error constructing payment success telegram message', err)
      return false
    }
  }
}
