import { PrismaClient, Prisma } from '@prisma/client';
import { ApiError, NotFoundError, ValidationError } from '../utils/errors';

const prisma = new PrismaClient();

export interface TransactionFilter {
  type?: 'INCOME' | 'EXPENSE';
  category?: string;
  driverId?: string;
  vehicleId?: string;
  tripId?: string;
  bookingGroupId?: string;
  status?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  search?: string;
  page?: number;
  limit?: number;
}

export class FinanceService {
  /**
   * Helper to format transaction number: TRX-YYYYMM-XXXXX
   */
  private static async generateTransactionNumber(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const timeSlice = Date.now().toString().slice(-4);
    return `TRX-${yearMonth}-${timeSlice}${randomSuffix}`;
  }

  /**
   * Helper to format driver slip number: SLIP-DRV-YYYYMM-XXXXX
   */
  private static async generateDriverSlipNumber(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const timeSlice = Date.now().toString().slice(-4);
    return `SLIP-DRV-${yearMonth}-${timeSlice}${randomSuffix}`;
  }

  /**
   * Helper to format vendor slip number: SLIP-VND-YYYYMM-XXXXX
   */
  private static async generateVendorSlipNumber(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const timeSlice = Date.now().toString().slice(-4);
    return `SLIP-VND-${yearMonth}-${timeSlice}${randomSuffix}`;
  }

  /**
   * Create a new finance transaction (Inflow / Outflow)
   */
  static async createTransaction(data: Record<string, any>, adminId?: string) {
    const transactionNumber = await this.generateTransactionNumber();
    const amount = Number(data.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new ValidationError('Invalid transaction amount');
    }

    const type = data.type;
    const category = data.category;
    const paymentMethod = data.payment_method || data.paymentMethod || 'CASH';
    const status = data.status || 'CONFIRMED';
    const transactionDate = data.transaction_date || data.transactionDate ? new Date(data.transaction_date || data.transactionDate) : new Date();
    const tripId = data.trip_id || data.tripId || null;
    const bookingGroupId = data.booking_group_id || data.bookingGroupId || null;
    const driverId = data.driver_id || data.driverId || null;
    const vehicleId = data.vehicle_id || data.vehicleId || null;
    const vendorName = data.vendor_name || data.vendorName || null;
    const receiptProofUrl = data.receipt_proof_url || data.receiptProofUrl || null;
    const description = data.description || null;
    const notes = data.notes || null;

    const tx = await prisma.financeTransaction.create({
      data: {
        transaction_number: transactionNumber,
        type,
        category,
        amount: new Prisma.Decimal(amount),
        payment_method: paymentMethod,
        status,
        transaction_date: transactionDate,
        trip_id: tripId,
        booking_group_id: bookingGroupId,
        driver_id: driverId,
        vehicle_id: vehicleId,
        vendor_name: vendorName,
        receipt_proof_url: receiptProofUrl,
        description,
        notes,
        created_by: adminId || null,
      },
      include: {
        driver: {
          include: {
            user: {
              select: { id: true, name: true, phone: true, email: true },
            },
          },
        },
        vehicle: true,
        trip: {
          include: { destination: true },
        },
        booking_group: true,
      },
    });

    return this.formatTransaction(tx);
  }

  /**
   * List transactions with comprehensive filtering and pagination
   */
  static async listTransactions(filters: TransactionFilter) {
    const where: Prisma.FinanceTransactionWhereInput = {};

    if (filters.type) where.type = filters.type;
    if (filters.category) where.category = filters.category;
    if (filters.driverId) where.driver_id = filters.driverId;
    if (filters.vehicleId) where.vehicle_id = filters.vehicleId;
    if (filters.tripId) where.trip_id = filters.tripId;
    if (filters.bookingGroupId) where.booking_group_id = filters.bookingGroupId;
    if (filters.status) where.status = filters.status;

    if (filters.startDate || filters.endDate) {
      where.transaction_date = {};
      if (filters.startDate) {
        where.transaction_date.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.transaction_date.lte = end;
      }
    }

    if (filters.search) {
      where.OR = [
        { transaction_number: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { vendor_name: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const [total, transactions] = await Promise.all([
      prisma.financeTransaction.count({ where }),
      prisma.financeTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { transaction_date: 'desc' },
        include: {
          driver: {
            include: {
              user: { select: { id: true, name: true, phone: true, email: true } },
            },
          },
          vehicle: true,
          trip: {
            include: { destination: true },
          },
          booking_group: true,
        },
      }),
    ]);

    return {
      data: transactions.map(this.formatTransaction),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get transaction detail by ID
   */
  static async getTransactionById(id: string) {
    const tx = await prisma.financeTransaction.findUnique({
      where: { id },
      include: {
        driver: {
          include: {
            user: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
        vehicle: true,
        trip: {
          include: { destination: true },
        },
        booking_group: true,
      },
    });

    if (!tx) {
      throw new NotFoundError('Transaction');
    }

    return this.formatTransaction(tx);
  }

  /**
   * Update transaction
   */
  static async updateTransaction(id: string, data: Record<string, any>) {
    await this.getTransactionById(id);

    const updateData: Prisma.FinanceTransactionUpdateInput = {};
    if (data.type) updateData.type = data.type;
    if (data.category) updateData.category = data.category;
    if (data.amount !== undefined) updateData.amount = new Prisma.Decimal(Number(data.amount));
    if (data.payment_method || data.paymentMethod) updateData.payment_method = data.payment_method || data.paymentMethod;
    if (data.status) updateData.status = data.status;
    if (data.transaction_date || data.transactionDate) updateData.transaction_date = new Date(data.transaction_date || data.transactionDate);
    if (data.trip_id !== undefined || data.tripId !== undefined) updateData.trip = data.trip_id || data.tripId ? { connect: { id: data.trip_id || data.tripId } } : { disconnect: true };
    if (data.booking_group_id !== undefined || data.bookingGroupId !== undefined) updateData.booking_group = data.booking_group_id || data.bookingGroupId ? { connect: { id: data.booking_group_id || data.bookingGroupId } } : { disconnect: true };
    if (data.driver_id !== undefined || data.driverId !== undefined) updateData.driver = data.driver_id || data.driverId ? { connect: { id: data.driver_id || data.driverId } } : { disconnect: true };
    if (data.vehicle_id !== undefined || data.vehicleId !== undefined) updateData.vehicle = data.vehicle_id || data.vehicleId ? { connect: { id: data.vehicle_id || data.vehicleId } } : { disconnect: true };
    if (data.vendor_name !== undefined || data.vendorName !== undefined) updateData.vendor_name = data.vendor_name || data.vendorName;
    if (data.receipt_proof_url !== undefined || data.receiptProofUrl !== undefined) updateData.receipt_proof_url = data.receipt_proof_url || data.receiptProofUrl;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updated = await prisma.financeTransaction.update({
      where: { id },
      data: updateData,
      include: {
        driver: {
          include: {
            user: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
        vehicle: true,
        trip: {
          include: { destination: true },
        },
        booking_group: true,
      },
    });

    return this.formatTransaction(updated);
  }

  /**
   * Delete transaction
   */
  static async deleteTransaction(id: string) {
    await this.getTransactionById(id);
    await prisma.financeTransaction.delete({ where: { id } });
    return { success: true, message: 'Transaction deleted successfully' };
  }

  /**
   * Get Cashflow Overview, Profit & Loss, and Automatic Tax (1.5%) calculation
   */
  static async getCashflowSummary(startDate?: string | Date, endDate?: string | Date) {
    const where: Prisma.FinanceTransactionWhereInput = {
      status: { not: 'CANCELLED' },
    };

    if (startDate || endDate) {
      where.transaction_date = {};
      if (startDate) where.transaction_date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.transaction_date.lte = end;
      }
    }

    const transactions = await prisma.financeTransaction.findMany({
      where,
      select: {
        type: true,
        category: true,
        amount: true,
      },
    });

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryBreakdown: Record<string, number> = {};

    transactions.forEach((tx) => {
      const amt = Number(tx.amount);
      if (tx.type === 'INCOME') {
        totalIncome += amt;
      } else if (tx.type === 'EXPENSE') {
        totalExpense += amt;
      }

      categoryBreakdown[tx.category] = (categoryBreakdown[tx.category] || 0) + amt;
    });

    const netProfit = totalIncome - totalExpense;
    // Formula: (Total Inflow - Total Outflow) * 1.5% PPh Final UMKM. If netProfit <= 0, tax is 0.
    const estimatedTax = netProfit > 0 ? Math.round(netProfit * 0.015) : 0;

    return {
      period: {
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
      },
      totalIncome,
      totalExpense,
      netProfit,
      estimatedTax,
      taxRatePercentage: 1.5,
      categoryBreakdown,
      totalTransactions: transactions.length,
    };
  }

  /**
   * Get Manifests and Driver Collections to reconcile Driver Deposits
   */
  static async getDriverManifestSummary(driverId?: string, startDate?: string | Date, endDate?: string | Date) {
    const whereGroup: Prisma.BookingGroupWhereInput = {};
    if (driverId) whereGroup.driver_id = driverId;

    if (startDate || endDate) {
      const departureDateFilter: Prisma.DateTimeFilter = {};
      if (startDate) {
        departureDateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        departureDateFilter.lte = end;
      }
      whereGroup.trip = {
        departure_date: departureDateFilter,
      };
    }

    const groups = await prisma.bookingGroup.findMany({
      where: whereGroup,
      include: {
        driver: {
          include: {
            user: { select: { id: true, name: true, phone: true } },
          },
        },
        vehicle: true,
        trip: {
          include: { destination: true },
        },
        participants: {
          select: {
            id: true,
            full_name: true,
            total_amount: true,
            payment_status: true,
            package_type: true,
            pickup_location: true,
          },
        },
        finance_transactions: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return groups.map((g) => {
      const totalParticipants = g.participants.length;
      const totalManifestAmount = g.participants.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
      const paidParticipants = g.participants.filter((p) => p.payment_status === 'paid' || p.payment_status === 'PAID');
      const pendingParticipants = g.participants.filter((p) => p.payment_status === 'pending' || p.payment_status === 'PENDING');
      
      const uncollectedAmount = pendingParticipants.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
      
      // Transactions recorded for this group
      const recordedSetoran = g.finance_transactions
        .filter((tx) => tx.type === 'INCOME' && (tx.category === 'GUEST_COLLECT' || tx.category === 'MODAL_REFUND'))
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

      const recordedDriverModal = g.finance_transactions
        .filter((tx) => tx.type === 'EXPENSE' && tx.category === 'DRIVER_MODAL')
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

      return {
        bookingGroupId: g.id,
        groupNumber: g.group_number,
        tripId: g.trip_id,
        destinationName: g.trip.destination.name,
        departureDate: g.trip.departure_date,
        driverId: g.driver_id,
        driverName: g.driver?.user.name || 'Unassigned',
        driverPhone: g.driver?.user.phone || null,
        vehiclePlate: g.vehicle?.plate_number || null,
        totalParticipants,
        totalManifestAmount,
        paidCount: paidParticipants.length,
        pendingCount: pendingParticipants.length,
        uncollectedGuestAmount: uncollectedAmount,
        recordedSetoran,
        recordedDriverModal,
        isSettled: uncollectedAmount === 0 || recordedSetoran >= uncollectedAmount,
        participants: g.participants,
      };
    });
  }

  /**
   * Generate 2-Week Driver Payroll Settlement Slip
   */
  static async createDriverSettlementSlip(data: Record<string, any>) {
    const slipNumber = await this.generateDriverSlipNumber();
    const driverId = data.driver_id || data.driverId;
    const periodStart = new Date(data.period_start || data.periodStart);
    const periodEnd = new Date(data.period_end || data.periodEnd);
    periodEnd.setHours(23, 59, 59, 999);

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { user: true },
    });

    if (!driver) {
      throw new NotFoundError('Driver');
    }

    const packageType = data.package_type || data.packageType || 'MIXED';
    const totalTrips = Number(data.total_trips || data.totalTrips || 0);
    const totalDriverFee = Number(data.total_driver_fee || data.totalDriverFee || 0);
    const totalTransportAllowance = Number(data.total_transport_allowance || data.totalTransportAllowance || 0);
    const totalBonusOrCommission = Number(data.total_bonus_or_commission || data.totalBonusOrCommission || 0);
    const totalDeductions = Number(data.total_deductions || data.totalDeductions || 0);
    const netAmount = totalDriverFee + totalTransportAllowance + totalBonusOrCommission - totalDeductions;

    const slip = await prisma.driverSettlementSlip.create({
      data: {
        slip_number: slipNumber,
        driver_id: driverId,
        period_start: periodStart,
        period_end: periodEnd,
        package_type: packageType,
        total_trips: totalTrips,
        total_driver_fee: new Prisma.Decimal(totalDriverFee),
        total_transport_allowance: new Prisma.Decimal(totalTransportAllowance),
        total_bonus_or_commission: new Prisma.Decimal(totalBonusOrCommission),
        total_deductions: new Prisma.Decimal(totalDeductions),
        net_amount: new Prisma.Decimal(netAmount),
        status: 'DRAFT',
        notes: data.notes || null,
        breakdown_details: data.breakdown_details || data.breakdownDetails || null,
      },
      include: {
        driver: {
          include: { user: true },
        },
      },
    });

    return this.formatDriverSlip(slip);
  }

  /**
   * List Driver Settlement Slips
   */
  static async listDriverSlips(driverId?: string, status?: string) {
    const where: Prisma.DriverSettlementSlipWhereInput = {};
    if (driverId) where.driver_id = driverId;
    if (status) where.status = status;

    const slips = await prisma.driverSettlementSlip.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        driver: {
          include: { user: true },
        },
      },
    });

    return slips.map(this.formatDriverSlip);
  }

  /**
   * Get Driver Settlement Slip by ID
   */
  static async getDriverSlipById(id: string) {
    const slip = await prisma.driverSettlementSlip.findUnique({
      where: { id },
      include: {
        driver: {
          include: { user: true },
        },
      },
    });

    if (!slip) {
      throw new NotFoundError('Driver settlement slip');
    }

    return this.formatDriverSlip(slip);
  }

  /**
   * Update Driver Slip Status (e.g. DRAFT -> DRIVER_CONFIRMED -> PAID)
   */
  static async updateDriverSlipStatus(id: string, data: Record<string, any>) {
    const existing = await this.getDriverSlipById(id);
    const status = data.status;
    const updateData: Prisma.DriverSettlementSlipUpdateInput = { status };

    if (status === 'DRIVER_CONFIRMED' && !existing.confirmedAt) {
      updateData.confirmed_at = new Date();
    }
    if (status === 'PAID') {
      updateData.paid_at = new Date();
      if (data.payment_proof_url || data.paymentProofUrl) {
        updateData.payment_proof_url = data.payment_proof_url || data.paymentProofUrl;
      }

      // Automatically log expense in FinanceTransaction if paying out
      const txNumber = await this.generateTransactionNumber();
      await prisma.financeTransaction.create({
        data: {
          transaction_number: txNumber,
          type: 'EXPENSE',
          category: 'DRIVER_FEE',
          amount: new Prisma.Decimal(existing.netAmount),
          payment_method: 'TRANSFER',
          status: 'CONFIRMED',
          transaction_date: new Date(),
          driver_id: existing.driverId,
          description: `Pencairan Payroll 2-Mingguan (${existing.slipNumber}) - ${existing.driverName}`,
          notes: `Slip ID: ${existing.id}`,
        },
      });
    }

    if (data.notes !== undefined) updateData.notes = data.notes;

    const updated = await prisma.driverSettlementSlip.update({
      where: { id },
      data: updateData,
      include: {
        driver: {
          include: { user: true },
        },
      },
    });

    return this.formatDriverSlip(updated);
  }

  /**
   * Create Vendor Settlement Slip
   */
  static async createVendorSettlementSlip(data: Record<string, any>) {
    const slipNumber = await this.generateVendorSlipNumber();
    const vendorName = data.vendor_name || data.vendorName;
    const category = data.category || 'TICKET';
    const periodStart = new Date(data.period_start || data.periodStart);
    const periodEnd = new Date(data.period_end || data.periodEnd);
    periodEnd.setHours(23, 59, 59, 999);

    const totalItems = Number(data.total_items || data.totalItems || 0);
    const totalAmount = Number(data.total_amount || data.totalAmount || 0);

    const slip = await prisma.vendorSettlementSlip.create({
      data: {
        slip_number: slipNumber,
        vendor_name: vendorName,
        category,
        period_start: periodStart,
        period_end: periodEnd,
        total_items: totalItems,
        total_amount: new Prisma.Decimal(totalAmount),
        status: 'DRAFT',
        notes: data.notes || null,
        breakdown_details: data.breakdown_details || data.breakdownDetails || null,
      },
    });

    return this.formatVendorSlip(slip);
  }

  /**
   * List Vendor Slips
   */
  static async listVendorSlips(vendorName?: string, status?: string) {
    const where: Prisma.VendorSettlementSlipWhereInput = {};
    if (vendorName) where.vendor_name = { contains: vendorName, mode: 'insensitive' };
    if (status) where.status = status;

    const slips = await prisma.vendorSettlementSlip.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    return slips.map(this.formatVendorSlip);
  }

  /**
   * Get Vendor Slip by ID
   */
  static async getVendorSlipById(id: string) {
    const slip = await prisma.vendorSettlementSlip.findUnique({
      where: { id },
    });

    if (!slip) {
      throw new NotFoundError('Vendor settlement slip');
    }

    return this.formatVendorSlip(slip);
  }

  /**
   * Update Vendor Slip Status (DRAFT -> VENDOR_CONFIRMED -> PAID)
   */
  static async updateVendorSlipStatus(id: string, data: Record<string, any>) {
    const existing = await this.getVendorSlipById(id);
    const status = data.status;
    const updateData: Prisma.VendorSettlementSlipUpdateInput = { status };

    if (status === 'VENDOR_CONFIRMED' && !existing.confirmedAt) {
      updateData.confirmed_at = new Date();
    }
    if (status === 'PAID') {
      updateData.paid_at = new Date();
      if (data.payment_proof_url || data.paymentProofUrl) {
        updateData.payment_proof_url = data.payment_proof_url || data.paymentProofUrl;
      }

      // Automatically log expense in FinanceTransaction
      const txNumber = await this.generateTransactionNumber();
      const expenseCategory = existing.category === 'RENTAL_JEEP' ? 'VENDOR_RENTAL' : existing.category === 'PARKING_VIP' ? 'VENDOR_PARKING' : 'VENDOR_TICKET';
      await prisma.financeTransaction.create({
        data: {
          transaction_number: txNumber,
          type: 'EXPENSE',
          category: expenseCategory,
          amount: new Prisma.Decimal(existing.totalAmount),
          payment_method: 'TRANSFER',
          status: 'CONFIRMED',
          transaction_date: new Date(),
          vendor_name: existing.vendorName,
          description: `Pelunasan Settlement Vendor (${existing.slipNumber}) - ${existing.vendorName}`,
          notes: `Slip ID: ${existing.id}`,
        },
      });
    }

    if (data.notes !== undefined) updateData.notes = data.notes;

    const updated = await prisma.vendorSettlementSlip.update({
      where: { id },
      data: updateData,
    });

    return this.formatVendorSlip(updated);
  }

  /**
   * Update Vendor Settlement Slip Details (Only allowed for DRAFT or VENDOR_CONFIRMED)
   */
  static async updateVendorSettlementSlip(id: string, data: Record<string, any>) {
    const existing = await this.getVendorSlipById(id);

    if (existing.status === 'PAID') {
      throw new ValidationError('Tidak dapat mengubah slip vendor yang sudah LUNAS / DICAIRKAN');
    }
    if (existing.status === 'CANCELLED') {
      throw new ValidationError('Tidak dapat mengubah slip vendor yang sudah DIBATALKAN');
    }

    const updateData: Prisma.VendorSettlementSlipUpdateInput = {};

    if (data.vendor_name !== undefined || data.vendorName !== undefined) {
      updateData.vendor_name = data.vendor_name || data.vendorName;
    }
    if (data.category !== undefined) {
      updateData.category = data.category;
    }
    if (data.period_start !== undefined || data.periodStart !== undefined) {
      updateData.period_start = new Date(data.period_start || data.periodStart);
    }
    if (data.period_end !== undefined || data.periodEnd !== undefined) {
      const periodEnd = new Date(data.period_end || data.periodEnd);
      periodEnd.setHours(23, 59, 59, 999);
      updateData.period_end = periodEnd;
    }
    if (data.total_items !== undefined || data.totalItems !== undefined) {
      updateData.total_items = Number(data.total_items || data.totalItems || 0);
    }
    if (data.total_amount !== undefined || data.totalAmount !== undefined) {
      const amt = Number(data.total_amount || data.totalAmount || 0);
      updateData.total_amount = new Prisma.Decimal(amt);
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes || null;
    }
    if (data.breakdown_details !== undefined || data.breakdownDetails !== undefined) {
      updateData.breakdown_details = data.breakdown_details || data.breakdownDetails || null;
    }

    const updated = await prisma.vendorSettlementSlip.update({
      where: { id },
      data: updateData,
    });

    return this.formatVendorSlip(updated);
  }

  /**
   * DTO Formatters
   */
  private static formatTransaction(tx: any) {
    return {
      id: tx.id,
      transactionNumber: tx.transaction_number,
      type: tx.type,
      category: tx.category,
      amount: Number(tx.amount),
      paymentMethod: tx.payment_method,
      status: tx.status,
      transactionDate: tx.transaction_date,
      tripId: tx.trip_id,
      bookingGroupId: tx.booking_group_id,
      driverId: tx.driver_id,
      driverName: tx.driver?.user?.name || null,
      driverPhone: tx.driver?.user?.phone || null,
      vehicleId: tx.vehicle_id,
      vehiclePlate: tx.vehicle?.plate_number || null,
      vendorName: tx.vendor_name,
      receiptProofUrl: tx.receipt_proof_url,
      description: tx.description,
      notes: tx.notes,
      createdBy: tx.created_by,
      createdAt: tx.created_at,
      updatedAt: tx.updated_at,
      trip: tx.trip
        ? {
            id: tx.trip.id,
            destinationName: tx.trip.destination?.name,
            departureDate: tx.trip.departure_date,
          }
        : null,
    };
  }

  private static formatDriverSlip(slip: any) {
    return {
      id: slip.id,
      slipNumber: slip.slip_number,
      driverId: slip.driver_id,
      driverName: slip.driver?.user?.name || null,
      driverPhone: slip.driver?.user?.phone || null,
      periodStart: slip.period_start,
      periodEnd: slip.period_end,
      packageType: slip.package_type,
      totalTrips: slip.total_trips,
      totalDriverFee: Number(slip.total_driver_fee),
      totalTransportAllowance: Number(slip.total_transport_allowance),
      totalBonusOrCommission: Number(slip.total_bonus_or_commission),
      totalDeductions: Number(slip.total_deductions),
      netAmount: Number(slip.net_amount),
      status: slip.status,
      confirmedAt: slip.confirmed_at,
      paidAt: slip.paid_at,
      paymentProofUrl: slip.payment_proof_url,
      notes: slip.notes,
      breakdownDetails: slip.breakdown_details,
      createdAt: slip.created_at,
      updatedAt: slip.updated_at,
    };
  }

  private static formatVendorSlip(slip: any) {
    return {
      id: slip.id,
      slipNumber: slip.slip_number,
      vendorName: slip.vendor_name,
      category: slip.category,
      periodStart: slip.period_start,
      periodEnd: slip.period_end,
      totalItems: slip.total_items,
      totalAmount: Number(slip.total_amount),
      status: slip.status,
      confirmedAt: slip.confirmed_at,
      paidAt: slip.paid_at,
      paymentProofUrl: slip.payment_proof_url,
      notes: slip.notes,
      breakdownDetails: slip.breakdown_details,
      createdAt: slip.created_at,
      updatedAt: slip.updated_at,
    };
  }
}
