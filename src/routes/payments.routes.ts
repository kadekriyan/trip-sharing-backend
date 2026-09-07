import { Router } from 'express'
import { PaymentController } from '../controllers/payment.controller'
import { optionalAuth } from '../middleware/auth.middleware'
import { validateRequest } from '../middleware/validation'
import { paymentValidator } from '../validators/payment.validator'
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
router.post(
  '/:id/simulate',
  optionalAuth,
  validateRequest(paymentValidator.simulate),
  asyncHandler(PaymentController.simulatePayment)
)
router.post(
  '/participants/:id/simulate',
  optionalAuth,
  validateRequest(paymentValidator.simulate),
  asyncHandler(PaymentController.simulatePayment)
)
router.post('/webhook', asyncHandler(PaymentController.handleWebhook))

export default router
