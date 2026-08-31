import Joi from 'joi'

export const articleValidator = {
  create: Joi.object({
    title: Joi.string().required(),
    slug: Joi.string().required(),
    excerpt: Joi.string().allow('', null).optional(),
    content: Joi.object().required(),
    featured_image_url: Joi.string().uri().allow('', null).optional(),
    author_id: Joi.number().integer().positive().optional(),
    category: Joi.string().allow('', null).optional(),
    seo_title: Joi.string().allow('', null).optional(),
    seo_description: Joi.string().allow('', null).optional(),
    seo_keywords: Joi.string().allow('', null).optional(),
    is_published: Joi.boolean().optional(),
  }),
  update: Joi.object({
    title: Joi.string().optional(),
    slug: Joi.string().optional(),
    excerpt: Joi.string().allow('', null).optional(),
    content: Joi.object().optional(),
    featured_image_url: Joi.string().uri().allow('', null).optional(),
    category: Joi.string().allow('', null).optional(),
    seo_title: Joi.string().allow('', null).optional(),
    seo_description: Joi.string().allow('', null).optional(),
    seo_keywords: Joi.string().allow('', null).optional(),
    is_published: Joi.boolean().optional(),
  }).min(1),
}
