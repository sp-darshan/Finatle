import { Router } from 'express';
import {
  createMoneyLent,
  createMoneyBorrowed,
  updateLoan,
  updateLoanStatus,
  deleteLoan,
  reacknowledgeLoan,
} from '../controllers/loanController';
import { ReminderSchedulerService } from '../services/reminderSchedulerService';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Loan creation aliases
router.post('/lent', asyncHandler(createMoneyLent));
router.post('/borrowed', asyncHandler(createMoneyBorrowed));
router.post('/money-lent', asyncHandler(createMoneyLent));
router.post('/money-borrowed', asyncHandler(createMoneyBorrowed));

// Loan management (supports /loans, /lent, /borrowed, /money-lent, /money-borrowed)
router.put('/loans/:loanId', asyncHandler(updateLoan));
router.put('/lent/:loanId', asyncHandler(updateLoan));
router.put('/borrowed/:loanId', asyncHandler(updateLoan));
router.put('/money-lent/:loanId', asyncHandler(updateLoan));
router.put('/money-borrowed/:loanId', asyncHandler(updateLoan));

router.patch('/loans/:loanId', asyncHandler(updateLoan));
router.patch('/lent/:loanId', asyncHandler(updateLoan));
router.patch('/borrowed/:loanId', asyncHandler(updateLoan));

router.delete('/loans/:loanId', asyncHandler(deleteLoan));
router.delete('/lent/:loanId', asyncHandler(deleteLoan));
router.delete('/borrowed/:loanId', asyncHandler(deleteLoan));
router.delete('/money-lent/:loanId', asyncHandler(deleteLoan));
router.delete('/money-borrowed/:loanId', asyncHandler(deleteLoan));

router.patch('/loans/:loanId/status', asyncHandler(updateLoanStatus));
router.patch('/lent/:loanId/status', asyncHandler(updateLoanStatus));
router.patch('/borrowed/:loanId/status', asyncHandler(updateLoanStatus));

router.post('/loans/:loanId/reacknowledge', asyncHandler(reacknowledgeLoan));
router.post('/lent/:loanId/reacknowledge', asyncHandler(reacknowledgeLoan));

// Manual trigger for testing overdue reminders
router.all('/reminders/trigger', asyncHandler(async (_req, res) => {
  await ReminderSchedulerService.checkAndSendDueReminders();
  res.json({ success: true, message: 'Checked and sent due reminders.' });
}));

export default router;
