import { Router } from 'express'
import { DestinationController } from '../controllers/destination.controller'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

router.get('/', asyncHandler(DestinationController.list))
router.get('/:idOrSlug', asyncHandler(DestinationController.get))
router.get('/slug/:slug', asyncHandler(DestinationController.getBySlug))

export default router
