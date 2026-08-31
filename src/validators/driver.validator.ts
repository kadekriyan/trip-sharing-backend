import Joi from 'joi'

export const driverValidator = {
  create: Joi.object({
    user_id: Joi.number().integer().positive().required(),
    license_number: Joi.string().min(3).max(100).required(),
    vehicle_type: Joi.string().min(2).max(100).required(),
    vehicle_plat: Joi.string().min(3).max(50).required(),
    experience_years: Joi.number().integer().min(0).required(),
    is_available: Joi.boolean().optional(),
  }),
  update: Joi.object({
    license_number: Joi.string().min(3).max(100).optional(),
    vehicle_type: Joi.string().min(2).max(100).optional(),
    vehicle_plat: Joi.string().min(3).max(50).optional(),
    experience_years: Joi.number().integer().min(0).optional(),
    is_available: Joi.boolean().optional(),
  }).min(1),
}
