import { Response } from 'express';
import { AuthenticatedRequest } from '../types/common.types';
import { AccountService } from '../services/accountService';
import { sendSuccess, sendCreated } from '../utils/response';

export async function getAccounts(req: AuthenticatedRequest, res: Response) {
  const result = await AccountService.getAccounts(req.user?.userId);
  return sendSuccess(res, result);
}

export async function createAccount(req: AuthenticatedRequest, res: Response) {
  const result = await AccountService.createAccount(req.user?.userId, req.body);
  return sendCreated(res, result);
}

export async function updateAccount(req: AuthenticatedRequest, res: Response) {
  const accountId = req.params.id as string;
  const result = await AccountService.updateAccount(req.user?.userId, accountId, req.body);
  return sendSuccess(res, result);
}

export async function deleteAccount(req: AuthenticatedRequest, res: Response) {
  const accountId = req.params.id as string;
  const result = await AccountService.deleteAccount(req.user?.userId, accountId);
  return sendSuccess(res, result);
}
