import { Router } from 'express'
import { DriverController } from '../controllers/driver.controller'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

router.get('/', asyncHandler(DriverController.list))

export default router
