import { Router } from 'express';
import { getBudgets, saveBudget, deleteBudget } from '../controllers/budgetController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', asyncHandler(getBudgets));
router.post('/', asyncHandler(saveBudget));
router.delete('/:category', asyncHandler(deleteBudget));
router.delete('/', asyncHandler(deleteBudget));

export default router;
