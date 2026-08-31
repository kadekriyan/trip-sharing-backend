import { Prisma } from '@prisma/client'
import { prisma } from '../config/database'
import { ApiError } from '../utils/errors'

export class ArticleService {
  static create(data: {
    title: string
    slug: string
    excerpt?: string
    content: Prisma.InputJsonValue
    featured_image_url?: string
    author_id: number
    category?: string
    seo_title?: string
    seo_description?: string
    seo_keywords?: string
    is_published?: boolean
  }) {
    return prisma.article.create({
      data: {
        ...data,
        published_at: data.is_published ? new Date() : undefined,
      },
    })
  }

  static list() {
    return prisma.article.findMany({ where: { is_published: true }, orderBy: { published_at: 'desc' } })
  }

  static adminList(filters: { is_published?: boolean; category?: string }) {
    return prisma.article.findMany({
      where: {
        ...(filters.is_published !== undefined && { is_published: filters.is_published }),
        ...(filters.category && { category: filters.category }),
      },
      include: { author: true },
      orderBy: { created_at: 'desc' },
    })
  }

  static getBySlug(slug: string) {
    return prisma.article.findUnique({ where: { slug }, include: { author: true } })
  }

  static async get(id: number) {
    const article = await prisma.article.findUnique({ where: { id }, include: { author: true } })
    if (!article) throw new ApiError('Article not found', 404)
    return article
  }

  static async update(id: number, data: Record<string, unknown>) {
    const existing = await this.get(id)
    const nextData = {
      ...data,
      ...(data.is_published === true && !existing.published_at ? { published_at: new Date() } : {}),
      ...(data.is_published === false ? { published_at: null } : {}),
    }

    return prisma.article.update({ where: { id }, data: nextData as never })
  }

  static async delete(id: number) {
    await this.get(id)
    await prisma.article.delete({ where: { id } })
  }
}
