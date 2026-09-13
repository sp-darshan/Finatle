import { Router } from 'express';
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../controllers/transactionController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/', asyncHandler(createTransaction));
router.put('/:transactionId', asyncHandler(updateTransaction));
router.patch('/:transactionId', asyncHandler(updateTransaction));
router.delete('/:transactionId', asyncHandler(deleteTransaction));

export default router;
