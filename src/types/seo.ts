export interface PageSeoItem {
  title?: string
  description?: string
  keywords?: string[] | string
  ogImage?: string
  og_image?: string
  noIndex?: boolean
  no_index?: boolean
}

export type PageSeoSettingsMap = Record<string, PageSeoItem>

export interface SeoSettingsResponse {
  id: string
  siteTitleDefault: string
  site_title_default?: string
  siteTitleTemplate: string
  site_title_template?: string
  metaDescription: string
  meta_description?: string
  keywords: string[] | unknown
  defaultOgImage: string
  default_og_image?: string
  googleVerificationTag: string | null
  google_verification_tag?: string | null
  organizationSchemaJson: string | null
  organization_schema_json?: string | null
  robotsIndex: boolean
  robots_index?: boolean
  pageSeoSettings?: PageSeoSettingsMap | null
  page_seo_settings?: PageSeoSettingsMap | null
  createdAt?: Date | string
  updatedAt?: Date | string
}

export interface UpdateSeoSettingsDTO {
  siteTitleDefault?: string
  site_title_default?: string
  siteTitleTemplate?: string
  site_title_template?: string
  metaDescription?: string
  meta_description?: string
  keywords?: string[] | string
  defaultOgImage?: string
  default_og_image?: string
  googleVerificationTag?: string | null
  google_verification_tag?: string | null
  organizationSchemaJson?: string | null
  organization_schema_json?: string | null
  robotsIndex?: boolean
  robots_index?: boolean
  pageSeoSettings?: PageSeoSettingsMap | null
  page_seo_settings?: PageSeoSettingsMap | null
}

