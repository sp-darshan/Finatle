import { Response } from 'express';
import { AuthenticatedRequest } from '../types/common.types';
import { FinanceService } from '../services/financeService';
import { BillScannerService } from '../services/billScannerService';
import { sendSuccess } from '../utils/response';

// Re-export normalized controllers for backwards compatibility
export {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from './transactionController';

export {
  createMoneyLent,
  createMoneyBorrowed,
  updateLoanStatus,
  updateLoan,
  deleteLoan,
} from './loanController';

/**
 * Fetch full finance summary including account balance, recent transactions, and active loans
 */
export async function getFinanceSummary(req: AuthenticatedRequest, res: Response) {
  const result = await FinanceService.getFinanceSummary(req.user?.userId);
  return sendSuccess(res, result);
}

/**
 * Fetch current user account balance
 */
export async function getAccountBalance(req: AuthenticatedRequest, res: Response) {
  const result = await FinanceService.getAccountBalance(req.user?.userId);
  return sendSuccess(res, result);
}

/**
 * Scan receipt image or parse receipt details via AI / heuristic engine
 */
export async function scanBill(req: AuthenticatedRequest, res: Response) {
  const result = await BillScannerService.scanBill(req.body);
  return sendSuccess(res, result);
}

