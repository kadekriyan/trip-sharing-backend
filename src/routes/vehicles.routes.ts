import { Router } from 'express'
import { VehicleController } from '../controllers/vehicle.controller'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { validateRequest } from '../middleware/validation'
import { asyncHandler } from '../utils/asyncHandler'
import { vehicleValidator } from '../validators/vehicle.validator'

const router = Router()

// Public routes (Read-only)
router.get('/', asyncHandler(VehicleController.listVehicles))
router.get('/:id', asyncHandler(VehicleController.getVehicle))

// Protected Admin routes
router.post(
  '/',
  authenticate,
  authorize(['admin']),
  validateRequest(vehicleValidator.create),
  asyncHandler(VehicleController.createVehicle)
)

router.patch(
  '/:id',
  authenticate,
  authorize(['admin']),
  validateRequest(vehicleValidator.update),
  asyncHandler(VehicleController.updateVehicle)
)

router.put(
  '/:id',
  authenticate,
  authorize(['admin']),
  validateRequest(vehicleValidator.update),
  asyncHandler(VehicleController.updateVehicle)
)

router.post(
  '/:id/assign-driver',
  authenticate,
  authorize(['admin']),
  validateRequest(vehicleValidator.assignDriver),
  asyncHandler(VehicleController.assignDriver)
)

router.patch(
  '/:id/driver',
  authenticate,
  authorize(['admin']),
  validateRequest(vehicleValidator.assignDriver),
  asyncHandler(VehicleController.assignDriver)
)

router.delete(
  '/:id',
  authenticate,
  authorize(['admin']),
  asyncHandler(VehicleController.deleteVehicle)
)

export default router
