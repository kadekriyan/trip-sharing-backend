import { Router } from 'express'
import { AdminController } from '../controllers/admin.controller'
import { AreaController } from '../controllers/area.controller'
import { GroupController } from '../controllers/group.controller'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { validateRequest } from '../middleware/validation'
import { asyncHandler } from '../utils/asyncHandler'
import { areaValidator } from '../validators/area.validator'
import { articleValidator } from '../validators/article.validator'
import { destinationValidator } from '../validators/destination.validator'
import { driverValidator } from '../validators/driver.validator'
import { groupValidator } from '../validators/group.validator'
import { participantValidator } from '../validators/participant.validator'
import { tripValidator } from '../validators/trip.validator'
import { vehicleValidator } from '../validators/vehicle.validator'

const router = Router()

router.use(authenticate, authorize(['admin']))

// Dashboard & Metrics
router.get('/metrics', asyncHandler(AdminController.getMetrics))
router.get('/audit-logs', asyncHandler(AdminController.getAuditLogs))

// Booking Groups & Fleet Management
router.post(
  '/groups',
  validateRequest(groupValidator.create),
  asyncHandler(GroupController.createGroup)
)
router.get('/groups', asyncHandler(GroupController.listGroups))
router.get('/groups/:id', asyncHandler(GroupController.getGroup))
router.patch(
  '/groups/:id',
  validateRequest(groupValidator.update),
  asyncHandler(GroupController.updateGroup)
)
router.patch(
  '/groups/:id/driver',
  validateRequest(groupValidator.assignDriver),
  asyncHandler(GroupController.assignDriver)
)
router.post(
  '/groups/:id/assign-driver',
  validateRequest(groupValidator.assignDriver),
  asyncHandler(GroupController.assignDriver)
)
router.patch(
  '/groups/:id/vehicle',
  validateRequest(groupValidator.assignVehicle),
  asyncHandler(GroupController.assignVehicle)
)
router.post(
  '/groups/:id/assign-vehicle',
  validateRequest(groupValidator.assignVehicle),
  asyncHandler(GroupController.assignVehicle)
)
router.delete('/groups/:id', asyncHandler(GroupController.deleteGroup))


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
router.post(
  '/drivers/:id/assign-vehicle',
  validateRequest(driverValidator.assignVehicle),
  asyncHandler(AdminController.assignVehicleToDriver)
)
router.patch(
  '/drivers/:id/vehicle',
  validateRequest(driverValidator.assignVehicle),
  asyncHandler(AdminController.assignVehicleToDriver)
)
router.delete('/drivers/:id', asyncHandler(AdminController.deleteDriver))

// Vehicles (Armada)
router.post(
  '/vehicles',
  validateRequest(vehicleValidator.create),
  asyncHandler(AdminController.createVehicle)
)
router.get('/vehicles', asyncHandler(AdminController.getVehicles))
router.get('/vehicles/:id', asyncHandler(AdminController.getVehicle))
router.patch(
  '/vehicles/:id',
  validateRequest(vehicleValidator.update),
  asyncHandler(AdminController.updateVehicle)
)
router.put(
  '/vehicles/:id',
  validateRequest(vehicleValidator.update),
  asyncHandler(AdminController.updateVehicle)
)
router.post(
  '/vehicles/:id/assign-driver',
  validateRequest(vehicleValidator.assignDriver),
  asyncHandler(AdminController.assignDriverToVehicle)
)
router.patch(
  '/vehicles/:id/driver',
  validateRequest(vehicleValidator.assignDriver),
  asyncHandler(AdminController.assignDriverToVehicle)
)
router.delete('/vehicles/:id', asyncHandler(AdminController.deleteVehicle))

// Armada Aliases
router.post(
  '/armada',
  validateRequest(vehicleValidator.create),
  asyncHandler(AdminController.createVehicle)
)
router.get('/armada', asyncHandler(AdminController.getVehicles))
router.get('/armada/:id', asyncHandler(AdminController.getVehicle))
router.patch(
  '/armada/:id',
  validateRequest(vehicleValidator.update),
  asyncHandler(AdminController.updateVehicle)
)
router.put(
  '/armada/:id',
  validateRequest(vehicleValidator.update),
  asyncHandler(AdminController.updateVehicle)
)
router.post(
  '/armada/:id/assign-driver',
  validateRequest(vehicleValidator.assignDriver),
  asyncHandler(AdminController.assignDriverToVehicle)
)
router.patch(
  '/armada/:id/driver',
  validateRequest(vehicleValidator.assignDriver),
  asyncHandler(AdminController.assignDriverToVehicle)
)
router.delete('/armada/:id', asyncHandler(AdminController.deleteVehicle))

// Areas (Wilayah Operasional)
router.post(
  '/areas',
  validateRequest(areaValidator.create),
  asyncHandler(AreaController.create)
)
router.get('/areas', asyncHandler(AreaController.list))
router.get('/areas/:id', asyncHandler(AreaController.get))
router.patch(
  '/areas/:id',
  validateRequest(areaValidator.update),
  asyncHandler(AreaController.update)
)
router.put(
  '/areas/:id',
  validateRequest(areaValidator.update),
  asyncHandler(AreaController.update)
)
router.delete('/areas/:id', asyncHandler(AreaController.delete))

export default router
