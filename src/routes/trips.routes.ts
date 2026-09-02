import { Router } from 'express'
import { TripController } from '../controllers/trip.controller'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

router.get('/', asyncHandler(TripController.list))
router.get('/:id', asyncHandler(TripController.get))
router.get('/:id/availability', asyncHandler(TripController.getAvailability))

export default router
