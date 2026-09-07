import { ArticleService } from '../../src/services/article.service'
import { prisma } from '../../src/config/database'
import { ApiError } from '../../src/utils/errors'

jest.mock('../../src/config/database', () => ({
  prisma: {
    article: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}))

describe('ArticleService / BlogService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getBySlug', () => {
    it('should throw ApiError (404) if article is not found', async () => {
      ;(prisma.article.findUnique as jest.Mock).mockResolvedValue(null)
      await expect(ArticleService.getBySlug('unknown-slug')).rejects.toThrow(ApiError)
    })

    it('should return article by slug and increment view count', async () => {
      const mockArticle = {
        id: 'art-1',
        title: '5 Alasan Trip Sharing Lebih Hemat',
        slug: '5-alasan-trip-sharing-lebih-hemat',
        content: 'Article content',
        category: 'Travel Tips',
        view_count: 10,
        author: {
          name: 'Admin Editorial',
          role: 'Editor',
        },
      }
      ;(prisma.article.findUnique as jest.Mock).mockResolvedValue(mockArticle)
      ;(prisma.article.update as jest.Mock).mockResolvedValue({ ...mockArticle, view_count: 11 })

      const result = await ArticleService.getBySlug('5-alasan-trip-sharing-lebih-hemat')

      expect(result.slug).toBe('5-alasan-trip-sharing-lebih-hemat')
      expect(result.author.name).toBe('Admin Editorial')
      expect(prisma.article.update).toHaveBeenCalledWith({
        where: { id: 'art-1' },
        data: { view_count: { increment: 1 } },
      })
    })
  })

  describe('list with filter and pagination', () => {
    it('should return paginated articles with meta', async () => {
      ;(prisma.article.count as jest.Mock).mockResolvedValue(1)
      ;(prisma.article.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'art-1',
          title: '5 Alasan Trip Sharing Lebih Hemat',
          slug: '5-alasan-trip-sharing-lebih-hemat',
          category: 'Travel Tips',
          is_published: true,
          author: { name: 'Admin Editorial' },
        },
      ])

      const result = await ArticleService.list({ category: 'Travel Tips', page: 1, limit: 6 })

      expect(result.data).toHaveLength(1)
      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(6)
      expect(result.meta.total).toBe(1)
    })
  })

  describe('adminList', () => {
    it('should return all articles formatted with author and isPublished/isActive', async () => {
      ;(prisma.article.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'art-1',
          title: 'Tips Liburan Hemat',
          slug: 'tips-liburan-hemat',
          category: 'Travel Tips',
          is_published: false,
          author: { name: 'Admin' },
        },
      ])

      const result = await ArticleService.adminList()

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Tips Liburan Hemat')
      expect(result[0].isPublished).toBe(false)
      expect(result[0].isActive).toBe(false)
    })
  })

  describe('create', () => {
    it('should create article with direct slug when no collision exists', async () => {
      ;(prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'user-admin-1', role: 'admin' })
      ;(prisma.article.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.article.create as jest.Mock).mockResolvedValue({
        id: 'art-1',
        title: 'Bromo Sunrise Camp',
        slug: 'bromo-sunrise-camp',
        content: 'Content test',
        category: 'Destinations',
        is_published: true,
        author: { name: 'Admin Editorial' },
      })

      const result = await ArticleService.create({
        title: 'Bromo Sunrise Camp',
        content: 'Content test',
        category: 'Destinations',
      })

      expect(result.slug).toBe('bromo-sunrise-camp')
      expect(prisma.article.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'bromo-sunrise-camp',
          }),
        })
      )
    })

    it('should automatically append suffix when slug collision occurs', async () => {
      ;(prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'user-admin-1', role: 'admin' })
      // First check 'bromo-sunrise-camp' returns existing record, second check 'bromo-sunrise-camp-1' returns null
      ;(prisma.article.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'existing-art-1', slug: 'bromo-sunrise-camp' })
        .mockResolvedValueOnce(null)

      ;(prisma.article.create as jest.Mock).mockResolvedValue({
        id: 'art-2',
        title: 'Bromo Sunrise Camp',
        slug: 'bromo-sunrise-camp-1',
        content: 'Content test',
        category: 'Destinations',
        is_published: true,
        author: { name: 'Admin Editorial' },
      })

      const result = await ArticleService.create({
        title: 'Bromo Sunrise Camp',
        slug: 'bromo-sunrise-camp',
        content: 'Content test',
        category: 'Destinations',
      })

      expect(result.slug).toBe('bromo-sunrise-camp-1')
      expect(prisma.article.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'bromo-sunrise-camp-1',
          }),
        })
      )
    })

    it('should increment suffix until a unique slug is found on multiple collisions', async () => {
      ;(prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'user-admin-1', role: 'admin' })
      ;(prisma.article.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'existing-art-1', slug: 'bromo-sunrise-camp' })
        .mockResolvedValueOnce({ id: 'existing-art-2', slug: 'bromo-sunrise-camp-1' })
        .mockResolvedValueOnce(null)

      ;(prisma.article.create as jest.Mock).mockResolvedValue({
        id: 'art-3',
        title: 'Bromo Sunrise Camp',
        slug: 'bromo-sunrise-camp-2',
        content: 'Content test',
        category: 'Destinations',
        is_published: true,
        author: { name: 'Admin Editorial' },
      })

      const result = await ArticleService.create({
        title: 'Bromo Sunrise Camp',
        content: 'Content test',
        category: 'Destinations',
      })

      expect(result.slug).toBe('bromo-sunrise-camp-2')
      expect(prisma.article.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'bromo-sunrise-camp-2',
          }),
        })
      )
    })
  })

  describe('update', () => {
    it('should throw 404 if article not found', async () => {
      ;(prisma.article.findUnique as jest.Mock).mockResolvedValue(null)
      await expect(ArticleService.update('art-not-found', { title: 'New' })).rejects.toThrow(
        ApiError
      )
    })

    it('should update article and toggle isActive/isPublished properly', async () => {
      ;(prisma.article.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'art-1',
          title: 'Old Title',
          slug: 'old-title',
          is_published: false,
          published_at: null,
        })
        .mockResolvedValueOnce(null) // for generateUniqueSlug check

      ;(prisma.article.update as jest.Mock).mockResolvedValue({
        id: 'art-1',
        title: 'New Updated Title',
        slug: 'new-updated-title',
        is_published: true,
        published_at: new Date(),
      })

      const result = await ArticleService.update('art-1', {
        title: 'New Updated Title',
        isActive: true,
      })

      expect(result.title).toBe('New Updated Title')
      expect(result.isActive).toBe(true)
      expect(result.isPublished).toBe(true)
    })
  })

  describe('delete', () => {
    it('should throw 404 if article not found', async () => {
      ;(prisma.article.findUnique as jest.Mock).mockResolvedValue(null)
      await expect(ArticleService.delete('art-not-found')).rejects.toThrow(ApiError)
    })

    it('should delete article successfully', async () => {
      ;(prisma.article.findUnique as jest.Mock).mockResolvedValue({ id: 'art-1' })
      ;(prisma.article.delete as jest.Mock).mockResolvedValue({ id: 'art-1' })

      await expect(ArticleService.delete('art-1')).resolves.not.toThrow()
      expect(prisma.article.delete).toHaveBeenCalledWith({ where: { id: 'art-1' } })
    })
  })
})

