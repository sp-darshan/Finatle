import { Response } from 'express';
import { AuthenticatedRequest } from '../types/common.types';
import { LoanService } from '../services/loanService';
import { sendCreated, sendSuccess } from '../utils/response';

export async function createMoneyLent(req: AuthenticatedRequest, res: Response) {
  const result = await LoanService.createLoan(req.user?.userId, req.body, 'lent');
  return sendCreated(res, result);
}

export async function createMoneyBorrowed(req: AuthenticatedRequest, res: Response) {
  const result = await LoanService.createLoan(req.user?.userId, req.body, 'borrowed');
  return sendCreated(res, result);
}

export async function updateLoanStatus(req: AuthenticatedRequest, res: Response) {
  const result = await LoanService.updateLoanStatus(
    req.user?.userId,
    req.params.loanId,
    req.body
  );
  return sendSuccess(res, result);
}

export async function updateLoan(req: AuthenticatedRequest, res: Response) {
  const result = await LoanService.updateLoan(
    req.user?.userId,
    req.params.loanId,
    req.body
  );
  return sendSuccess(res, result);
}

export async function deleteLoan(req: AuthenticatedRequest, res: Response) {
  const result = await LoanService.deleteLoan(
    req.user?.userId,
    req.params.loanId
  );
  return sendSuccess(res, result);
}

export async function claimPaid(req: any, res: Response) {
  const token = req.query.token as string;
  const result = await LoanService.claimPaidByToken(token);

  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    const formattedAmount = `₹${Math.round(result.amount).toLocaleString('en-IN')}`;
    return res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Payment Acknowledged • Finatle</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0fdf4; color: #1e293b; margin: 0; padding: 24px; display: flex; align-items: center; justify-content: center; min-height: 90vh; }
    .card { max-width: 440px; width: 100%; background: #ffffff; border-radius: 20px; border: 1px solid #bbf7d0; padding: 36px 28px; text-align: center; box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.15); }
    .icon { width: 64px; height: 64px; background: #ecfdf5; border-radius: 50%; color: #059669; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 32px; font-weight: bold; }
    h2 { font-size: 22px; color: #065f46; margin: 0 0 8px; }
    p { font-size: 15px; line-height: 1.5; color: #475569; margin: 8px 0; }
    .amount { font-size: 26px; font-weight: 800; color: #059669; margin: 16px 0; }
    .note { font-size: 13px; color: #64748b; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h2>Payment Acknowledged!</h2>
    <div class="amount">${formattedAmount}</div>
    <p>Thank you, <strong>${result.friendName}</strong>! We have notified <strong>${result.lenderName}</strong> that you settled this payment.</p>
    <div class="note">
      Automated email reminders for this expense have now been snoozed.
    </div>
  </div>
</body>
</html>
    `);
  }

  return sendSuccess(res, result);
}

export async function reacknowledgeLoan(req: AuthenticatedRequest, res: Response) {
  const result = await LoanService.reacknowledgePayment(req.user?.userId, req.params.loanId);
  return sendSuccess(res, result);
}
