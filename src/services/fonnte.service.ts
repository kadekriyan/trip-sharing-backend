import axios from 'axios'
import { logger } from '../utils/logger'

export interface FonnteSendResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface ReviewInviteMessagePayload {
  customerName: string
  destinationTitle: string
  departureDate: string | Date
  reviewUrl: string
}

export class FonnteService {
  /**
   * Normalisasi nomor telepon ke format standar Indonesia (62xxx atau 08xxx)
   */
  static normalizePhoneNumber(phone: string): string {
    const cleaned = phone.replace(/[^0-9]/g, '')
    if (cleaned.startsWith('0')) {
      return `62${cleaned.slice(1)}`
    }
    if (cleaned.startsWith('8')) {
      return `62${cleaned}`
    }
    return cleaned
  }

  /**
   * Format teks pesan undangan ulasan yang ramah dan profesional
   */
  static formatReviewInvitation(payload: ReviewInviteMessagePayload): string {
    let formattedDate = String(payload.departureDate)
    try {
      const d =
        typeof payload.departureDate === 'string'
          ? new Date(payload.departureDate)
          : payload.departureDate
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      }
    } catch {
      // Fallback to raw string
    }

    return (
      `Halo Kak *${payload.customerName}*! 👋\n\n` +
      `Terima kasih telah menjelajahi keindahan *${payload.destinationTitle}* bersama *Java Shared Tour* pada tanggal ${formattedDate}.\n\n` +
      `Kami sangat menghargai kenyamanan dan kepuasan perjalanan Kakak. Mohon luangkan waktu 1 menit untuk memberikan penilaian bintang (1-5) dan ulasan pengalaman Kakak melalui tautan resmi berikut:\n\n` +
      `⭐ *Beri Ulasan Perjalanan Anda:*\n` +
      `${payload.reviewUrl}\n\n` +
      `Masukan Kakak sangat berarti bagi peningkatan kualitas layanan kami. Sampai jumpa di petualangan seru berikutnya! 🚗💨\n\n` +
      `Salam hangat,\n` +
      `*Tim Java Shared Tour*`
    )
  }

  /**
   * Kirim pesan teks WhatsApp melalui endpoint resmi Fonnte API
   */
  static async sendMessage(target: string, message: string): Promise<FonnteSendResult> {
    const token = process.env.FONNTE_TOKEN || process.env.FONNTE_API_KEY
    if (!token) {
      logger.warn('Fonnte API token is not configured, WhatsApp dispatch skipped', {
        target,
      })
      return {
        success: false,
        error: 'FONNTE_TOKEN_NOT_CONFIGURED',
      }
    }

    const normalizedTarget = this.normalizePhoneNumber(target)
    if (!normalizedTarget || normalizedTarget.length < 8) {
      logger.warn('Invalid recipient phone number for Fonnte', { target })
      return {
        success: false,
        error: 'INVALID_PHONE_NUMBER',
      }
    }

    try {
      const response = await axios.post(
        'https://api.fonnte.com/send',
        {
          target: normalizedTarget,
          message,
          countryCode: '62',
        },
        {
          headers: {
            Authorization: token,
          },
          timeout: 10000,
        }
      )

      if (response.data && (response.data.status === true || response.data.status === 'true')) {
        const messageId = Array.isArray(response.data.id)
          ? response.data.id[0]
          : response.data.id || 'FONNTE_SENT'
        logger.info('WhatsApp review invite sent successfully via Fonnte', {
          target: normalizedTarget,
          messageId,
        })
        return {
          success: true,
          messageId: String(messageId),
        }
      }

      const errorMessage = response.data?.reason || response.data?.message || 'Fonnte dispatch rejected'
      logger.warn('Fonnte API returned negative response status', {
        data: response.data,
      })
      return {
        success: false,
        error: String(errorMessage),
      }
    } catch (error: unknown) {
      const err = error as { message?: string; response?: { data?: unknown } }
      logger.error('Failed to dispatch WhatsApp message via Fonnte', {
        target: normalizedTarget,
        error: err.message,
        details: err.response?.data,
      })
      return {
        success: false,
        error: err.message || 'FONNTE_NETWORK_ERROR',
      }
    }
  }
}
