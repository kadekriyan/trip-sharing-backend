import { Router } from 'express'
import { SeoController } from '../controllers/seo.controller'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

// Public SEO Settings (for SSR layout.tsx and sitemap.ts)
router.get('/seo', asyncHandler(SeoController.getPublicSeoSettings))

export default router
