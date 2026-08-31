import { Request, Response } from 'express'
import { ArticleService } from '../services/article.service'
import { sendResponse } from '../utils/response'

export class ArticleController {
  static async list(req: Request, res: Response) {
    const articles = await ArticleService.list()
    sendResponse(res, 200, 'Articles retrieved', articles)
  }

  static async getBySlug(req: Request, res: Response) {
    const article = await ArticleService.getBySlug(req.params.slug)
    sendResponse(res, 200, 'Article retrieved', article)
  }
}
