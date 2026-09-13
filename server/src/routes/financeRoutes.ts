import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import {
  getAccountBalance,
  getFinanceSummary,
  scanBill,
} from '../controllers/financeController';
import transactionRoutes from './transactionRoutes';
import loanRoutes from './loanRoutes';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Protect all finance routes with authentication middleware
router.use(authMiddleware as any);

// Account and summary endpoints
router.get('/account', asyncHandler(getAccountBalance));
router.get('/summary', asyncHandler(getFinanceSummary));

// Bill and receipt AI scanner endpoint
router.post('/scan-bill', asyncHandler(scanBill));

// Mount transaction sub-routes
router.use('/transactions', transactionRoutes);

// Mount loan sub-routes
router.use('/', loanRoutes);

export default router;
