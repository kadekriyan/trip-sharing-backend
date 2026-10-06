import { Router } from 'express';
import { FinanceController } from '../controllers/finance.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Protect all finance routes with Admin role
router.use(authenticate, authorize(['admin']));

// Summary & Cashflow
router.get('/summary', asyncHandler(FinanceController.getCashflowSummary));
router.get('/driver-manifests', asyncHandler(FinanceController.getDriverManifestSummary));

// Transactions CRUD
router.post('/transactions', asyncHandler(FinanceController.createTransaction));
router.get('/transactions', asyncHandler(FinanceController.listTransactions));
router.get('/transactions/:id', asyncHandler(FinanceController.getTransactionById));
router.put('/transactions/:id', asyncHandler(FinanceController.updateTransaction));
router.delete('/transactions/:id', asyncHandler(FinanceController.deleteTransaction));

// Driver Payroll Slips
router.post('/driver-slips', asyncHandler(FinanceController.createDriverSlip));
router.get('/driver-slips', asyncHandler(FinanceController.listDriverSlips));
router.get('/driver-slips/:id', asyncHandler(FinanceController.getDriverSlipById));
router.patch('/driver-slips/:id/status', asyncHandler(FinanceController.updateDriverSlipStatus));

// Vendor Settlement Slips
router.post('/vendor-slips', asyncHandler(FinanceController.createVendorSlip));
router.get('/vendor-slips', asyncHandler(FinanceController.listVendorSlips));
router.get('/vendor-slips/:id', asyncHandler(FinanceController.getVendorSlipById));
router.patch('/vendor-slips/:id/status', asyncHandler(FinanceController.updateVendorSlipStatus));

export default router;
