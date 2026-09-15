import { Router } from 'express'
import adminRoutes from './admin.routes'
import areaRoutes from './areas.routes'
import articleRoutes from './articles.routes'
import authRoutes from './auth.routes'
import blogRoutes from './blogs.routes'
import bookingRoutes from './bookings.routes'
import destinationRoutes from './destinations.routes'
import driverRoutes from './drivers.routes'
import participantRoutes from './participants.routes'
import paymentRoutes from './payments.routes'
import tripRoutes from './trips.routes'
import uploadRoutes from './upload.routes'
import vehicleRoutes from './vehicles.routes'

export const routes = Router()

routes.use('/auth', authRoutes)
routes.use('/admin', adminRoutes)
routes.use('/destinations', destinationRoutes)
routes.use('/trips', tripRoutes)
routes.use('/bookings', bookingRoutes)
routes.use('/payments', paymentRoutes)
routes.use('/participants', participantRoutes)
routes.use('/articles', articleRoutes)
routes.use('/blogs', blogRoutes)
routes.use('/areas', areaRoutes)
routes.use('/drivers', driverRoutes)
routes.use('/vehicles', vehicleRoutes)
routes.use('/armada', vehicleRoutes)
routes.use('/upload', uploadRoutes)
routes.use('/admin/upload', uploadRoutes)
