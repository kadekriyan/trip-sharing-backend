import Joi from 'joi'

export const areaValidator = {
  create: Joi.object({
    name: Joi.string().trim().min(2).max(100).required().messages({
      'any.required': 'Nama area wajib diisi',
      'string.empty': 'Nama area tidak boleh kosong',
      'string.min': 'Nama area minimal 2 karakter',
      'string.max': 'Nama area maksimal 100 karakter',
    }),
    slug: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .pattern(/^[a-z0-9-]+$/)
      .messages({ 'string.pattern.base': 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-)' })
      .optional(),
    city: Joi.string().trim().max(100).allow('', null).optional(),
    province: Joi.string().trim().max(100).allow('', null).optional(),
    description: Joi.string().trim().max(1000).allow('', null).optional(),
    isActive: Joi.boolean().optional(),
    is_active: Joi.boolean().optional(),
  }),

  update: Joi.object({
    name: Joi.string().trim().min(2).max(100).optional(),
    slug: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .pattern(/^[a-z0-9-]+$/)
      .messages({ 'string.pattern.base': 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-)' })
      .optional(),
    city: Joi.string().trim().max(100).allow('', null).optional(),
    province: Joi.string().trim().max(100).allow('', null).optional(),
    description: Joi.string().trim().max(1000).allow('', null).optional(),
    isActive: Joi.boolean().optional(),
    is_active: Joi.boolean().optional(),
  }).min(1),
}
