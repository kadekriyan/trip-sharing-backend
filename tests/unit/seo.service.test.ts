import { SeoService } from '../../src/services/seo.service'
import { prisma } from '../../src/config/database'
import { ValidationError } from '../../src/utils/errors'
import { seoValidator } from '../../src/validators/seo.validator'

jest.mock('../../src/config/database', () => ({
  prisma: {
    seoSetting: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}))

describe('SeoService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getSettings', () => {
    it('should return existing SEO settings when found in database', async () => {
      const mockSeo = {
        id: 'seo-123',
        site_title_default: 'Share Tour Jogja',
        site_title_template: '%s | Share Tour Jogja',
        meta_description: 'Platform tour terpercaya',
        keywords: ['Jogja', 'Open Trip'],
        default_og_image: '/images/hero-custom.png',
        google_verification_tag: 'google-code-123',
        organization_schema_json: '{"@type": "Organization"}',
        robots_index: true,
        created_at: new Date('2026-01-01'),
        updated_at: new Date('2026-01-02'),
      }

      ;(prisma.seoSetting.findFirst as jest.Mock).mockResolvedValue(mockSeo)

      const result = await SeoService.getSettings()

      expect(result.id).toBe('seo-123')
      expect(result.siteTitleDefault).toBe('Share Tour Jogja')
      expect(result.site_title_default).toBe('Share Tour Jogja')
      expect(result.keywords).toEqual(['Jogja', 'Open Trip'])
      expect(result.googleVerificationTag).toBe('google-code-123')
      expect(result.robotsIndex).toBe(true)
      expect(prisma.seoSetting.create).not.toHaveBeenCalled()
    })

    it('should auto-initialize default SEO settings when table is empty', async () => {
      ;(prisma.seoSetting.findFirst as jest.Mock).mockResolvedValue(null)
      const createdSeo = {
        id: 'new-seo-id',
        site_title_default: 'Share Tour Jogja — Open Trip & Yogyakarta Sharing Tours',
        site_title_template: '%s | Share Tour Jogja',
        meta_description:
          'Open trip and sharing tour platform in Yogyakarta & Indonesia. Join small-group travel tours, save up to 60% with cost-sharing, and make new friends.',
        keywords: ['Share Tour Jogja', 'Open Trip Jogja'],
        default_og_image: '/images/hero-bromo.png',
        google_verification_tag: null,
        organization_schema_json: null,
        robots_index: true,
      }
      ;(prisma.seoSetting.create as jest.Mock).mockResolvedValue(createdSeo)

      const result = await SeoService.getSettings()

      expect(result.siteTitleDefault).toBe(
        'Share Tour Jogja — Open Trip & Yogyakarta Sharing Tours'
      )
      expect(prisma.seoSetting.create).toHaveBeenCalled()
    })

    it('should return safe fallback defaults if database fails', async () => {
      ;(prisma.seoSetting.findFirst as jest.Mock).mockRejectedValue(new Error('DB Connection Lost'))

      const result = await SeoService.getSettings()

      expect(result.siteTitleDefault).toBe(
        'Share Tour Jogja — Open Trip & Yogyakarta Sharing Tours'
      )
      expect(result.robotsIndex).toBe(true)
      expect(Array.isArray(result.keywords)).toBe(true)
    })
  })

  describe('updateSettings', () => {
    it('should update existing SEO settings in database', async () => {
      const existing = {
        id: 'seo-1',
        site_title_default: 'Old Title',
      }
      const updated = {
        id: 'seo-1',
        site_title_default: 'New SEO Title',
        site_title_template: '%s - Brand',
        meta_description: 'New Description',
        keywords: ['Keyword1', 'Keyword2'],
        default_og_image: '/images/new-og.png',
        google_verification_tag: 'tag-123',
        organization_schema_json: '{"@type":"Organization","name":"Share Tour Jogja"}',
        robots_index: false,
      }

      ;(prisma.seoSetting.findFirst as jest.Mock).mockResolvedValue(existing)
      ;(prisma.seoSetting.update as jest.Mock).mockResolvedValue(updated)

      const result = await SeoService.updateSettings({
        siteTitleDefault: 'New SEO Title',
        siteTitleTemplate: '%s - Brand',
        metaDescription: 'New Description',
        keywords: ['Keyword1', 'Keyword2'],
        defaultOgImage: '/images/new-og.png',
        googleVerificationTag: 'tag-123',
        organizationSchemaJson: '{"@type":"Organization","name":"Share Tour Jogja"}',
        robotsIndex: false,
      })

      expect(result.siteTitleDefault).toBe('New SEO Title')
      expect(result.robotsIndex).toBe(false)
      expect(prisma.seoSetting.update).toHaveBeenCalledWith({
        where: { id: 'seo-1' },
        data: expect.objectContaining({
          site_title_default: 'New SEO Title',
          robots_index: false,
        }),
      })
    })

    it('should throw ValidationError if organizationSchemaJson is invalid JSON', async () => {
      await expect(
        SeoService.updateSettings({
          organizationSchemaJson: 'not a valid json { broken',
        })
      ).rejects.toThrow(ValidationError)
    })

    it('should create new SEO setting row if none exists during update', async () => {
      ;(prisma.seoSetting.findFirst as jest.Mock).mockResolvedValue(null)
      const created = {
        id: 'seo-created',
        site_title_default: 'New Title',
        site_title_template: '%s | Brand',
        meta_description: 'Description',
        keywords: ['A', 'B'],
        default_og_image: '/images/hero.png',
        robots_index: true,
      }
      ;(prisma.seoSetting.create as jest.Mock).mockResolvedValue(created)

      const result = await SeoService.updateSettings({
        siteTitleDefault: 'New Title',
      })

      expect(result.id).toBe('seo-created')
      expect(prisma.seoSetting.create).toHaveBeenCalled()
    })

    it('should save and update page_seo_settings map', async () => {
      const existing = {
        id: 'seo-1',
        site_title_default: 'Main Title',
      }
      const pageSeoPayload = {
        home: { title: 'Home SEO', description: 'Home Desc' },
        destinations: { title: 'Destinations Catalog', description: 'Explore Jogja', noIndex: false },
      }
      const updated = {
        id: 'seo-1',
        site_title_default: 'Main Title',
        page_seo_settings: pageSeoPayload,
      }

      ;(prisma.seoSetting.findFirst as jest.Mock).mockResolvedValue(existing)
      ;(prisma.seoSetting.update as jest.Mock).mockResolvedValue(updated)

      const result = await SeoService.updateSettings({
        pageSeoSettings: pageSeoPayload,
      })

      expect(result.pageSeoSettings).toEqual(pageSeoPayload)
      expect(prisma.seoSetting.update).toHaveBeenCalledWith({
        where: { id: 'seo-1' },
        data: expect.objectContaining({
          page_seo_settings: pageSeoPayload,
        }),
      })
    })
  })

  describe('seoValidator', () => {
    it('should validate valid update payload successfully', () => {
      const payload = {
        siteTitleDefault: 'Valid Title',
        siteTitleTemplate: '%s | Jogja',
        metaDescription: 'Good meta description',
        keywords: ['Tour', 'Jogja'],
        defaultOgImage: '/images/og.jpg',
        googleVerificationTag: 'tag-xyz',
        organizationSchemaJson: '{"@context": "https://schema.org", "@type": "Organization"}',
        robotsIndex: true,
        pageSeoSettings: {
          home: { title: 'Home Page', description: 'Home description', noIndex: false },
          blog: { title: 'Blog Page', description: 'Blog description' },
        },
      }

      const { error, value } = seoValidator.update.validate(payload)
      expect(error).toBeUndefined()
      expect(value.siteTitleDefault).toBe('Valid Title')
      expect(value.pageSeoSettings.home.title).toBe('Home Page')
    })

    it('should reject update payload with invalid organizationSchemaJson string', () => {
      const payload = {
        organizationSchemaJson: 'invalid JSON string',
      }

      const { error } = seoValidator.update.validate(payload)
      expect(error).toBeDefined()
    })
  })
})

