import Joi from 'joi';
import { ValidationError } from '../utils/errors';

export function validateSchema<T = any>(schema: Joi.ObjectSchema, data: any): T {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    const details = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));
    throw new ValidationError('Validation failed', details);
  }

  return value as T;
}

export const transactionTypeEnum = Joi.string().valid('INCOME', 'EXPENSE');

export const transactionCategoryEnum = Joi.string().valid(
  'GUEST_COLLECT',
  'MERCHANT_COMMISSION',
  'SHOPPING_COMMISSION',
  'MODAL_REFUND',
  'PACKAGE_REFUND',
  'OTHER_INCOME',
  'DRIVER_MODAL',
  'DRIVER_CAPITAL_EXPENSE',
  'DRIVER_FEE',
  'DRIVER_SALARY',
  'DRIVER_TRANSPORT',
  'DRIVER_TRANSPORT_PKG',
  'VENDOR_TICKET',
  'VENDOR_RENTAL',
  'VENDOR_RENT',
  'VENDOR_PARKING',
  'VENDOR_VIP_PARKING',
  'OP_ADMIN_SALARY',
  'OP_CAR_WASH',
  'OP_RENT',
  'OP_UTILITIES',
  'OP_MAINTENANCE',
  'OTHER_EXPENSE'
);

export const paymentMethodEnum = Joi.string().valid('CASH', 'TRANSFER', 'MIDTRANS');
export const transactionStatusEnum = Joi.string().valid('PENDING', 'CONFIRMED', 'SETTLED', 'CANCELLED');

export const createTransactionSchema = Joi.object({
  type: transactionTypeEnum.required(),
  category: transactionCategoryEnum.required(),
  amount: Joi.number().positive().required(),
  payment_method: paymentMethodEnum.default('CASH').optional(),
  paymentMethod: paymentMethodEnum.optional(),
  status: transactionStatusEnum.default('CONFIRMED').optional(),
  transaction_date: Joi.alternatives().try(Joi.date().iso(), Joi.string(), Joi.allow(null, '')).optional(),
  transactionDate: Joi.alternatives().try(Joi.date().iso(), Joi.string(), Joi.allow(null, '')).optional(),
  trip_id: Joi.string().allow(null, '').optional(),
  tripId: Joi.string().allow(null, '').optional(),
  booking_group_id: Joi.string().allow(null, '').optional(),
  bookingGroupId: Joi.string().allow(null, '').optional(),
  driver_id: Joi.string().allow(null, '').optional(),
  driverId: Joi.string().allow(null, '').optional(),
  vehicle_id: Joi.string().allow(null, '').optional(),
  vehicleId: Joi.string().allow(null, '').optional(),
  vendor_name: Joi.string().max(255).allow(null, '').optional(),
  vendorName: Joi.string().max(255).allow(null, '').optional(),
  receipt_proof_url: Joi.string().allow(null, '').optional(),
  receiptProofUrl: Joi.string().allow(null, '').optional(),
  description: Joi.string().max(500).allow(null, '').optional(),
  notes: Joi.string().max(1000).allow(null, '').optional(),
});

export const updateTransactionSchema = Joi.object({
  type: transactionTypeEnum.optional(),
  category: transactionCategoryEnum.optional(),
  amount: Joi.number().positive().optional(),
  payment_method: paymentMethodEnum.optional(),
  paymentMethod: paymentMethodEnum.optional(),
  status: transactionStatusEnum.optional(),
  transaction_date: Joi.alternatives().try(Joi.date().iso(), Joi.string(), Joi.allow(null, '')).optional(),
  transactionDate: Joi.alternatives().try(Joi.date().iso(), Joi.string(), Joi.allow(null, '')).optional(),
  trip_id: Joi.string().allow(null, '').optional(),
  tripId: Joi.string().allow(null, '').optional(),
  booking_group_id: Joi.string().allow(null, '').optional(),
  bookingGroupId: Joi.string().allow(null, '').optional(),
  driver_id: Joi.string().allow(null, '').optional(),
  driverId: Joi.string().allow(null, '').optional(),
  vehicle_id: Joi.string().allow(null, '').optional(),
  vehicleId: Joi.string().allow(null, '').optional(),
  vendor_name: Joi.string().max(255).allow(null, '').optional(),
  vendorName: Joi.string().max(255).allow(null, '').optional(),
  receipt_proof_url: Joi.string().allow(null, '').optional(),
  receiptProofUrl: Joi.string().allow(null, '').optional(),
  description: Joi.string().max(500).allow(null, '').optional(),
  notes: Joi.string().max(1000).allow(null, '').optional(),
});

export const createDriverSettlementSlipSchema = Joi.object({
  driver_id: Joi.string().optional(),
  driverId: Joi.string().optional(),
  period_start: Joi.alternatives().try(Joi.date().iso(), Joi.string()).optional(),
  periodStart: Joi.alternatives().try(Joi.date().iso(), Joi.string()).optional(),
  period_end: Joi.alternatives().try(Joi.date().iso(), Joi.string()).optional(),
  periodEnd: Joi.alternatives().try(Joi.date().iso(), Joi.string()).optional(),
  package_type: Joi.string().valid('ALL_IN', 'TRANSPORT_ONLY', 'MIXED').default('MIXED').optional(),
  packageType: Joi.string().valid('ALL_IN', 'TRANSPORT_ONLY', 'MIXED').optional(),
  total_trips: Joi.number().integer().min(0).optional(),
  totalTrips: Joi.number().integer().min(0).optional(),
  total_driver_fee: Joi.number().min(0).optional(),
  totalDriverFee: Joi.number().min(0).optional(),
  total_transport_allowance: Joi.number().min(0).optional(),
  totalTransportAllowance: Joi.number().min(0).optional(),
  total_bonus_or_commission: Joi.number().min(0).optional(),
  totalBonusOrCommission: Joi.number().min(0).optional(),
  total_deductions: Joi.number().min(0).optional(),
  totalDeductions: Joi.number().min(0).optional(),
  net_amount: Joi.number().optional(),
  netAmount: Joi.number().optional(),
  notes: Joi.string().max(1000).allow(null, '').optional(),
  breakdown_details: Joi.any().optional(),
  breakdownDetails: Joi.any().optional(),
})
  .or('driver_id', 'driverId')
  .or('period_start', 'periodStart')
  .or('period_end', 'periodEnd');

export const createVendorSettlementSlipSchema = Joi.object({
  vendor_name: Joi.string().optional(),
  vendorName: Joi.string().optional(),
  category: Joi.string().valid('TICKET', 'RENTAL_JEEP', 'PARKING_VIP', 'OTHER').default('TICKET').optional(),
  period_start: Joi.alternatives().try(Joi.date().iso(), Joi.string()).optional(),
  periodStart: Joi.alternatives().try(Joi.date().iso(), Joi.string()).optional(),
  period_end: Joi.alternatives().try(Joi.date().iso(), Joi.string()).optional(),
  periodEnd: Joi.alternatives().try(Joi.date().iso(), Joi.string()).optional(),
  total_items: Joi.number().integer().min(0).optional(),
  totalItems: Joi.number().integer().min(0).optional(),
  total_amount: Joi.number().positive().optional(),
  totalAmount: Joi.number().positive().optional(),
  notes: Joi.string().max(1000).allow(null, '').optional(),
  breakdown_details: Joi.any().optional(),
  breakdownDetails: Joi.any().optional(),
})
  .or('vendor_name', 'vendorName')
  .or('period_start', 'periodStart')
  .or('period_end', 'periodEnd')
  .or('total_amount', 'totalAmount');

export const updateSlipStatusSchema = Joi.object({
  status: Joi.string().valid('DRAFT', 'DRIVER_CONFIRMED', 'VENDOR_CONFIRMED', 'PAID', 'CANCELLED').required(),
  payment_proof_url: Joi.string().allow(null, '').optional(),
  paymentProofUrl: Joi.string().allow(null, '').optional(),
  notes: Joi.string().max(1000).allow(null, '').optional(),
});

export const updateVendorSettlementSlipSchema = Joi.object({
  vendor_name: Joi.string().optional(),
  vendorName: Joi.string().optional(),
  category: Joi.string().valid('TICKET', 'RENTAL_JEEP', 'PARKING_VIP', 'OTHER').optional(),
  period_start: Joi.alternatives().try(Joi.date().iso(), Joi.string()).optional(),
  periodStart: Joi.alternatives().try(Joi.date().iso(), Joi.string()).optional(),
  period_end: Joi.alternatives().try(Joi.date().iso(), Joi.string()).optional(),
  periodEnd: Joi.alternatives().try(Joi.date().iso(), Joi.string()).optional(),
  total_items: Joi.number().integer().min(0).optional(),
  totalItems: Joi.number().integer().min(0).optional(),
  total_amount: Joi.number().positive().optional(),
  totalAmount: Joi.number().positive().optional(),
  notes: Joi.string().max(1000).allow(null, '').optional(),
  breakdown_details: Joi.any().optional(),
  breakdownDetails: Joi.any().optional(),
});
