import Joi from 'joi'

const jsonStringValidator = (value: string, helpers: Joi.CustomHelpers) => {
  if (value && typeof value === 'string' && value.trim() !== '') {
    try {
      JSON.parse(value)
    } catch {
      return helpers.message({ custom: 'organizationSchemaJson must be a valid JSON string' })
    }
  }
  return value
}

export const seoValidator = {
  update: Joi.object({
    siteTitleDefault: Joi.string().max(255).allow('', null).optional(),
    site_title_default: Joi.string().max(255).allow('', null).optional(),
    siteTitleTemplate: Joi.string().max(100).allow('', null).optional(),
    site_title_template: Joi.string().max(100).allow('', null).optional(),
    metaDescription: Joi.string().allow('', null).optional(),
    meta_description: Joi.string().allow('', null).optional(),
    keywords: Joi.alternatives()
      .try(Joi.array().items(Joi.string()), Joi.string(), Joi.allow(null))
      .optional(),
    defaultOgImage: Joi.string().max(500).allow('', null).optional(),
    default_og_image: Joi.string().max(500).allow('', null).optional(),
    googleVerificationTag: Joi.string().max(255).allow('', null).optional(),
    google_verification_tag: Joi.string().max(255).allow('', null).optional(),
    organizationSchemaJson: Joi.string().allow('', null).custom(jsonStringValidator).optional(),
    organization_schema_json: Joi.string().allow('', null).custom(jsonStringValidator).optional(),
    robotsIndex: Joi.boolean().optional(),
    robots_index: Joi.boolean().optional(),
    pageSeoSettings: Joi.object()
      .pattern(
        Joi.string(),
        Joi.object({
          title: Joi.string().max(255).allow('', null).optional(),
          description: Joi.string().allow('', null).optional(),
          keywords: Joi.alternatives()
            .try(Joi.array().items(Joi.string()), Joi.string(), Joi.allow(null))
            .optional(),
          ogImage: Joi.string().max(500).allow('', null).optional(),
          og_image: Joi.string().max(500).allow('', null).optional(),
          noIndex: Joi.boolean().optional(),
          no_index: Joi.boolean().optional(),
        }).unknown(true)
      )
      .allow(null)
      .optional(),
    page_seo_settings: Joi.object()
      .pattern(
        Joi.string(),
        Joi.object({
          title: Joi.string().max(255).allow('', null).optional(),
          description: Joi.string().allow('', null).optional(),
          keywords: Joi.alternatives()
            .try(Joi.array().items(Joi.string()), Joi.string(), Joi.allow(null))
            .optional(),
          ogImage: Joi.string().max(500).allow('', null).optional(),
          og_image: Joi.string().max(500).allow('', null).optional(),
          noIndex: Joi.boolean().optional(),
          no_index: Joi.boolean().optional(),
        }).unknown(true)
      )
      .allow(null)
      .optional(),
  }).min(1),
}

