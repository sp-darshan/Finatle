import crypto from 'crypto';
import { prisma } from '../config/db';
import { emailService } from './emailService';

export class ReminderSchedulerService {
  private static intervalTimer: NodeJS.Timeout | null = null;
  private static isRunning: boolean = false;
  private static lockAcquiredAt: number = 0;

  /**
   * Run the check and dispatch overdue reminder emails
   */
  static async checkAndSendDueReminders(force: boolean = false) {
    const nowTimestamp = Date.now();
    // Auto-release lock if held longer than 15s to prevent stalled background states
    if (this.isRunning && (nowTimestamp - this.lockAcquiredAt < 15000)) {
      return { status: 'already_running', count: 0 };
    }
    this.isRunning = true;
    this.lockAcquiredAt = nowTimestamp;

    // Refresh SMTP configuration in case .env was modified
    emailService.initTransporter();

    const dispatched: Array<{ to: string; friend: string; amount: number; mode?: string; smtpError?: string }> = [];

    try {
      const now = new Date();

      // Query active lent records that have a borrower email, are past due, and are not snoozed/claimed
      const overdueLoans = await prisma.moneyLent.findMany({
        where: {
          status: { in: ['PENDING', 'PARTIAL'] },
          borrowerEmail: { not: null },
          dueAt: { lte: now },
          snoozeReminders: false,
          claimedPaid: false,
        },
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      });

      for (const loan of overdueLoans) {
        if (!loan.borrowerEmail) continue;

        const freqDays = Math.max(1, loan.reminderFrequencyDays || 1);
        const freqMs = freqDays * 24 * 60 * 60 * 1000;

        const shouldSend =
          force ||
          !loan.lastReminderSentAt ||
          now.getTime() - new Date(loan.lastReminderSentAt).getTime() >= freqMs;

        if (shouldSend) {
          const claimToken = loan.claimToken || crypto.randomUUID();
          const lenderName = loan.user?.name || loan.user?.email?.split('@')[0] || 'Your Friend';
          const remainingAmount = Number(loan.amount) - Number(loan.paidAmount || 0);

          const result = await emailService.sendDueReminder({
            toEmail: loan.borrowerEmail,
            friendName: loan.personName,
            lenderName,
            amount: remainingAmount,
            description: loan.description,
            dueDate: loan.dueAt,
            claimToken,
          });

          dispatched.push({
            to: loan.borrowerEmail,
            friend: loan.personName,
            amount: remainingAmount,
            mode: result?.mode,
            smtpError: (result as any)?.smtpError,
          });

          await prisma.moneyLent.update({
            where: { lid: loan.lid },
            data: {
              lastReminderSentAt: now,
              claimToken,
            },
          });
        }
      }

      return {
        success: true,
        emailDiagnostics: emailService.getDiagnostics(),
        overdueFound: overdueLoans.length,
        dispatchedCount: dispatched.length,
        dispatched,
      };
    } catch (err) {
      console.error('[ReminderScheduler] Error running due date reminder check:', err);
      return { success: false, error: String(err) };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start the periodic background scheduler
   */
  static startScheduler(intervalMs: number = 60 * 60 * 1000) {
    if (this.intervalTimer) return;

    // Run once after server boot (with slight delay so DB connections settle)
    setTimeout(() => {
      this.checkAndSendDueReminders();
    }, 5000);

    // Run periodically
    this.intervalTimer = setInterval(() => {
      this.checkAndSendDueReminders();
    }, intervalMs);

    console.log(`[ReminderScheduler] Background due-date reminder worker started (Interval: ${Math.round(intervalMs / 60000)}m).`);
  }

  static stopScheduler() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }
}
