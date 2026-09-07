import { Router } from 'express'
import { UploadController } from '../controllers/upload.controller'
import { optionalAuth } from '../middleware/auth.middleware'
import { uploadMiddleware } from '../middleware/upload'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

// Single file upload (support field name: 'image' or 'file')
router.post(
  '/',
  optionalAuth,
  uploadMiddleware.single('image'),
  asyncHandler(UploadController.uploadSingle)
)

router.post(
  '/file',
  optionalAuth,
  uploadMiddleware.single('file'),
  asyncHandler(UploadController.uploadSingle)
)

router.post(
  '/image',
  optionalAuth,
  uploadMiddleware.single('image'),
  asyncHandler(UploadController.uploadSingle)
)

// Multiple files upload (support field name: 'images' or 'files', max 10 files)
router.post(
  '/multiple',
  optionalAuth,
  uploadMiddleware.array('images', 10),
  asyncHandler(UploadController.uploadMultiple)
)

router.post(
  '/files',
  optionalAuth,
  uploadMiddleware.array('files', 10),
  asyncHandler(UploadController.uploadMultiple)
)

export default router
