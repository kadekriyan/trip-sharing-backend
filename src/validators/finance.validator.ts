import { z } from 'zod';

export const transactionTypeEnum = z.enum(['INCOME', 'EXPENSE']);

export const transactionCategoryEnum = z.enum([
  'GUEST_COLLECT',
  'MERCHANT_COMMISSION',
  'MODAL_REFUND',
  'OTHER_INCOME',
  'DRIVER_MODAL',
  'DRIVER_FEE',
  'DRIVER_TRANSPORT',
  'VENDOR_TICKET',
  'VENDOR_RENTAL',
  'VENDOR_PARKING',
  'OP_ADMIN_SALARY',
  'OP_CAR_WASH',
  'OP_RENT',
  'OP_UTILITIES',
  'OP_MAINTENANCE',
  'OTHER_EXPENSE',
]);

export const paymentMethodEnum = z.enum(['CASH', 'TRANSFER', 'MIDTRANS']);
export const transactionStatusEnum = z.enum(['PENDING', 'CONFIRMED', 'SETTLED', 'CANCELLED']);

export const createTransactionSchema = z.object({
  type: transactionTypeEnum,
  category: transactionCategoryEnum,
  amount: z.number().positive('Amount must be greater than 0'),
  payment_method: paymentMethodEnum.default('CASH'),
  paymentMethod: paymentMethodEnum.optional(),
  status: transactionStatusEnum.default('CONFIRMED'),
  transaction_date: z.string().or(z.date()).optional(),
  transactionDate: z.string().or(z.date()).optional(),
  trip_id: z.string().uuid().optional().nullable(),
  tripId: z.string().uuid().optional().nullable(),
  booking_group_id: z.string().uuid().optional().nullable(),
  bookingGroupId: z.string().uuid().optional().nullable(),
  driver_id: z.string().uuid().optional().nullable(),
  driverId: z.string().uuid().optional().nullable(),
  vehicle_id: z.string().uuid().optional().nullable(),
  vehicleId: z.string().uuid().optional().nullable(),
  vendor_name: z.string().max(255).optional().nullable(),
  vendorName: z.string().max(255).optional().nullable(),
  receipt_proof_url: z.string().url().optional().nullable().or(z.string().optional()),
  receiptProofUrl: z.string().url().optional().nullable().or(z.string().optional()),
  description: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const createDriverSettlementSlipSchema = z.object({
  driver_id: z.string().uuid(),
  driverId: z.string().uuid().optional(),
  period_start: z.string().or(z.date()),
  periodStart: z.string().or(z.date()).optional(),
  period_end: z.string().or(z.date()),
  periodEnd: z.string().or(z.date()).optional(),
  package_type: z.enum(['ALL_IN', 'TRANSPORT_ONLY', 'MIXED']).default('MIXED'),
  packageType: z.enum(['ALL_IN', 'TRANSPORT_ONLY', 'MIXED']).optional(),
  total_trips: z.number().int().nonnegative().optional(),
  totalTrips: z.number().int().nonnegative().optional(),
  total_driver_fee: z.number().nonnegative().optional(),
  totalDriverFee: z.number().nonnegative().optional(),
  total_transport_allowance: z.number().nonnegative().optional(),
  totalTransportAllowance: z.number().nonnegative().optional(),
  total_bonus_or_commission: z.number().nonnegative().optional(),
  totalBonusOrCommission: z.number().nonnegative().optional(),
  total_deductions: z.number().nonnegative().optional(),
  totalDeductions: z.number().nonnegative().optional(),
  net_amount: z.number().optional(),
  netAmount: z.number().optional(),
  notes: z.string().max(1000).optional().nullable(),
  breakdown_details: z.any().optional(),
  breakdownDetails: z.any().optional(),
});

export const createVendorSettlementSlipSchema = z.object({
  vendor_name: z.string().min(1, 'Vendor name is required'),
  vendorName: z.string().optional(),
  category: z.enum(['TICKET', 'RENTAL_JEEP', 'PARKING_VIP', 'OTHER']).default('TICKET'),
  period_start: z.string().or(z.date()),
  periodStart: z.string().or(z.date()).optional(),
  period_end: z.string().or(z.date()),
  periodEnd: z.string().or(z.date()).optional(),
  total_items: z.number().int().nonnegative().optional(),
  totalItems: z.number().int().nonnegative().optional(),
  total_amount: z.number().positive('Total amount must be greater than 0'),
  totalAmount: z.number().optional(),
  notes: z.string().max(1000).optional().nullable(),
  breakdown_details: z.any().optional(),
  breakdownDetails: z.any().optional(),
});

export const updateSlipStatusSchema = z.object({
  status: z.enum(['DRAFT', 'DRIVER_CONFIRMED', 'VENDOR_CONFIRMED', 'PAID', 'CANCELLED']),
  payment_proof_url: z.string().url().optional().nullable().or(z.string().optional()),
  paymentProofUrl: z.string().url().optional().nullable().or(z.string().optional()),
  notes: z.string().max(1000).optional().nullable(),
});
