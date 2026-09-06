import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import {
  createMoneyBorrowed,
  createMoneyLent,
  createTransaction,
  deleteLoan,
  deleteTransaction,
  getAccountBalance,
  getFinanceSummary,
  updateLoan,
  updateLoanStatus,
  updateTransaction,
} from '../controllers/financeController';

const router = Router();

router.use(authMiddleware as any);
router.get('/account', getAccountBalance);
router.get('/summary', getFinanceSummary);
router.post('/transactions', createTransaction);
router.put('/transactions/:transactionId', updateTransaction);
router.patch('/transactions/:transactionId', updateTransaction);
router.delete('/transactions/:transactionId', deleteTransaction);
router.post('/lent', createMoneyLent);
router.post('/borrowed', createMoneyBorrowed);
router.post('/money-lent', createMoneyLent);
router.post('/money-borrowed', createMoneyBorrowed);
router.put('/loans/:loanId', updateLoan);
router.patch('/loans/:loanId', updateLoan);
router.delete('/loans/:loanId', deleteLoan);
router.patch('/loans/:loanId/status', updateLoanStatus);

export default router;

