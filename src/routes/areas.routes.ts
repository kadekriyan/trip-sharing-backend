import { Router } from 'express'
import { AreaController } from '../controllers/area.controller'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { validateRequest } from '../middleware/validation'
import { asyncHandler } from '../utils/asyncHandler'
import { areaValidator } from '../validators/area.validator'

const router = Router()

// Public routes
router.get('/', asyncHandler(AreaController.list))
router.get('/:id', asyncHandler(AreaController.get))

// Admin-only management routes
router.post(
  '/',
  authenticate,
  authorize(['admin']),
  validateRequest(areaValidator.create),
  asyncHandler(AreaController.create)
)

router.patch(
  '/:id',
  authenticate,
  authorize(['admin']),
  validateRequest(areaValidator.update),
  asyncHandler(AreaController.update)
)

router.put(
  '/:id',
  authenticate,
  authorize(['admin']),
  validateRequest(areaValidator.update),
  asyncHandler(AreaController.update)
)

router.delete(
  '/:id',
  authenticate,
  authorize(['admin']),
  asyncHandler(AreaController.delete)
)

export default router
