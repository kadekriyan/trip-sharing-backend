import { Router } from 'express'
import authRoutes from './auth.routes'
import adminRoutes from './admin.routes'
import destinationRoutes from './destinations.routes'
import tripRoutes from './trips.routes'
import bookingRoutes from './bookings.routes'
import paymentRoutes from './payments.routes'
import participantRoutes from './participants.routes'
import articleRoutes from './articles.routes'
import blogRoutes from './blogs.routes'
import driverRoutes from './drivers.routes'
import uploadRoutes from './upload.routes'

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
routes.use('/drivers', driverRoutes)
routes.use('/upload', uploadRoutes)
routes.use('/admin/upload', uploadRoutes)
