import { Router } from 'express'
import { DestinationController } from '../controllers/destination.controller'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

router.get('/', asyncHandler(DestinationController.list))
router.get('/:id', asyncHandler(DestinationController.get))

export default router
