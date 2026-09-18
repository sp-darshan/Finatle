import { Router, Request, Response } from 'express';
import authRoutes from './authRoutes';
import financeRoutes from './financeRoutes';
import { checkDatabaseConnection } from '../config/db';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Health Check
router.get(
  '/health',
  asyncHandler(async (req: Request, res: Response) => {
    const dbStatus = await checkDatabaseConnection();
    res.json({
      status: 'online',
      serverTimestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
    });
  })
);

// Mount Subrouters
router.use('/auth', authRoutes);
router.use('/finance', financeRoutes);

export default router;
