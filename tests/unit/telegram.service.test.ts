import axios from 'axios'
import { TelegramService } from '../../src/services/telegram.service'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('TelegramService', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('sendMessage', () => {
    it('should skip sending and return false when TELEGRAM_BOT_TOKEN is missing', async () => {
      delete process.env.TELEGRAM_BOT_TOKEN
      process.env.TELEGRAM_CHAT_ID = '-100123456789'

      const result = await TelegramService.sendMessage('Test Message')
      expect(result).toBe(false)
      expect(mockedAxios.post).not.toHaveBeenCalled()
    })

    it('should skip sending and return false when TELEGRAM_CHAT_ID is missing', async () => {
      process.env.TELEGRAM_BOT_TOKEN = '123456:ABC-DEF'
      delete process.env.TELEGRAM_CHAT_ID

      const result = await TelegramService.sendMessage('Test Message')
      expect(result).toBe(false)
      expect(mockedAxios.post).not.toHaveBeenCalled()
    })

    it('should send message to Telegram API with default HTML parse mode when configured', async () => {
      process.env.TELEGRAM_BOT_TOKEN = '123456:ABC-DEF'
      process.env.TELEGRAM_CHAT_ID = '-100123456789'

      mockedAxios.post.mockResolvedValueOnce({
        data: { ok: true, result: { message_id: 101 } },
      })

      const result = await TelegramService.sendMessage('Hello Telegram')
      expect(result).toBe(true)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.telegram.org/bot123456:ABC-DEF/sendMessage',
        {
          chat_id: '-100123456789',
          text: 'Hello Telegram',
          parse_mode: 'HTML',
        },
        expect.objectContaining({ timeout: 8000 })
      )
    })

    it('should support custom options like messageThreadId and custom chatId', async () => {
      process.env.TELEGRAM_BOT_TOKEN = '123456:ABC-DEF'
      process.env.TELEGRAM_CHAT_ID = '-100123456789'

      mockedAxios.post.mockResolvedValueOnce({
        data: { ok: true, result: { message_id: 102 } },
      })

      const result = await TelegramService.sendMessage('Threaded Message', {
        chatId: '-100999999',
        messageThreadId: 42,
        parseMode: 'Markdown',
      })

      expect(result).toBe(true)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.telegram.org/bot123456:ABC-DEF/sendMessage',
        {
          chat_id: '-100999999',
          message_thread_id: 42,
          text: 'Threaded Message',
          parse_mode: 'Markdown',
        },
        expect.objectContaining({ timeout: 8000 })
      )
    })

    it('should return false gracefully when Telegram API returns ok: false', async () => {
      process.env.TELEGRAM_BOT_TOKEN = '123456:ABC-DEF'
      process.env.TELEGRAM_CHAT_ID = '-100123456789'

      mockedAxios.post.mockResolvedValueOnce({
        data: { ok: false, description: 'Chat not found' },
      })

      const result = await TelegramService.sendMessage('Failing Message')
      expect(result).toBe(false)
    })

    it('should catch network errors gracefully and return false without throwing', async () => {
      process.env.TELEGRAM_BOT_TOKEN = '123456:ABC-DEF'
      process.env.TELEGRAM_CHAT_ID = '-100123456789'

      mockedAxios.post.mockRejectedValueOnce(new Error('Network timeout'))

      const result = await TelegramService.sendMessage('Timeout Message')
      expect(result).toBe(false)
    })
  })

  describe('sendNewBookingNotification', () => {
    it('should format and send new booking message correctly', async () => {
      process.env.TELEGRAM_BOT_TOKEN = '123456:ABC-DEF'
      process.env.TELEGRAM_CHAT_ID = '-100123456789'

      mockedAxios.post.mockResolvedValueOnce({
        data: { ok: true, result: { message_id: 201 } },
      })

      const result = await TelegramService.sendNewBookingNotification({
        bookingCode: 'TRV-8821',
        customerName: 'Ahmad Fauzi',
        customerPhone: '+628123456789',
        customerEmail: 'ahmad@example.com',
        destinationName: 'Sunrise Sikunir & Telaga Warna Dieng',
        tripDate: new Date('2026-10-15T00:00:00.000Z'),
        paxCount: 2,
        packageType: 'ALL_IN',
        pickupLocation: 'Hotel Tentrem Yogyakarta',
        totalAmount: 700000,
        paymentStatus: 'pending',
      })

      expect(result).toBe(true)
      expect(mockedAxios.post).toHaveBeenCalledTimes(1)

      const payload = mockedAxios.post.mock.calls[0][1] as { text: string }
      expect(payload.text).toContain('PESANAN BARU MASUK')
      expect(payload.text).toContain('TRV-8821')
      expect(payload.text).toContain('Ahmad Fauzi')
      expect(payload.text).toContain('+628123456789')
      expect(payload.text).toContain('Sunrise Sikunir & Telaga Warna Dieng')
      expect(payload.text).toContain('2 Orang (Pax)')
      expect(payload.text).toContain('All-In (Termasuk Tiket)')
      expect(payload.text).toContain('Hotel Tentrem Yogyakarta')
      expect(payload.text).toContain('700.000')
    })

    it('should handle array of booking codes and transport only package', async () => {
      process.env.TELEGRAM_BOT_TOKEN = '123456:ABC-DEF'
      process.env.TELEGRAM_CHAT_ID = '-100123456789'

      mockedAxios.post.mockResolvedValueOnce({
        data: { ok: true, result: { message_id: 202 } },
      })

      const result = await TelegramService.sendNewBookingNotification({
        bookingCode: ['TRV-1001', 'TRV-1002'],
        customerName: 'Budi Santoso (+1 lainnya)',
        destinationName: 'Pantai Timang Gondola',
        tripDate: '2026-11-01',
        paxCount: 2,
        packageType: 'TRANSPORT_ONLY',
        totalAmount: '450000',
      })

      expect(result).toBe(true)
      const payload = mockedAxios.post.mock.calls[0][1] as { text: string }
      expect(payload.text).toContain('TRV-1001, TRV-1002')
      expect(payload.text).toContain('Transport Only')
    })
  })

  describe('sendPaymentSuccessNotification', () => {
    it('should format and send payment success message correctly', async () => {
      process.env.TELEGRAM_BOT_TOKEN = '123456:ABC-DEF'
      process.env.TELEGRAM_CHAT_ID = '-100123456789'

      mockedAxios.post.mockResolvedValueOnce({
        data: { ok: true, result: { message_id: 301 } },
      })

      const result = await TelegramService.sendPaymentSuccessNotification({
        orderId: 'TRIP-part-99-1726800000',
        bookingCode: 'TRV-8821',
        customerName: 'Ahmad Fauzi',
        customerEmail: 'ahmad@example.com',
        destinationName: 'Sunrise Sikunir & Telaga Warna Dieng',
        tripDate: new Date('2026-10-15T00:00:00.000Z'),
        paxCount: 2,
        amount: 700000,
        paymentMethod: 'qris',
        paidAt: new Date('2026-10-10T14:30:00.000Z'),
      })

      expect(result).toBe(true)
      expect(mockedAxios.post).toHaveBeenCalledTimes(1)

      const payload = mockedAxios.post.mock.calls[0][1] as { text: string }
      expect(payload.text).toContain('PEMBAYARAN TERKONFIRMASI LUNAS')
      expect(payload.text).toContain('TRIP-part-99-1726800000')
      expect(payload.text).toContain('TRV-8821')
      expect(payload.text).toContain('Ahmad Fauzi')
      expect(payload.text).toContain('Sunrise Sikunir & Telaga Warna Dieng')
      expect(payload.text).toContain('qris')
      expect(payload.text).toContain('700.000')
      expect(payload.text).toContain('SUCCESS / SETTLEMENT')
    })
  })
})
