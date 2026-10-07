import {
  validateSchema,
  createTransactionSchema,
  updateTransactionSchema,
  createDriverSettlementSlipSchema,
  createVendorSettlementSlipSchema,
  updateVendorSettlementSlipSchema,
  updateSlipStatusSchema,
} from '../../src/validators/finance.validator';
import { ValidationError } from '../../src/utils/errors';

describe('Finance Validator Unit Tests', () => {
  describe('createTransactionSchema', () => {
    it('validates valid income transaction', () => {
      const payload = {
        type: 'INCOME',
        category: 'GUEST_COLLECT',
        amount: 250000,
        payment_method: 'CASH',
        status: 'CONFIRMED',
        notes: 'Pelunasan tamu di lokasi',
      };

      const result = validateSchema(createTransactionSchema, payload);
      expect(result.type).toBe('INCOME');
      expect(result.amount).toBe(250000);
      expect(result.category).toBe('GUEST_COLLECT');
    });

    it('validates valid expense transaction with camelCase keys', () => {
      const payload = {
        type: 'EXPENSE',
        category: 'OP_CAR_WASH',
        amount: 50000,
        paymentMethod: 'CASH',
        vendorName: 'Cuci Mobil Bersih',
      };

      const result = validateSchema(createTransactionSchema, payload);
      expect(result.type).toBe('EXPENSE');
      expect(result.category).toBe('OP_CAR_WASH');
      expect(result.amount).toBe(50000);
    });

    it('throws ValidationError if amount is negative or 0', () => {
      expect(() => {
        validateSchema(createTransactionSchema, {
          type: 'INCOME',
          category: 'GUEST_COLLECT',
          amount: -1000,
        });
      }).toThrow(ValidationError);
    });

    it('throws ValidationError on invalid type or category', () => {
      expect(() => {
        validateSchema(createTransactionSchema, {
          type: 'INVALID_TYPE',
          category: 'GUEST_COLLECT',
          amount: 100000,
        });
      }).toThrow(ValidationError);
    });
  });

  describe('createDriverSettlementSlipSchema', () => {
    it('validates valid driver settlement slip payload', () => {
      const payload = {
        driver_id: 'drv-12345',
        period_start: '2026-10-01',
        period_end: '2026-10-15',
        package_type: 'TRANSPORT_ONLY',
        total_trips: 5,
        total_driver_fee: 1500000,
        net_amount: 1500000,
      };

      const result = validateSchema(createDriverSettlementSlipSchema, payload);
      expect(result.driver_id).toBe('drv-12345');
      expect(result.package_type).toBe('TRANSPORT_ONLY');
      expect(result.total_driver_fee).toBe(1500000);
    });

    it('validates valid driver settlement slip payload with camelCase keys', () => {
      const payload = {
        driverId: 'drv-12345',
        periodStart: '2026-10-01',
        periodEnd: '2026-10-15',
        packageType: 'TRANSPORT_ONLY',
        totalTrips: 5,
        totalDriverFee: 1500000,
        netAmount: 1500000,
      };

      const result = validateSchema(createDriverSettlementSlipSchema, payload);
      expect(result.driverId).toBe('drv-12345');
      expect(result.packageType).toBe('TRANSPORT_ONLY');
      expect(result.totalDriverFee).toBe(1500000);
    });

    it('throws error if driver_id and driverId are missing', () => {
      expect(() => {
        validateSchema(createDriverSettlementSlipSchema, {
          period_start: '2026-10-01',
          period_end: '2026-10-15',
        });
      }).toThrow(ValidationError);
    });
  });

  describe('createVendorSettlementSlipSchema', () => {
    it('validates vendor slip payload with snake_case', () => {
      const payload = {
        vendor_name: 'Jeep Merapi Community',
        category: 'RENTAL_JEEP',
        period_start: '2026-10-01',
        period_end: '2026-10-15',
        total_items: 4,
        total_amount: 2000000,
      };

      const result = validateSchema(createVendorSettlementSlipSchema, payload);
      expect(result.vendor_name).toBe('Jeep Merapi Community');
      expect(result.category).toBe('RENTAL_JEEP');
      expect(result.total_amount).toBe(2000000);
    });

    it('validates vendor slip payload with camelCase keys (frontend payload)', () => {
      const payload = {
        vendorName: 'Jeep Merapi Community',
        category: 'RENTAL_JEEP',
        periodStart: '2026-10-01',
        periodEnd: '2026-10-15',
        totalItems: 4,
        totalAmount: 2000000,
      };

      const result = validateSchema(createVendorSettlementSlipSchema, payload);
      expect(result.vendorName).toBe('Jeep Merapi Community');
      expect(result.category).toBe('RENTAL_JEEP');
      expect(result.totalAmount).toBe(2000000);
    });

    it('throws error if vendor_name and vendorName are missing', () => {
      expect(() => {
        validateSchema(createVendorSettlementSlipSchema, {
          periodStart: '2026-10-01',
          periodEnd: '2026-10-15',
          totalAmount: 2000000,
        });
      }).toThrow(ValidationError);
    });
  });

  describe('updateVendorSettlementSlipSchema', () => {
    it('validates partial vendor slip update with camelCase', () => {
      const payload = {
        totalAmount: 2500000,
        totalItems: 5,
        notes: 'Updated note',
      };

      const result = validateSchema(updateVendorSettlementSlipSchema, payload);
      expect(result.totalAmount).toBe(2500000);
      expect(result.totalItems).toBe(5);
      expect(result.notes).toBe('Updated note');
    });

    it('validates partial vendor slip update with snake_case', () => {
      const payload = {
        vendor_name: 'Updated Vendor Name',
        total_amount: 1800000,
      };

      const result = validateSchema(updateVendorSettlementSlipSchema, payload);
      expect(result.vendor_name).toBe('Updated Vendor Name');
      expect(result.total_amount).toBe(1800000);
    });
  });

  describe('updateSlipStatusSchema', () => {
    it('validates status transition payload', () => {
      const payload = {
        status: 'PAID',
        payment_proof_url: 'https://example.com/proof.jpg',
        notes: 'Transfer via BCA',
      };

      const result = validateSchema(updateSlipStatusSchema, payload);
      expect(result.status).toBe('PAID');
      expect(result.payment_proof_url).toBe('https://example.com/proof.jpg');
    });

    it('throws error on invalid status', () => {
      expect(() => {
        validateSchema(updateSlipStatusSchema, {
          status: 'UNKNOWN_STATUS',
        });
      }).toThrow(ValidationError);
    });
  });
});
