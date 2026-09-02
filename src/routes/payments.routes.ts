import { Router } from 'express'
import { PaymentController } from '../controllers/payment.controller'
import { optionalAuth } from '../middleware/auth.middleware'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

router.post(
  '/:participantId/snap-token',
  optionalAuth,
  asyncHandler(PaymentController.createTransaction)
)
router.post(
  '/participants/:participantId/transaction',
  optionalAuth,
  asyncHandler(PaymentController.createTransaction)
)
router.post('/webhook', asyncHandler(PaymentController.handleWebhook))

export default router
