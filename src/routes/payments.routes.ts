import { Router } from 'express'
import { PaymentController } from '../controllers/payment.controller'
import { authenticate } from '../middleware/auth.middleware'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

router.post('/participants/:participantId/transaction', authenticate, asyncHandler(PaymentController.createTransaction))
router.post('/webhook', asyncHandler(PaymentController.handleWebhook))

export default router
