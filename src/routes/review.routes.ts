import { Router } from 'express'
import { ReviewController } from '../controllers/review.controller'
import { validateRequest } from '../middleware/validation'
import { asyncHandler } from '../utils/asyncHandler'
import { reviewValidator } from '../validators/review.validator'

const router = Router()

// Verifikasi token ulasan sebelum form dibuka
router.get('/verify/:token', asyncHandler(ReviewController.verifyToken))

// Kirim ulasan oleh customer dengan token terverifikasi
router.post(
  '/submit/:token',
  validateRequest(reviewValidator.submitReview),
  asyncHandler(ReviewController.submitReview)
)

// Ambil ulasan yang di-approve untuk halaman destinasi
router.get('/destination/:idOrSlug', asyncHandler(ReviewController.listApprovedByDestination))

export default router
