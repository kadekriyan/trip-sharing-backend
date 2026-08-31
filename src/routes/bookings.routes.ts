import { Router } from 'express'
import Joi from 'joi'
import { BookingController } from '../controllers/booking.controller'
import { authenticate } from '../middleware/auth.middleware'
import { verifyCaptcha } from '../middleware/captcha.middleware'
import { validateRequest } from '../middleware/validation'
import { asyncHandler } from '../utils/asyncHandler'
import { bookingValidator } from '../validators/booking.validator'

const router = Router()

router.get(
  '/groups',
  validateRequest(
    Joi.object({ destination_id: Joi.number().integer().positive().required(), departure_date: Joi.date().iso().required() }),
    'query'
  ),
  asyncHandler(BookingController.getAvailableGroups)
)

router.post('/', authenticate, verifyCaptcha, validateRequest(bookingValidator.create), asyncHandler(BookingController.createBooking))
router.get('/my-bookings', authenticate, asyncHandler(BookingController.getUserBookings))

export default router
