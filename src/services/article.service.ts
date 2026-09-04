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
  const isPublished = art.is_published !== undefined ? (art.is_published as boolean) : true
  const coverImage = (art.cover_image as string) || (art.featured_image_url as string) || ''

  return {
    id: art.id as string,
    title: art.title as string,
    slug: art.slug as string,
    excerpt: (art.excerpt as string) || '',
    content: art.content,
    coverImage,
    cover_image: coverImage,
    featuredImageUrl: coverImage,
    category: (art.category as string) || 'Travel Tips',
    author: {
      name: authorName,
      avatar: authorAvatar,
      role: authorRole,
    },
    authorName,
    authorAvatar,
    authorRole,
    readTimeMinutes: (art.read_time_minutes as number) || 5,
    tags: (art.tags as string[]) || [],
    publishedAt: art.published_at || art.created_at,
    views: (art.view_count as number) || 0,
    viewCount: (art.view_count as number) || 0,
    isPublished,
    is_published: isPublished,
    isActive: isPublished,
    is_active: isPublished,
    seoTitle: (art.seo_title as string) || '',
    seoDescription: (art.seo_description as string) || '',
    seoKeywords: (art.seo_keywords as string) || '',
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
    author_id?: string
    authorId?: string
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
    seoTitle?: string
    seo_description?: string
    seoDescription?: string
    seo_keywords?: string
    seoKeywords?: string
    is_published?: boolean
    isPublished?: boolean
    isActive?: boolean
    is_active?: boolean
  }) {
    const slug =
      data.slug ||
      data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    const coverImage = data.cover_image || data.coverImage || data.featured_image_url || null
    let authorId = data.author_id || data.authorId

    if (!authorId) {
      const defaultAuthor = await prisma.user.findFirst({ where: { role: 'admin' } })
      if (defaultAuthor) {
        authorId = defaultAuthor.id
      } else {
        const newAuthor = await prisma.user.create({
          data: {
            email: 'admin-blog@tripsharing.local',
            password: 'blog-author-default',
            name: 'Admin Editorial',
            role: 'admin',
          },
        })
        authorId = newAuthor.id
      }
    }

    const authorName = data.author_name || data.authorName || data.author?.name || null
    const authorAvatar = data.author_avatar || data.authorAvatar || data.author?.avatar || null
    const authorRole = data.author_role || data.authorRole || data.author?.role || null
    const readTimeMinutes = data.read_time_minutes ?? data.readTimeMinutes ?? 5
    const isPublished =
      data.is_published ?? data.isPublished ?? data.isActive ?? data.is_active ?? true

    const created = await prisma.article.create({
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
        seo_title: data.seo_title || data.seoTitle,
        seo_description: data.seo_description || data.seoDescription,
        seo_keywords: data.seo_keywords || data.seoKeywords,
        is_published: isPublished,
        published_at: isPublished ? new Date() : null,
      },
    })

    return formatArticle(created as unknown as Record<string, unknown>)
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

  static async adminList(filters: { is_published?: boolean; category?: string } = {}) {
    const articles = await prisma.article.findMany({
      where: {
        ...(filters.is_published !== undefined && { is_published: filters.is_published }),
        ...(filters.category && { category: filters.category }),
      },
      include: { author: true },
      orderBy: { created_at: 'desc' },
    })

    return articles.map((a) => formatArticle(a as unknown as Record<string, unknown>))
  }

  static async getBySlug(slug: string) {
    let article = await prisma.article.findUnique({ where: { slug }, include: { author: true } })

    if (!article) {
      try {
        article = await prisma.article.findUnique({
          where: { id: slug },
          include: { author: true },
        })
      } catch {
        article = null
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

  static async get(id: string) {
    const article = await prisma.article.findUnique({ where: { id }, include: { author: true } })
    if (!article) throw new ApiError('Article not found', 404)
    return formatArticle(article as unknown as Record<string, unknown>)
  }

  static async update(id: string, data: Record<string, unknown>) {
    const existing = await prisma.article.findUnique({ where: { id } })
    if (!existing) throw new ApiError('Article not found', 404)

    const updateData: Prisma.ArticleUpdateInput = {}

    if (data.title !== undefined) {
      updateData.title = data.title as string
      if (!existing.slug || data.slug) {
        updateData.slug =
          (data.slug as string) ||
          (data.title as string)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
      }
    }
    if (data.slug !== undefined) updateData.slug = data.slug as string
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt as string
    if (data.content !== undefined) updateData.content = data.content as Prisma.InputJsonValue
    if (
      data.coverImage !== undefined ||
      data.cover_image !== undefined ||
      data.featured_image_url !== undefined
    ) {
      const img = (data.coverImage || data.cover_image || data.featured_image_url) as string
      updateData.cover_image = img
      updateData.featured_image_url = img
    }
    if (data.category !== undefined) updateData.category = data.category as string
    if (data.tags !== undefined) updateData.tags = data.tags as Prisma.InputJsonValue
    if (data.readTimeMinutes !== undefined || data.read_time_minutes !== undefined) {
      updateData.read_time_minutes = Number(data.readTimeMinutes ?? data.read_time_minutes)
    }
    if (data.authorName !== undefined || data.author_name !== undefined) {
      updateData.author_name = (data.authorName ?? data.author_name) as string
    }
    if (data.authorAvatar !== undefined || data.author_avatar !== undefined) {
      updateData.author_avatar = (data.authorAvatar ?? data.author_avatar) as string
    }
    if (data.authorRole !== undefined || data.author_role !== undefined) {
      updateData.author_role = (data.authorRole ?? data.author_role) as string
    }
    if (data.seoTitle !== undefined || data.seo_title !== undefined) {
      updateData.seo_title = (data.seoTitle ?? data.seo_title) as string
    }
    if (data.seoDescription !== undefined || data.seo_description !== undefined) {
      updateData.seo_description = (data.seoDescription ?? data.seo_description) as string
    }
    if (data.seoKeywords !== undefined || data.seo_keywords !== undefined) {
      updateData.seo_keywords = (data.seoKeywords ?? data.seo_keywords) as string
    }

    // Handle is_published / isActive flag and published_at timestamp
    const hasPublishFlag =
      data.isPublished !== undefined ||
      data.is_published !== undefined ||
      data.isActive !== undefined ||
      data.is_active !== undefined

    if (hasPublishFlag) {
      const isPublished = Boolean(
        data.isPublished ?? data.is_published ?? data.isActive ?? data.is_active
      )
      updateData.is_published = isPublished
      if (isPublished && !existing.published_at) {
        updateData.published_at = new Date()
      } else if (!isPublished) {
        updateData.published_at = null
      }
    }

    const updated = await prisma.article.update({
      where: { id },
      data: updateData,
    })

    return formatArticle(updated as unknown as Record<string, unknown>)
  }

  static async delete(id: string) {
    const existing = await prisma.article.findUnique({ where: { id } })
    if (!existing) throw new ApiError('Article not found', 404)

    await prisma.article.delete({ where: { id } })
  }
}
