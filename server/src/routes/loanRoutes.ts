import { Router } from 'express';
import {
  createMoneyLent,
  createMoneyBorrowed,
  updateLoan,
  updateLoanStatus,
  deleteLoan,
} from '../controllers/loanController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Loan creation aliases
router.post('/lent', asyncHandler(createMoneyLent));
router.post('/borrowed', asyncHandler(createMoneyBorrowed));
router.post('/money-lent', asyncHandler(createMoneyLent));
router.post('/money-borrowed', asyncHandler(createMoneyBorrowed));

// Loan management
router.put('/loans/:loanId', asyncHandler(updateLoan));
router.patch('/loans/:loanId', asyncHandler(updateLoan));
router.delete('/loans/:loanId', asyncHandler(deleteLoan));
router.patch('/loans/:loanId/status', asyncHandler(updateLoanStatus));

export default router;
