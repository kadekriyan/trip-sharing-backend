import { prisma } from '../../src/config/database'
import { ReviewService } from '../../src/services/review.service'
import { FonnteService } from '../../src/services/fonnte.service'
import { TripService } from '../../src/services/trip.service'
import { ApiError } from '../../src/utils/errors'
import axios from 'axios'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('Review & Fonnte Service Unit Tests', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('FonnteService', () => {
    it('normalizes Indonesian phone numbers correctly', () => {
      expect(FonnteService.normalizePhoneNumber('081234567890')).toBe('6281234567890')
      expect(FonnteService.normalizePhoneNumber('+62 812-3456-7890')).toBe('6281234567890')
      expect(FonnteService.normalizePhoneNumber('81234567890')).toBe('6281234567890')
      expect(FonnteService.normalizePhoneNumber('6281234567890')).toBe('6281234567890')
    })

    it('formats review invitation message cleanly with relevant details', () => {
      const msg = FonnteService.formatReviewInvitation({
        customerName: 'Budi Santoso',
        destinationTitle: 'Sunrise Bromo Sharing Tour',
        departureDate: '2026-10-25',
        reviewUrl: 'https://javasharedtour.co.id/review/token-xyz',
      })

      expect(msg).toContain('Budi Santoso')
      expect(msg).toContain('Sunrise Bromo Sharing Tour')
      expect(msg).toContain('https://javasharedtour.co.id/review/token-xyz')
      expect(msg).toContain('⭐')
    })

    it('returns error when FONNTE_TOKEN is not configured', async () => {
      delete process.env.FONNTE_TOKEN
      delete process.env.FONNTE_API_KEY

      const result = await FonnteService.sendMessage('08123456789', 'Halo testing')
      expect(result.success).toBe(false)
      expect(result.error).toBe('FONNTE_TOKEN_NOT_CONFIGURED')
    })

    it('returns error when phone number is invalid or too short', async () => {
      process.env.FONNTE_TOKEN = 'mock-fonnte-token'
      const result = await FonnteService.sendMessage('123', 'Halo testing')
      expect(result.success).toBe(false)
      expect(result.error).toBe('INVALID_PHONE_NUMBER')
    })

    it('successfully sends message when Fonnte API returns status true', async () => {
      process.env.FONNTE_TOKEN = 'mock-fonnte-token'
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          status: true,
          id: ['msg-12345'],
          target: ['6281234567890'],
        },
      })

      const result = await FonnteService.sendMessage('081234567890', 'Pesan review')
      expect(result.success).toBe(true)
      expect(result.messageId).toBe('msg-12345')
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.fonnte.com/send',
        expect.objectContaining({
          target: '6281234567890',
          message: 'Pesan review',
        }),
        expect.objectContaining({
          headers: { Authorization: 'mock-fonnte-token' },
        })
      )
    })

    it('handles negative API responses or exceptions gracefully', async () => {
      process.env.FONNTE_TOKEN = 'mock-fonnte-token'
      mockedAxios.post.mockRejectedValueOnce(new Error('Network timeout'))

      const result = await FonnteService.sendMessage('081234567890', 'Pesan review')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Network timeout')
    })
  })

  describe('TripService.completeTrip', () => {
    it('marks trip as completed in database', async () => {
      const mockTrip = {
        id: 'trip-101',
        status: 'scheduled',
        destination_id: 'dest-1',
        destination: { name: 'Bromo' },
        guide: null,
        booking_groups: [],
      }

      jest.spyOn(TripService, 'get').mockResolvedValueOnce(mockTrip as never)
      const updateSpy = jest.spyOn(prisma.trip, 'update').mockResolvedValueOnce({
        ...mockTrip,
        status: 'completed',
      } as never)

      const result = await TripService.completeTrip('trip-101')
      expect(result.status).toBe('completed')
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: '101' },
        data: { status: 'completed' },
        include: { destination: true, guide: true, booking_groups: true },
      })
    })

    it('returns existing trip directly if already completed', async () => {
      const mockTrip = {
        id: 'trip-102',
        status: 'completed',
        destination: { name: 'Ijen' },
      }
      jest.spyOn(TripService, 'get').mockResolvedValueOnce(mockTrip as never)
      const updateSpy = jest.spyOn(prisma.trip, 'update')

      const result = await TripService.completeTrip('trip-102')
      expect(result.status).toBe('completed')
      expect(updateSpy).not.toHaveBeenCalled()
    })
  })

  describe('ReviewService Token Verification & Submission', () => {
    it('verifies a valid token for an unsubmitted review', async () => {
      const mockReview = {
        id: 'rev-1',
        review_token: 'token-abc',
        is_submitted: false,
        trip_id: 'trip-1',
        destination_id: 'dest-1',
        participant_id: 'part-1',
        destination: { name: 'Bromo Sunrise', slug: 'bromo-sunrise', image_url: '/bromo.jpg' },
        trip: { departure_date: new Date('2026-10-20') },
        participant: { full_name: 'Dewi Lestari' },
      }

      jest.spyOn(prisma.review, 'findUnique').mockResolvedValueOnce(mockReview as never)

      const res = await ReviewService.verifyToken('token-abc')
      expect(res.isValid).toBe(true)
      expect(res.isSubmitted).toBe(false)
      expect(res.participantName).toBe('Dewi Lestari')
      expect(res.destinationTitle).toBe('Bromo Sunrise')
    })

    it('throws 404 when token is not found', async () => {
      jest.spyOn(prisma.review, 'findUnique').mockResolvedValueOnce(null)

      await expect(ReviewService.verifyToken('invalid-token')).rejects.toThrow(ApiError)
    })

    it('submits a verified review successfully', async () => {
      const mockReview = {
        id: 'rev-2',
        review_token: 'token-xyz',
        is_submitted: false,
        participant_id: 'part-2',
        destination_id: 'dest-2',
      }

      jest.spyOn(prisma.review, 'findUnique').mockResolvedValueOnce(mockReview as never)
      const updateSpy = jest.spyOn(prisma.review, 'update').mockResolvedValueOnce({
        ...mockReview,
        rating: 5,
        comment: 'Sangat recommended!',
        status: 'PENDING',
        is_submitted: true,
      } as never)

      const result = await ReviewService.submitReview('token-xyz', {
        rating: 5,
        comment: 'Sangat recommended!',
      })

      expect(result.status).toBe('PENDING')
      expect(result.is_submitted).toBe(true)
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rev-2' },
          data: expect.objectContaining({
            rating: 5,
            comment: 'Sangat recommended!',
            status: 'PENDING',
            is_submitted: true,
          }),
        })
      )
    })

    it('throws 400 when submitting review on already-submitted token (double-submit protection)', async () => {
      const mockReview = {
        id: 'rev-3',
        review_token: 'token-used',
        is_submitted: true,
      }

      jest.spyOn(prisma.review, 'findUnique').mockResolvedValueOnce(mockReview as never)

      await expect(
        ReviewService.submitReview('token-used', {
          rating: 4,
          comment: 'Mencoba submit lagi',
        })
      ).rejects.toThrow(ApiError)
    })
  })

  describe('ReviewService Moderation & Destination Rating Recalculation', () => {
    it('approves a review and recalculates destination rating', async () => {
      const mockReview = {
        id: 'rev-10',
        destination_id: 'dest-10',
        status: 'PENDING',
      }

      jest.spyOn(prisma.review, 'findUnique').mockResolvedValueOnce(mockReview as never)
      jest.spyOn(prisma.review, 'update').mockResolvedValueOnce({
        ...mockReview,
        status: 'APPROVED',
      } as never)

      // Mock recalculateDestinationRating
      jest.spyOn(prisma.review, 'findMany').mockResolvedValueOnce([
        { rating: 5 },
        { rating: 4 },
      ] as never)

      const destUpdateSpy = jest.spyOn(prisma.destination, 'update').mockResolvedValueOnce({} as never)

      const result = await ReviewService.moderateReview('rev-10', { status: 'APPROVED' })
      expect(result.status).toBe('APPROVED')
      expect(destUpdateSpy).toHaveBeenCalledWith({
        where: { id: 'dest-10' },
        data: {
          rating: 4.5,
          total_reviews: 2,
        },
      })
    })

    it('saves admin reply successfully', async () => {
      const mockReview = { id: 'rev-20', admin_reply: null }
      jest.spyOn(prisma.review, 'findUnique').mockResolvedValueOnce(mockReview as never)
      const updateSpy = jest.spyOn(prisma.review, 'update').mockResolvedValueOnce({
        ...mockReview,
        admin_reply: 'Terima kasih atas reviewnya!',
        replied_by: 'admin-1',
      } as never)

      const result = await ReviewService.replyReview('rev-20', 'Terima kasih atas reviewnya!', 'admin-1')
      expect(result.admin_reply).toBe('Terima kasih atas reviewnya!')
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rev-20' },
          data: expect.objectContaining({
            admin_reply: 'Terima kasih atas reviewnya!',
            replied_by: 'admin-1',
          }),
        })
      )
    })
  })

  describe('ReviewService sendTripReviewInvites', () => {
    it('creates review tokens and dispatches WhatsApp messages to paid participants', async () => {
      const mockTrip = {
        id: 'trip-99',
        destination_id: 'dest-99',
        departure_date: new Date('2026-10-15'),
        destination: { name: 'Tumpak Sewu' },
        booking_groups: [
          {
            participants: [
              {
                id: 'part-1',
                full_name: 'Andi',
                phone_number: '081234567890',
                payment_status: 'paid',
                user_id: 'user-1',
              },
              {
                id: 'part-2',
                full_name: 'Budi (Unpaid)',
                phone_number: '081234567891',
                payment_status: 'pending',
                user_id: null,
              },
            ],
          },
        ],
      }

      jest.spyOn(prisma.trip, 'findUnique').mockResolvedValueOnce(mockTrip as never)
      // part-1 has no review yet
      jest.spyOn(prisma.review, 'findUnique').mockResolvedValueOnce(null)
      jest.spyOn(prisma.review, 'create').mockResolvedValueOnce({
        id: 'new-rev-1',
        participant_id: 'part-1',
        review_token: 'generated-token-123',
        is_submitted: false,
      } as never)

      jest.spyOn(FonnteService, 'sendMessage').mockResolvedValueOnce({
        success: true,
        messageId: 'msg-999',
      })

      const result = await ReviewService.sendTripReviewInvites('trip-99', 'https://javasharedtour.co.id')

      expect(result.totalParticipants).toBe(1) // only paid participant
      expect(result.sentCount).toBe(1)
      expect(result.results[0].reviewToken).toBe('generated-token-123')
      expect(result.results[0].reviewUrl).toBe('https://javasharedtour.co.id/review/generated-token-123')
      expect(result.results[0].status).toBe('SENT')
    })
  })
})
