import { Response } from 'express';
import { AuthenticatedRequest } from '../types/common.types';
import { TransactionService } from '../services/transactionService';
import { sendCreated, sendSuccess } from '../utils/response';

export async function createTransaction(req: AuthenticatedRequest, res: Response) {
  const result = await TransactionService.createTransaction(req.user?.userId, req.body);
  return sendCreated(res, result);
}

export async function updateTransaction(req: AuthenticatedRequest, res: Response) {
  const result = await TransactionService.updateTransaction(
    req.user?.userId,
    req.params.transactionId,
    req.body
  );
  return sendSuccess(res, result);
}

export async function deleteTransaction(req: AuthenticatedRequest, res: Response) {
  const result = await TransactionService.deleteTransaction(
    req.user?.userId,
    req.params.transactionId
  );
  return sendSuccess(res, result);
}
