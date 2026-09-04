import { Router } from 'express'
import { AdminController } from '../controllers/admin.controller'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { validateRequest } from '../middleware/validation'
import { asyncHandler } from '../utils/asyncHandler'
import { articleValidator } from '../validators/article.validator'
import { destinationValidator } from '../validators/destination.validator'
import { driverValidator } from '../validators/driver.validator'
import { participantValidator } from '../validators/participant.validator'
import { tripValidator } from '../validators/trip.validator'

const router = Router()

router.use(authenticate, authorize(['admin']))

// Dashboard & Metrics
router.get('/metrics', asyncHandler(AdminController.getMetrics))
router.get('/audit-logs', asyncHandler(AdminController.getAuditLogs))

// Participants
router.post(
  '/participants',
  validateRequest(participantValidator.adminCreate),
  asyncHandler(AdminController.createParticipant)
)
router.post(
  '/participants/manual',
  validateRequest(participantValidator.adminCreate),
  asyncHandler(AdminController.createParticipant)
)
router.get('/participants', asyncHandler(AdminController.getParticipants))
router.patch(
  '/participants/:id',
  validateRequest(participantValidator.update),
  asyncHandler(AdminController.updateParticipant)
)
router.delete('/participants/:id', asyncHandler(AdminController.deleteParticipant))
router.patch(
  '/participants/:id/move',
  validateRequest(participantValidator.move),
  asyncHandler(AdminController.moveParticipant)
)
router.post(
  '/participants/move-group',
  validateRequest(participantValidator.move),
  asyncHandler(AdminController.moveParticipant)
)

// Destinations
router.post(
  '/destinations',
  validateRequest(destinationValidator.create),
  asyncHandler(AdminController.createDestination)
)
router.get('/destinations', asyncHandler(AdminController.getDestinations))
router.get('/destinations/:id', asyncHandler(AdminController.getDestination))
router.patch(
  '/destinations/:id',
  validateRequest(destinationValidator.update),
  asyncHandler(AdminController.updateDestination)
)
router.put(
  '/destinations/:id',
  validateRequest(destinationValidator.update),
  asyncHandler(AdminController.updateDestination)
)
router.delete('/destinations/:id', asyncHandler(AdminController.deleteDestination))

// Trips
router.post(
  '/trips',
  validateRequest(tripValidator.create),
  asyncHandler(AdminController.createTrip)
)
router.get('/trips', asyncHandler(AdminController.getTrips))
router.get('/trips/:id', asyncHandler(AdminController.getTrip))
router.patch(
  '/trips/:id',
  validateRequest(tripValidator.update),
  asyncHandler(AdminController.updateTrip)
)
router.delete('/trips/:id', asyncHandler(AdminController.deleteTrip))

// Articles & Blogs
router.post(
  '/articles',
  validateRequest(articleValidator.create),
  asyncHandler(AdminController.createArticle)
)
router.get('/articles', asyncHandler(AdminController.getArticles))
router.get('/articles/:id', asyncHandler(AdminController.getArticle))
router.patch(
  '/articles/:id',
  validateRequest(articleValidator.update),
  asyncHandler(AdminController.updateArticle)
)
router.put(
  '/articles/:id',
  validateRequest(articleValidator.update),
  asyncHandler(AdminController.updateArticle)
)
router.delete('/articles/:id', asyncHandler(AdminController.deleteArticle))

router.post(
  '/blogs',
  validateRequest(articleValidator.create),
  asyncHandler(AdminController.createArticle)
)
router.get('/blogs', asyncHandler(AdminController.getArticles))
router.get('/blogs/:id', asyncHandler(AdminController.getArticle))
router.patch(
  '/blogs/:id',
  validateRequest(articleValidator.update),
  asyncHandler(AdminController.updateArticle)
)
router.put(
  '/blogs/:id',
  validateRequest(articleValidator.update),
  asyncHandler(AdminController.updateArticle)
)
router.delete('/blogs/:id', asyncHandler(AdminController.deleteArticle))

// Drivers
router.post(
  '/drivers',
  validateRequest(driverValidator.create),
  asyncHandler(AdminController.createDriver)
)
router.get('/drivers', asyncHandler(AdminController.getDrivers))
router.get('/drivers/:id', asyncHandler(AdminController.getDriver))
router.patch(
  '/drivers/:id',
  validateRequest(driverValidator.update),
  asyncHandler(AdminController.updateDriver)
)
router.put(
  '/drivers/:id',
  validateRequest(driverValidator.update),
  asyncHandler(AdminController.updateDriver)
)
router.delete('/drivers/:id', asyncHandler(AdminController.deleteDriver))

export default router
