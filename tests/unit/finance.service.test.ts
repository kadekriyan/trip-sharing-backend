import { FinanceService } from '../../src/services/finance.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('FinanceService Unit Tests', () => {
  let testDriverId: string;
  let testVehicleId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create test user and driver if needed
    const user = await prisma.user.create({
      data: {
        email: `driver.finance.${Date.now()}@example.com`,
        password: 'hashed_password_123',
        name: 'Finance Test Driver',
        phone: '081234567890',
        role: 'driver',
      },
    });
    testUserId = user.id;

    const driver = await prisma.driver.create({
      data: {
        user_id: user.id,
        license_number: `SIM-FIN-${Date.now()}`,
        status: 'active',
      },
    });
    testDriverId = driver.id;

    const vehicle = await prisma.vehicle.create({
      data: {
        name: 'Toyota Hiace Luxury',
        plate_number: `AB ${Math.floor(1000 + Math.random() * 9000)} FN`,
        vehicle_type: 'Hiace',
        capacity: 6,
        driver_id: driver.id,
      },
    });
    testVehicleId = vehicle.id;
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.financeTransaction.deleteMany({
      where: { driver_id: testDriverId },
    });
    await prisma.driverSettlementSlip.deleteMany({
      where: { driver_id: testDriverId },
    });
    await prisma.vendorSettlementSlip.deleteMany({
      where: { vendor_name: 'Test Vendor Goa Pindul' },
    });
    await prisma.vehicle.deleteMany({
      where: { id: testVehicleId },
    });
    await prisma.driver.deleteMany({
      where: { id: testDriverId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
    await prisma.$disconnect();
  });

  describe('1. Finance Transaction CRUD & Inflow/Outflow', () => {
    it('should successfully create an INCOME transaction for guest collection', async () => {
      const tx = await FinanceService.createTransaction({
        type: 'INCOME',
        category: 'GUEST_COLLECT',
        amount: 850000,
        payment_method: 'CASH',
        driver_id: testDriverId,
        description: 'Pelunasan tiket tamu di tempat oleh driver',
      });

      expect(tx).toBeDefined();
      expect(tx.id).toBeDefined();
      expect(tx.transactionNumber).toMatch(/^TRX-\d{6}-.+$/);
      expect(tx.type).toBe('INCOME');
      expect(tx.category).toBe('GUEST_COLLECT');
      expect(tx.amount).toBe(850000);
      expect(tx.driverId).toBe(testDriverId);
    });

    it('should successfully create an EXPENSE transaction for fuel & parking', async () => {
      const tx = await FinanceService.createTransaction({
        type: 'EXPENSE',
        category: 'DRIVER_TRANSPORT',
        amount: 250000,
        payment_method: 'CASH',
        driver_id: testDriverId,
        vehicle_id: testVehicleId,
        description: 'BBM & Parkir VIP',
      });

      expect(tx).toBeDefined();
      expect(tx.type).toBe('EXPENSE');
      expect(tx.category).toBe('DRIVER_TRANSPORT');
      expect(tx.amount).toBe(250000);
      expect(tx.vehicleId).toBe(testVehicleId);
    });

    it('should list transactions and filter by type and driverId', async () => {
      const result = await FinanceService.listTransactions({
        driverId: testDriverId,
        limit: 10,
      });

      expect(result.data.length).toBeGreaterThanOrEqual(2);
      expect(result.pagination.total).toBeGreaterThanOrEqual(2);
    });

    it('should get transaction details by ID', async () => {
      const created = await FinanceService.createTransaction({
        type: 'INCOME',
        category: 'MERCHANT_COMMISSION',
        amount: 50000,
        driver_id: testDriverId,
        description: 'Fee oleh-oleh Bakpia',
      });

      const fetched = await FinanceService.getTransactionById(created.id);
      expect(fetched.id).toBe(created.id);
      expect(fetched.amount).toBe(50000);
    });
  });

  describe('2. Cashflow Overview & Automatic Tax (1.5%) Calculation', () => {
    it('should compute total income, expense, net profit, and 1.5% tax accurately', async () => {
      const summary = await FinanceService.getCashflowSummary();

      expect(summary).toBeDefined();
      expect(typeof summary.totalIncome).toBe('number');
      expect(typeof summary.totalExpense).toBe('number');
      expect(summary.netProfit).toBe(summary.totalIncome - summary.totalExpense);
      expect(summary.taxRatePercentage).toBe(1.5);

      if (summary.netProfit > 0) {
        expect(summary.estimatedTax).toBe(Math.round(summary.netProfit * 0.015));
      } else {
        expect(summary.estimatedTax).toBe(0);
      }
    });
  });

  describe('3. Driver 2-Week Settlement Slip & Payout Workflow', () => {
    let createdSlipId: string;

    it('should generate a 2-week Driver Settlement Slip in DRAFT status', async () => {
      const start = new Date('2026-10-01');
      const end = new Date('2026-10-15');

      const slip = await FinanceService.createDriverSettlementSlip({
        driver_id: testDriverId,
        period_start: start,
        period_end: end,
        package_type: 'TRANSPORT_ONLY',
        total_trips: 4,
        total_driver_fee: 1200000,
        total_transport_allowance: 800000,
        total_bonus_or_commission: 100000,
        total_deductions: 50000,
        notes: 'Rekapan Periode 1 Oktober 2026',
      });

      expect(slip).toBeDefined();
      expect(slip.slipNumber).toMatch(/^SLIP-DRV-\d{6}-.+$/);
      expect(slip.status).toBe('DRAFT');
      expect(slip.packageType).toBe('TRANSPORT_ONLY');
      expect(slip.totalTrips).toBe(4);
      // Net Amount = 1.200.000 + 800.000 + 100.000 - 50.000 = 2.050.000
      expect(slip.netAmount).toBe(2050000);

      createdSlipId = slip.id;
    });

    it('should update slip status to DRIVER_CONFIRMED', async () => {
      const updated = await FinanceService.updateDriverSlipStatus(createdSlipId, {
        status: 'DRIVER_CONFIRMED',
      });

      expect(updated.status).toBe('DRIVER_CONFIRMED');
      expect(updated.confirmedAt).toBeDefined();
    });

    it('should update slip status to PAID and automatically log expense transaction', async () => {
      const paid = await FinanceService.updateDriverSlipStatus(createdSlipId, {
        status: 'PAID',
        payment_proof_url: 'https://example.com/receipt-driver.jpg',
      });

      expect(paid.status).toBe('PAID');
      expect(paid.paidAt).toBeDefined();
      expect(paid.paymentProofUrl).toBe('https://example.com/receipt-driver.jpg');

      // Check that an expense transaction was automatically created
      const txs = await FinanceService.listTransactions({
        driverId: testDriverId,
        category: 'DRIVER_FEE',
      });

      const autoExpense = txs.data.find((t) => t.notes?.includes(createdSlipId));
      expect(autoExpense).toBeDefined();
      expect(autoExpense?.amount).toBe(2050000);
      expect(autoExpense?.type).toBe('EXPENSE');
    });
  });

  describe('4. Vendor Settlement Slip Workflow', () => {
    let vendorSlipId: string;

    it('should generate a Vendor Settlement Slip for attraction tickets', async () => {
      const start = new Date('2026-10-01');
      const end = new Date('2026-10-15');

      const slip = await FinanceService.createVendorSettlementSlip({
        vendor_name: 'Test Vendor Goa Pindul',
        category: 'TICKET',
        period_start: start,
        period_end: end,
        total_items: 24,
        total_amount: 1440000,
        notes: '24 Tiket Cave Tubing Pindul',
      });

      expect(slip).toBeDefined();
      expect(slip.slipNumber).toMatch(/^SLIP-VND-\d{6}-.+$/);
      expect(slip.status).toBe('DRAFT');
      expect(slip.totalItems).toBe(24);
      expect(slip.totalAmount).toBe(1440000);

      vendorSlipId = slip.id;
    });

    it('should update vendor slip details when in DRAFT status', async () => {
      const updated = await FinanceService.updateVendorSettlementSlip(vendorSlipId, {
        vendor_name: 'Test Vendor Goa Pindul Updated',
        total_items: 30,
        total_amount: 1800000,
        notes: '30 Tiket Cave Tubing Pindul (Revisi)',
      });

      expect(updated.vendorName).toBe('Test Vendor Goa Pindul Updated');
      expect(updated.totalItems).toBe(30);
      expect(updated.totalAmount).toBe(1800000);
      expect(updated.notes).toBe('30 Tiket Cave Tubing Pindul (Revisi)');
    });

    it('should confirm and pay vendor slip, creating expense in ledger', async () => {
      const paid = await FinanceService.updateVendorSlipStatus(vendorSlipId, {
        status: 'PAID',
        payment_proof_url: 'https://example.com/receipt-vendor.jpg',
      });

      expect(paid.status).toBe('PAID');
      expect(paid.paidAt).toBeDefined();

      const txs = await FinanceService.listTransactions({
        category: 'VENDOR_TICKET',
      });

      const autoExpense = txs.data.find((t) => t.notes?.includes(vendorSlipId));
      expect(autoExpense).toBeDefined();
      expect(autoExpense?.amount).toBe(1800000);
    });

    it('should reject updating vendor slip if already PAID', async () => {
      await expect(
        FinanceService.updateVendorSettlementSlip(vendorSlipId, {
          total_amount: 2000000,
        })
      ).rejects.toThrow('Tidak dapat mengubah slip vendor yang sudah LUNAS / DICAIRKAN');
    });
  });
});
