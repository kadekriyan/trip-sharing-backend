import { Router } from 'express'
import { AuthController } from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validateRequest } from '../middleware/validation'
import { asyncHandler } from '../utils/asyncHandler'
import { authValidator } from '../validators/auth.validator'

const router = Router()

router.post(
  '/register',
  validateRequest(authValidator.register),
  asyncHandler(AuthController.register)
)
router.post('/login', validateRequest(authValidator.login), asyncHandler(AuthController.login))
router.get('/me', authenticate, asyncHandler(AuthController.me))

export default router
