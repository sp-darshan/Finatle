import { Router } from 'express';
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from '../controllers/accountController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', asyncHandler(getAccounts));
router.post('/', asyncHandler(createAccount));
router.put('/:id', asyncHandler(updateAccount));
router.delete('/:id', asyncHandler(deleteAccount));

export default router;
