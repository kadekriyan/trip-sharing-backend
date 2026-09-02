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
})
