import { Request, Response, NextFunction } from 'express';
import { FinanceService } from '../services/finance.service';
import {
  createTransactionSchema,
  updateTransactionSchema,
  createDriverSettlementSlipSchema,
  createVendorSettlementSlipSchema,
  updateSlipStatusSchema,
} from '../validators/finance.validator';

export class FinanceController {
  static async createTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createTransactionSchema.parse(req.body);
      const adminId = (req as any).user?.userId;
      const tx = await FinanceService.createTransaction(validated, adminId);
      res.status(201).json({
        success: true,
        message: 'Finance transaction created successfully',
        data: tx,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        type,
        category,
        driverId,
        vehicleId,
        tripId,
        bookingGroupId,
        status,
        startDate,
        endDate,
        search,
        page,
        limit,
      } = req.query;

      const result = await FinanceService.listTransactions({
        type: type as any,
        category: category as string,
        driverId: driverId as string,
        vehicleId: vehicleId as string,
        tripId: tripId as string,
        bookingGroupId: bookingGroupId as string,
        status: status as string,
        startDate: startDate as string,
        endDate: endDate as string,
        search: search as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.json({
        success: true,
        message: 'Transactions retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTransactionById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tx = await FinanceService.getTransactionById(id);
      res.json({
        success: true,
        data: tx,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = updateTransactionSchema.parse(req.body);
      const tx = await FinanceService.updateTransaction(id, validated);
      res.json({
        success: true,
        message: 'Transaction updated successfully',
        data: tx,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await FinanceService.deleteTransaction(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getCashflowSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;
      const summary = await FinanceService.getCashflowSummary(
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.json({
        success: true,
        message: 'Cashflow summary retrieved successfully',
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDriverManifestSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { driverId, startDate, endDate } = req.query;
      const manifests = await FinanceService.getDriverManifestSummary(
        driverId as string | undefined,
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.json({
        success: true,
        message: 'Driver manifest summaries retrieved',
        data: manifests,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createDriverSlip(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createDriverSettlementSlipSchema.parse(req.body);
      const slip = await FinanceService.createDriverSettlementSlip(validated);
      res.status(201).json({
        success: true,
        message: 'Driver settlement slip generated successfully',
        data: slip,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listDriverSlips(req: Request, res: Response, next: NextFunction) {
    try {
      const { driverId, status } = req.query;
      const slips = await FinanceService.listDriverSlips(
        driverId as string | undefined,
        status as string | undefined
      );
      res.json({
        success: true,
        data: slips,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDriverSlipById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const slip = await FinanceService.getDriverSlipById(id);
      res.json({
        success: true,
        data: slip,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateDriverSlipStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = updateSlipStatusSchema.parse(req.body);
      const slip = await FinanceService.updateDriverSlipStatus(id, validated);
      res.json({
        success: true,
        message: `Driver slip status updated to ${validated.status}`,
        data: slip,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createVendorSlip(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createVendorSettlementSlipSchema.parse(req.body);
      const slip = await FinanceService.createVendorSettlementSlip(validated);
      res.status(201).json({
        success: true,
        message: 'Vendor settlement slip generated successfully',
        data: slip,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listVendorSlips(req: Request, res: Response, next: NextFunction) {
    try {
      const { vendorName, status } = req.query;
      const slips = await FinanceService.listVendorSlips(
        vendorName as string | undefined,
        status as string | undefined
      );
      res.json({
        success: true,
        data: slips,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getVendorSlipById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const slip = await FinanceService.getVendorSlipById(id);
      res.json({
        success: true,
        data: slip,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateVendorSlipStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = updateSlipStatusSchema.parse(req.body);
      const slip = await FinanceService.updateVendorSlipStatus(id, validated);
      res.json({
        success: true,
        message: `Vendor slip status updated to ${validated.status}`,
        data: slip,
      });
    } catch (error) {
      next(error);
    }
  }
}
