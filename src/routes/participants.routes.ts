import { Router } from 'express'
import { ParticipantController } from '../controllers/participant.controller'
import { authenticate } from '../middleware/auth.middleware'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

router.get('/me', authenticate, asyncHandler(ParticipantController.getMyParticipants))

export default router
