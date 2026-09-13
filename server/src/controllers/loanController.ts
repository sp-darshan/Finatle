import { Response } from 'express';
import { AuthenticatedRequest } from '../types/common.types';
import { LoanService } from '../services/loanService';
import { sendCreated, sendSuccess } from '../utils/response';

export async function createMoneyLent(req: AuthenticatedRequest, res: Response) {
  const result = await LoanService.createLoan(req.user?.userId, req.body, 'lent');
  return sendCreated(res, result);
}

export async function createMoneyBorrowed(req: AuthenticatedRequest, res: Response) {
  const result = await LoanService.createLoan(req.user?.userId, req.body, 'borrowed');
  return sendCreated(res, result);
}

export async function updateLoanStatus(req: AuthenticatedRequest, res: Response) {
  const result = await LoanService.updateLoanStatus(
    req.user?.userId,
    req.params.loanId,
    req.body
  );
  return sendSuccess(res, result);
}

export async function updateLoan(req: AuthenticatedRequest, res: Response) {
  const result = await LoanService.updateLoan(
    req.user?.userId,
    req.params.loanId,
    req.body
  );
  return sendSuccess(res, result);
}

export async function deleteLoan(req: AuthenticatedRequest, res: Response) {
  const result = await LoanService.deleteLoan(
    req.user?.userId,
    req.params.loanId
  );
  return sendSuccess(res, result);
}
