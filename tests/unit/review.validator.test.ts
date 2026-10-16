import { reviewValidator, validateReviewSchema } from '../../src/validators/review.validator'
import { ValidationError } from '../../src/utils/errors'

describe('Review Validator Unit Tests', () => {
  describe('submitReview', () => {
    it('validates a correct review submission payload', () => {
      const payload = {
        rating: 5,
        comment: 'Pelayanan sangat memuaskan, driver ramah dan tepat waktu.',
      }

      const result = validateReviewSchema<{ rating: number; comment: string }>(
        reviewValidator.submitReview,
        payload
      )
      expect(result.rating).toBe(5)
      expect(result.comment).toBe(payload.comment)
    })

    it('accepts boundary ratings 1 and 5', () => {
      const minReview = validateReviewSchema<{ rating: number; comment: string }>(
        reviewValidator.submitReview,
        { rating: 1, comment: 'Kurang memuaskan' }
      )
      expect(minReview.rating).toBe(1)

      const maxReview = validateReviewSchema<{ rating: number; comment: string }>(
        reviewValidator.submitReview,
        { rating: 5, comment: 'Sangat luar biasa' }
      )
      expect(maxReview.rating).toBe(5)
    })

    it('throws ValidationError when rating is less than 1', () => {
      expect(() => {
        validateReviewSchema(reviewValidator.submitReview, {
          rating: 0,
          comment: 'Komentar pengujian rating 0',
        })
      }).toThrow(ValidationError)
    })

    it('throws ValidationError when rating exceeds 5', () => {
      expect(() => {
        validateReviewSchema(reviewValidator.submitReview, {
          rating: 6,
          comment: 'Komentar pengujian rating 6',
        })
      }).toThrow(ValidationError)
    })

    it('throws ValidationError when comment is too short (< 3 chars)', () => {
      expect(() => {
        validateReviewSchema(reviewValidator.submitReview, {
          rating: 4,
          comment: 'ok',
        })
      }).toThrow(ValidationError)
    })

    it('throws ValidationError when rating is missing', () => {
      expect(() => {
        validateReviewSchema(reviewValidator.submitReview, {
          comment: 'Komentar tanpa rating',
        })
      }).toThrow(ValidationError)
    })
  })

  describe('moderateReview', () => {
    it('validates APPROVED status', () => {
      const result = validateReviewSchema<{ status: string }>(
        reviewValidator.moderateReview,
        { status: 'APPROVED' }
      )
      expect(result.status).toBe('APPROVED')
    })

    it('validates REJECTED status with rejection_reason', () => {
      const result = validateReviewSchema<{ status: string; rejection_reason?: string }>(
        reviewValidator.moderateReview,
        { status: 'REJECTED', rejection_reason: 'Mengandung kata kasar atau spam' }
      )
      expect(result.status).toBe('REJECTED')
      expect(result.rejection_reason).toBe('Mengandung kata kasar atau spam')
    })

    it('throws ValidationError for invalid moderation status (e.g. PENDING or INVALID)', () => {
      expect(() => {
        validateReviewSchema(reviewValidator.moderateReview, { status: 'PENDING' })
      }).toThrow(ValidationError)

      expect(() => {
        validateReviewSchema(reviewValidator.moderateReview, { status: 'DELETED' })
      }).toThrow(ValidationError)
    })
  })

  describe('adminReply', () => {
    it('validates admin reply with snake_case admin_reply', () => {
      const result = validateReviewSchema<{ admin_reply?: string }>(
        reviewValidator.adminReply,
        { admin_reply: 'Terima kasih telah berbagi pengalaman bersama kami!' }
      )
      expect(result.admin_reply).toBe('Terima kasih telah berbagi pengalaman bersama kami!')
    })

    it('validates admin reply with camelCase adminReply', () => {
      const result = validateReviewSchema<{ adminReply?: string }>(
        reviewValidator.adminReply,
        { adminReply: 'Kami senang Anda menikmati perjalanan ke Bromo!' }
      )
      expect(result.adminReply).toBe('Kami senang Anda menikmati perjalanan ke Bromo!')
    })

    it('validates admin reply with generic reply field', () => {
      const result = validateReviewSchema<{ reply?: string }>(
        reviewValidator.adminReply,
        { reply: 'Terima kasih atas kunjungannya!' }
      )
      expect(result.reply).toBe('Terima kasih atas kunjungannya!')
    })

    it('throws ValidationError if reply text is empty or too short', () => {
      expect(() => {
        validateReviewSchema(reviewValidator.adminReply, { adminReply: 'a' })
      }).toThrow(ValidationError)

      expect(() => {
        validateReviewSchema(reviewValidator.adminReply, {})
      }).toThrow(ValidationError)
    })
  })

  describe('sendInvites', () => {
    it('validates sendInvites with trip_id or tripId', () => {
      const res1 = validateReviewSchema<{ trip_id?: string }>(
        reviewValidator.sendInvites,
        { trip_id: 'trip-123' }
      )
      expect(res1.trip_id).toBe('trip-123')

      const res2 = validateReviewSchema<{ tripId?: string }>(
        reviewValidator.sendInvites,
        { tripId: 'trip-456' }
      )
      expect(res2.tripId).toBe('trip-456')
    })

    it('throws ValidationError if trip id is missing', () => {
      expect(() => {
        validateReviewSchema(reviewValidator.sendInvites, {})
      }).toThrow(ValidationError)
    })
  })
})
