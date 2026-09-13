import { Router, Request, Response } from 'express';
import authRoutes from './authRoutes';
import financeRoutes from './financeRoutes';
import { claimPaid } from '../controllers/loanController';
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

// Public Claim-Paid Endpoints (accessible without auth)
router.get('/finance/public/claim-paid', asyncHandler(claimPaid));
router.post('/finance/public/claim-paid', asyncHandler(claimPaid));
router.get('/public/claim-paid', asyncHandler(claimPaid));

// Public Manual Trigger for testing overdue reminders
router.all(['/public/reminders/trigger', '/finance/public/reminders/trigger', '/reminders/trigger'], asyncHandler(async (_req: Request, res: Response) => {
  const scheduler = (await import('../services/reminderSchedulerService')).ReminderSchedulerService;
  const report = await scheduler.checkAndSendDueReminders(true);
  res.json({ success: true, message: 'Checked and dispatched overdue reminders.', report });
}));

// Mount Subrouters
router.use('/auth', authRoutes);
router.use('/finance', financeRoutes);

export default router;
