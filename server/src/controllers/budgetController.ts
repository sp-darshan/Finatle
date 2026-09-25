import { Response } from 'express';
import { AuthenticatedRequest } from '../types/common.types';
import { BudgetService } from '../services/budgetService';
import { sendSuccess } from '../utils/response';

export async function getBudgets(req: AuthenticatedRequest, res: Response) {
  const result = await BudgetService.getBudgets(req.user?.userId);
  return sendSuccess(res, result);
}

export async function saveBudget(req: AuthenticatedRequest, res: Response) {
  const result = await BudgetService.upsertBudget(req.user?.userId, req.body);
  return sendSuccess(res, result, 200);
}

export async function deleteBudget(req: AuthenticatedRequest, res: Response) {
  const category = (req.params.category || req.body.category) as string;
  const result = await BudgetService.deleteBudget(req.user?.userId, category);
  return sendSuccess(res, result);
}
