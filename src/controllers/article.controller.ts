import { Request, Response } from 'express'
import { ArticleService } from '../services/article.service'
import { sendResponse } from '../utils/response'

export class ArticleController {
  static async list(req: Request, res: Response) {
    const { category, search, page, limit } = req.query
    const result = await ArticleService.list({
      category: category as string | undefined,
      search: search as string | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 6,
    })
    sendResponse(res, 200, 'Articles retrieved', result.data, result.meta)
  }

  static async getBySlug(req: Request, res: Response) {
    const article = await ArticleService.getBySlug(req.params.slug)
    sendResponse(res, 200, 'Article retrieved', article)
  }
}
