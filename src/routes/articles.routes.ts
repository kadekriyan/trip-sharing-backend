import { Router } from 'express'
import { ArticleController } from '../controllers/article.controller'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

router.get('/', asyncHandler(ArticleController.list))
router.get('/:slug', asyncHandler(ArticleController.getBySlug))

export default router
