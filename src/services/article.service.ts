import { Prisma } from '@prisma/client'
import { prisma } from '../config/database'
import { ApiError } from '../utils/errors'

export interface ArticleQueryFilters {
  category?: string
  search?: string
  page?: number
  limit?: number
}

function formatArticle(art: Record<string, unknown>) {
  const authorObj = (art.author as Record<string, unknown>) || {}
  const authorName = (art.author_name as string) || (authorObj.name as string) || 'Admin Editorial'
  const authorAvatar =
    (art.author_avatar as string) ||
    (authorObj.profile_image_url as string) ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
  const authorRole =
    (art.author_role as string) || (authorObj.role as string) || 'Lead Travel Writer'

  return {
    id: `art-${art.id}`,
    numericId: art.id,
    title: art.title,
    slug: art.slug,
    excerpt: art.excerpt || '',
    content: art.content,
    coverImage: art.cover_image || art.featured_image_url || '',
    category: art.category || 'Travel Tips',
    author: {
      name: authorName,
      avatar: authorAvatar,
      role: authorRole,
    },
    readTimeMinutes: art.read_time_minutes || 5,
    tags: art.tags || [],
    publishedAt: art.published_at || art.created_at,
    views: (art.view_count as number) || 0,
    isPublished: art.is_published,
    createdAt: art.created_at,
    updatedAt: art.updated_at,
  }
}

export class ArticleService {
  static async create(data: {
    title: string
    slug?: string
    excerpt?: string
    content: Prisma.InputJsonValue
    featured_image_url?: string
    coverImage?: string
    cover_image?: string
    author_id?: number
    authorId?: number
    author?: { name?: string; avatar?: string; role?: string }
    authorName?: string
    author_name?: string
    authorAvatar?: string
    author_avatar?: string
    authorRole?: string
    author_role?: string
    readTimeMinutes?: number
    read_time_minutes?: number
    tags?: Prisma.InputJsonValue
    category?: string
    seo_title?: string
    seo_description?: string
    seo_keywords?: string
    is_published?: boolean
    isPublished?: boolean
  }) {
    const slug =
      data.slug ||
      data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    const coverImage = data.cover_image || data.coverImage || data.featured_image_url || null
    const authorId = data.author_id || data.authorId || 1
    const authorName = data.author_name || data.authorName || data.author?.name || null
    const authorAvatar = data.author_avatar || data.authorAvatar || data.author?.avatar || null
    const authorRole = data.author_role || data.authorRole || data.author?.role || null
    const readTimeMinutes = data.read_time_minutes ?? data.readTimeMinutes ?? 5
    const isPublished = data.is_published ?? data.isPublished ?? true

    return prisma.article.create({
      data: {
        title: data.title,
        slug,
        excerpt: data.excerpt,
        content: data.content,
        featured_image_url: coverImage,
        cover_image: coverImage,
        author_id: authorId,
        author_name: authorName,
        author_avatar: authorAvatar,
        author_role: authorRole,
        read_time_minutes: readTimeMinutes,
        tags: (data.tags ?? []) as Prisma.InputJsonValue,
        category: data.category || 'Travel Tips',
        seo_title: data.seo_title,
        seo_description: data.seo_description,
        seo_keywords: data.seo_keywords,
        is_published: isPublished,
        published_at: isPublished ? new Date() : null,
      },
    })
  }

  static async list(filters: ArticleQueryFilters = {}) {
    const page = filters.page && filters.page > 0 ? Number(filters.page) : 1
    const limit = filters.limit && filters.limit > 0 ? Number(filters.limit) : 6
    const skip = (page - 1) * limit

    const where: Prisma.ArticleWhereInput = {
      is_published: true,
      ...(filters.category && { category: { equals: filters.category, mode: 'insensitive' } }),
      ...(filters.search && {
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { excerpt: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    }

    const [total, articles] = await Promise.all([
      prisma.article.count({ where }),
      prisma.article.findMany({
        where,
        include: { author: true },
        orderBy: { published_at: 'desc' },
        skip,
        take: limit,
      }),
    ])

    return {
      data: articles.map((a) => formatArticle(a as unknown as Record<string, unknown>)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    }
  }

  static async adminList(filters: { is_published?: boolean; category?: string }) {
    return prisma.article.findMany({
      where: {
        ...(filters.is_published !== undefined && { is_published: filters.is_published }),
        ...(filters.category && { category: filters.category }),
      },
      include: { author: true },
      orderBy: { created_at: 'desc' },
    })
  }

  static async getBySlug(slug: string) {
    let article = await prisma.article.findUnique({ where: { slug }, include: { author: true } })

    if (!article) {
      const num = parseInt(slug.replace(/^\D+/g, ''), 10)
      if (!isNaN(num)) {
        article = await prisma.article.findUnique({ where: { id: num }, include: { author: true } })
      }
    }

    if (!article) throw new ApiError('Article not found', 404)

    // increment views
    await prisma.article.update({
      where: { id: article.id },
      data: { view_count: { increment: 1 } },
    })

    return formatArticle(article as unknown as Record<string, unknown>)
  }

  static async get(id: number) {
    const article = await prisma.article.findUnique({ where: { id }, include: { author: true } })
    if (!article) throw new ApiError('Article not found', 404)
    return formatArticle(article as unknown as Record<string, unknown>)
  }

  static async update(id: number, data: Record<string, unknown>) {
    const existing = await prisma.article.findUnique({ where: { id } })
    if (!existing) throw new ApiError('Article not found', 404)

    const nextData = {
      ...data,
      ...(data.is_published === true && !existing.published_at ? { published_at: new Date() } : {}),
      ...(data.is_published === false ? { published_at: null } : {}),
    }

    return prisma.article.update({ where: { id }, data: nextData as never })
  }

  static async delete(id: number) {
    const existing = await prisma.article.findUnique({ where: { id } })
    if (!existing) throw new ApiError('Article not found', 404)

    await prisma.article.delete({ where: { id } })
  }
}
