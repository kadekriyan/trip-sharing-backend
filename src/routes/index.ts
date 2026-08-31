import { Router } from 'express'
import authRoutes from './auth.routes'
import adminRoutes from './admin.routes'
import destinationRoutes from './destinations.routes'
import bookingRoutes from './bookings.routes'
import paymentRoutes from './payments.routes'
import participantRoutes from './participants.routes'
import articleRoutes from './articles.routes'
import driverRoutes from './drivers.routes'

export const routes = Router()

routes.use('/auth', authRoutes)
routes.use('/admin', adminRoutes)
routes.use('/destinations', destinationRoutes)
routes.use('/bookings', bookingRoutes)
routes.use('/payments', paymentRoutes)
routes.use('/participants', participantRoutes)
routes.use('/articles', articleRoutes)
routes.use('/drivers', driverRoutes)
