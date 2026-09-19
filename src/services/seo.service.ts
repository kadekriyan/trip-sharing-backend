import { Prisma } from '@prisma/client'
import { prisma } from '../config/database'
import { UpdateSeoSettingsDTO } from '../types/seo'
import { ValidationError } from '../utils/errors'

const DEFAULT_SEO_SETTINGS = {
  site_title_default: 'Share Tour Jogja — Open Trip & Yogyakarta Sharing Tours',
  site_title_template: '%s | Share Tour Jogja',
  meta_description:
    'Open trip and sharing tour platform in Yogyakarta & Indonesia. Join small-group travel tours, save up to 60% with cost-sharing, and make new friends.',
  keywords: [
    'Share Tour Jogja',
    'Open Trip Jogja',
    'Sharing Tour Yogyakarta',
    'Trip Sharing Jogja',
    'Small Group Travel Indonesia',
  ],
  default_og_image: '/images/hero-bromo.png',
  google_verification_tag: null,
  organization_schema_json: null,
  robots_index: true,
}

function formatSeoSettings(seo: Record<string, unknown>) {
  const siteTitleDefault =
    (seo.site_title_default as string) ||
    (seo.siteTitleDefault as string) ||
    DEFAULT_SEO_SETTINGS.site_title_default
  const siteTitleTemplate =
    (seo.site_title_template as string) ||
    (seo.siteTitleTemplate as string) ||
    DEFAULT_SEO_SETTINGS.site_title_template
  const metaDescription =
    (seo.meta_description as string) ||
    (seo.metaDescription as string) ||
    DEFAULT_SEO_SETTINGS.meta_description

  let keywords = seo.keywords
  if (typeof keywords === 'string') {
    try {
      keywords = JSON.parse(keywords)
    } catch {
      keywords = [keywords]
    }
  }
  if (!keywords || !Array.isArray(keywords)) {
    keywords = DEFAULT_SEO_SETTINGS.keywords
  }

  const defaultOgImage =
    (seo.default_og_image as string) ||
    (seo.defaultOgImage as string) ||
    DEFAULT_SEO_SETTINGS.default_og_image
  const googleVerificationTag =
    (seo.google_verification_tag as string) || (seo.googleVerificationTag as string) || null
  const organizationSchemaJson =
    (seo.organization_schema_json as string) || (seo.organizationSchemaJson as string) || null
  const robotsIndex =
    seo.robots_index !== undefined
      ? Boolean(seo.robots_index)
      : seo.robotsIndex !== undefined
        ? Boolean(seo.robotsIndex)
        : true

  let pageSeoSettings = (seo.page_seo_settings || seo.pageSeoSettings || null) as Record<string, unknown> | null
  if (typeof pageSeoSettings === 'string') {
    try {
      pageSeoSettings = JSON.parse(pageSeoSettings)
    } catch {
      pageSeoSettings = null
    }
  }

  return {
    id: (seo.id as string) || 'singleton',
    siteTitleDefault,
    site_title_default: siteTitleDefault,
    siteTitleTemplate,
    site_title_template: siteTitleTemplate,
    metaDescription,
    meta_description: metaDescription,
    keywords,
    defaultOgImage,
    default_og_image: defaultOgImage,
    googleVerificationTag,
    google_verification_tag: googleVerificationTag,
    organizationSchemaJson,
    organization_schema_json: organizationSchemaJson,
    robotsIndex,
    robots_index: robotsIndex,
    pageSeoSettings,
    page_seo_settings: pageSeoSettings,
    createdAt: seo.created_at || new Date().toISOString(),
    updatedAt: seo.updated_at || new Date().toISOString(),
  }
}

export class SeoService {
  static async getSettings() {
    try {
      const existing = await prisma.seoSetting.findFirst()
      if (existing) {
        return formatSeoSettings(existing as unknown as Record<string, unknown>)
      }

      // Auto-initialize if empty
      const created = await prisma.seoSetting.create({
        data: {
          site_title_default: DEFAULT_SEO_SETTINGS.site_title_default,
          site_title_template: DEFAULT_SEO_SETTINGS.site_title_template,
          meta_description: DEFAULT_SEO_SETTINGS.meta_description,
          keywords: DEFAULT_SEO_SETTINGS.keywords as Prisma.InputJsonValue,
          default_og_image: DEFAULT_SEO_SETTINGS.default_og_image,
          robots_index: DEFAULT_SEO_SETTINGS.robots_index,
        },
      })
      return formatSeoSettings(created as unknown as Record<string, unknown>)
    } catch {
      // Return safe defaults if DB fails or during initial bootstrapping
      return formatSeoSettings(DEFAULT_SEO_SETTINGS as unknown as Record<string, unknown>)
    }
  }

  static async updateSettings(data: UpdateSeoSettingsDTO) {
    const orgSchema =
      data.organizationSchemaJson !== undefined
        ? data.organizationSchemaJson
        : data.organization_schema_json

    if (orgSchema && typeof orgSchema === 'string' && orgSchema.trim() !== '') {
      try {
        JSON.parse(orgSchema)
      } catch {
        throw new ValidationError('organizationSchemaJson must be a valid JSON string', [
          {
            field: 'organizationSchemaJson',
            message: 'organizationSchemaJson must be a valid JSON string',
          },
        ])
      }
    }

    let parsedKeywords: Prisma.InputJsonValue | undefined = undefined
    if (data.keywords !== undefined) {
      if (Array.isArray(data.keywords)) {
        parsedKeywords = data.keywords as Prisma.InputJsonValue
      } else if (typeof data.keywords === 'string') {
        try {
          const parsed = JSON.parse(data.keywords)
          parsedKeywords = (
            Array.isArray(parsed) ? parsed : [data.keywords]
          ) as Prisma.InputJsonValue
        } catch {
          parsedKeywords = [data.keywords] as Prisma.InputJsonValue
        }
      }
    }

    const updateData: Prisma.SeoSettingUpdateInput = {}

    if (data.siteTitleDefault !== undefined || data.site_title_default !== undefined) {
      updateData.site_title_default = (data.siteTitleDefault ?? data.site_title_default) as string
    }
    if (data.siteTitleTemplate !== undefined || data.site_title_template !== undefined) {
      updateData.site_title_template = (data.siteTitleTemplate ??
        data.site_title_template) as string
    }
    if (data.metaDescription !== undefined || data.meta_description !== undefined) {
      updateData.meta_description = (data.metaDescription ?? data.meta_description) as string
    }
    if (parsedKeywords !== undefined) {
      updateData.keywords = parsedKeywords
    }
    if (data.defaultOgImage !== undefined || data.default_og_image !== undefined) {
      updateData.default_og_image = (data.defaultOgImage ?? data.default_og_image) as string
    }
    if (data.googleVerificationTag !== undefined || data.google_verification_tag !== undefined) {
      updateData.google_verification_tag =
        (data.googleVerificationTag ?? data.google_verification_tag) || null
    }
    if (orgSchema !== undefined) {
      updateData.organization_schema_json = orgSchema || null
    }
    if (data.robotsIndex !== undefined || data.robots_index !== undefined) {
      updateData.robots_index = Boolean(data.robotsIndex ?? data.robots_index)
    }

    const pageSeo = data.pageSeoSettings !== undefined ? data.pageSeoSettings : data.page_seo_settings
    if (pageSeo !== undefined) {
      updateData.page_seo_settings = pageSeo as Prisma.InputJsonValue
    }

    const existing = await prisma.seoSetting.findFirst()

    let result
    if (existing) {
      result = await prisma.seoSetting.update({
        where: { id: existing.id },
        data: updateData,
      })
    } else {
      result = await prisma.seoSetting.create({
        data: {
          site_title_default:
            (updateData.site_title_default as string) ?? DEFAULT_SEO_SETTINGS.site_title_default,
          site_title_template:
            (updateData.site_title_template as string) ?? DEFAULT_SEO_SETTINGS.site_title_template,
          meta_description:
            (updateData.meta_description as string) ?? DEFAULT_SEO_SETTINGS.meta_description,
          keywords: (updateData.keywords ?? DEFAULT_SEO_SETTINGS.keywords) as Prisma.InputJsonValue,
          default_og_image:
            (updateData.default_og_image as string) ?? DEFAULT_SEO_SETTINGS.default_og_image,
          google_verification_tag:
            (updateData.google_verification_tag as string) ??
            DEFAULT_SEO_SETTINGS.google_verification_tag,
          organization_schema_json:
            (updateData.organization_schema_json as string) ??
            DEFAULT_SEO_SETTINGS.organization_schema_json,
          robots_index: (updateData.robots_index as boolean) ?? DEFAULT_SEO_SETTINGS.robots_index,
          page_seo_settings: updateData.page_seo_settings,
        },
      })
    }

    return formatSeoSettings(result as unknown as Record<string, unknown>)
  }
}

