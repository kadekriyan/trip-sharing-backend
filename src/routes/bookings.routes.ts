import { Router } from 'express'
import Joi from 'joi'
import { BookingController } from '../controllers/booking.controller'
import { optionalAuth } from '../middleware/auth.middleware'
import { verifyCaptcha } from '../middleware/captcha.middleware'
import { validateRequest } from '../middleware/validation'
import { asyncHandler } from '../utils/asyncHandler'
import { bookingValidator } from '../validators/booking.validator'

const router = Router()

router.get(
  '/groups',
  validateRequest(
    Joi.object({
      destination_id: Joi.string().optional(),
      destinationId: Joi.string().optional(),
      departure_date: Joi.date().iso().optional(),
      departureDate: Joi.date().iso().optional(),
    })
      .or('destination_id', 'destinationId')
      .or('departure_date', 'departureDate'),
    'query'
  ),
  asyncHandler(BookingController.getAvailableGroups)
)

router.post(
  '/',
  optionalAuth,
  verifyCaptcha,
  validateRequest(bookingValidator.create),
  asyncHandler(BookingController.createBooking)
)

router.post(
  '/bulk',
  optionalAuth,
  verifyCaptcha,
  validateRequest(bookingValidator.bulkCreate),
  asyncHandler(BookingController.createBulkBooking)
)

router.post(
  '/batch',
  optionalAuth,
  verifyCaptcha,
  validateRequest(bookingValidator.bulkCreate),
  asyncHandler(BookingController.createBulkBooking)
)

router.get('/my-bookings', optionalAuth, asyncHandler(BookingController.getUserBookings))
router.get('/invoice/:identifier', optionalAuth, asyncHandler(BookingController.getInvoice))
router.get('/:identifier/invoice', optionalAuth, asyncHandler(BookingController.getInvoice))

export default router
