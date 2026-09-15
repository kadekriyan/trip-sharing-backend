import Joi from 'joi'

export const driverValidator = {
  create: Joi.object({
    userId: Joi.string().trim().max(100).optional(),
    user_id: Joi.string().trim().max(100).optional(),
    fullName: Joi.string().trim().min(2).max(100).optional(),
    name: Joi.string().trim().min(2).max(100).optional(),
    phoneNumber: Joi.string()
      .trim()
      .min(7)
      .max(20)
      .pattern(/^[+0-9\s\-()]+$/)
      .messages({ 'string.pattern.base': 'Phone number format is invalid' })
      .optional(),
    phone: Joi.string()
      .trim()
      .min(7)
      .max(20)
      .pattern(/^[+0-9\s\-()]+$/)
      .messages({ 'string.pattern.base': 'Phone number format is invalid' })
      .optional(),
    email: Joi.string().trim().email({ tlds: { allow: false } }).max(255).allow('', null).optional(),
    licenseNumber: Joi.string().trim().min(3).max(100).optional(),
    license_number: Joi.string().trim().min(3).max(100).optional(),
    experienceYears: Joi.number().integer().min(0).max(60).optional(),
    experience_years: Joi.number().integer().min(0).max(60).optional(),
    rating: Joi.number().min(0).max(5).optional(),
    isAvailable: Joi.boolean().optional(),
    is_available: Joi.boolean().optional(),
    status: Joi.string().trim().valid('active', 'on_duty', 'off_duty', 'inactive').optional(),
    areaId: Joi.string().trim().max(100).allow('', null).optional(),
    area_id: Joi.string().trim().max(100).allow('', null).optional(),
    vehicleId: Joi.string().trim().max(100).allow('', null).optional(),
    vehicle_id: Joi.string().trim().max(100).allow('', null).optional(),
    // Optional legacy vehicle parameters (auto-creates or maps to vehicle if provided)
    vehicleType: Joi.string().trim().max(100).optional(),
    vehicle_type: Joi.string().trim().max(100).optional(),
    vehicleModel: Joi.string().trim().max(100).optional(),
    vehiclePlat: Joi.string().trim().max(50).optional(),
    vehicle_plat: Joi.string().trim().max(50).optional(),
    plateNumber: Joi.string().trim().max(50).optional(),
    photoUrl: Joi.string().trim().allow('', null).optional(),
  }),

  update: Joi.object({
    fullName: Joi.string().trim().min(2).max(100).optional(),
    name: Joi.string().trim().min(2).max(100).optional(),
    phoneNumber: Joi.string()
      .trim()
      .min(7)
      .max(20)
      .pattern(/^[+0-9\s\-()]+$/)
      .messages({ 'string.pattern.base': 'Phone number format is invalid' })
      .optional(),
    phone: Joi.string()
      .trim()
      .min(7)
      .max(20)
      .pattern(/^[+0-9\s\-()]+$/)
      .messages({ 'string.pattern.base': 'Phone number format is invalid' })
      .optional(),
    email: Joi.string().trim().email({ tlds: { allow: false } }).max(255).allow('', null).optional(),
    licenseNumber: Joi.string().trim().min(3).max(100).optional(),
    license_number: Joi.string().trim().min(3).max(100).optional(),
    experienceYears: Joi.number().integer().min(0).max(60).optional(),
    experience_years: Joi.number().integer().min(0).max(60).optional(),
    rating: Joi.number().min(0).max(5).optional(),
    isAvailable: Joi.boolean().optional(),
    is_available: Joi.boolean().optional(),
    status: Joi.string().trim().valid('active', 'on_duty', 'off_duty', 'inactive').optional(),
    areaId: Joi.string().trim().max(100).allow('', null).optional(),
    area_id: Joi.string().trim().max(100).allow('', null).optional(),
    vehicleId: Joi.string().trim().max(100).allow('', null).optional(),
    vehicle_id: Joi.string().trim().max(100).allow('', null).optional(),
    vehicleType: Joi.string().trim().max(100).optional(),
    vehicle_type: Joi.string().trim().max(100).optional(),
    vehicleModel: Joi.string().trim().max(100).optional(),
    vehiclePlat: Joi.string().trim().max(50).optional(),
    vehicle_plat: Joi.string().trim().max(50).optional(),
    plateNumber: Joi.string().trim().max(50).optional(),
    photoUrl: Joi.string().trim().allow('', null).optional(),
  }).min(1),

  assignVehicle: Joi.object({
    vehicleId: Joi.string().trim().max(100).allow('', null).optional(),
    vehicle_id: Joi.string().trim().max(100).allow('', null).optional(),
  }),
}
