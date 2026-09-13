import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { CalculationService } from './calculationService';
import { CreateLoanDto, UpdateLoanDto, UpdateLoanStatusDto } from '../types/finance.types';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../errors/AppError';
import { parseAmount, sanitizeString } from '../utils/parsers';
import { cacheService } from './cacheService';
import { emailService } from './emailService';

export class LoanService {
  /**
   * Create a new loan record (lent or borrowed)
   */
  static async createLoan(userId: string | undefined, dto: CreateLoanDto, kind: 'lent' | 'borrowed') {
    if (!userId) throw new UnauthorizedError();

    const { personName, description, dueAt, paidAmount, borrowerEmail, reminderFrequencyDays } = dto;
    const amount = parseAmount(dto.amount);
    const sanitizedPerson = sanitizeString(personName);

    if (!sanitizedPerson || !amount) {
      throw new BadRequestError('Person name and an amount greater than zero are required.');
    }

    const numericPaid = paidAmount !== undefined && !isNaN(Number(paidAmount))
      ? Math.max(0, Math.min(amount, Number(paidAmount)))
      : 0;
    const status = numericPaid >= amount ? 'PAID' : numericPaid > 0 ? 'PARTIAL' : 'PENDING';

    const cleanEmail = borrowerEmail ? sanitizeString(borrowerEmail)?.toLowerCase() || null : null;
    const cleanFreq = reminderFrequencyDays ? Math.max(1, Number(reminderFrequencyDays)) : 1;
    const claimToken = kind === 'lent' && (cleanEmail || dueAt) ? crypto.randomUUID() : null;

    const data = {
      uid: userId,
      personName: sanitizedPerson,
      amount: new Prisma.Decimal(amount),
      paidAmount: new Prisma.Decimal(numericPaid),
      description: sanitizeString(description),
      dueAt: dueAt ? new Date(dueAt) : null,
      status: status as any,
      ...(kind === 'lent'
        ? {
            borrowerEmail: cleanEmail,
            reminderFrequencyDays: cleanFreq,
            claimToken,
            snoozeReminders: false,
            claimedPaid: false,
          }
        : {}),
    };

    const state = await CalculationService.getFinancialState(userId);
    const loanImpact = kind === 'lent' ? numericPaid - amount : amount - numericPaid;
    const netSavingsImpact = kind === 'lent' ? loanImpact : 0;

    if (CalculationService.violatesBalanceRules(state.netSavings + netSavingsImpact, state.actualBalance + loanImpact)) {
      throw new BadRequestError('Insufficient balance for this loan.');
    }

    const balanceChange = kind === 'lent' ? numericPaid - amount : amount - numericPaid;
    const result = await prisma.$transaction(async (tx) => {
      const loan = kind === 'lent'
        ? await tx.moneyLent.create({ data: data as any })
        : await tx.moneyBorrowed.create({ data });
      const account = await tx.account.upsert({
        where: { uid: userId },
        create: { uid: userId, balance: new Prisma.Decimal(balanceChange) },
        update: { balance: { increment: new Prisma.Decimal(balanceChange) } },
      });
      return { loan, account };
    });

    await cacheService.invalidateUserFinance(userId);

    return result;
  }

  /**
   * Update the repayment status / paidAmount of a loan record
   */
  static async updateLoanStatus(userId: string | undefined, loanId: string, dto: UpdateLoanStatusDto) {
    if (!userId) throw new UnauthorizedError();

    const { status, paidAmount } = dto;

    const lent = await prisma.moneyLent.findFirst({ where: { lid: loanId, uid: userId } });
    if (lent) {
      const totalAmount = Number(lent.amount);
      const oldPaid = Number((lent as any).paidAmount || (lent.status === 'PAID' ? totalAmount : 0));

      let newPaid = oldPaid;
      let newStatus = lent.status;

      if (paidAmount !== undefined && !isNaN(Number(paidAmount))) {
        newPaid = Math.max(0, Math.min(totalAmount, Number(paidAmount)));
        newStatus = (newPaid >= totalAmount ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'PENDING') as any;
      } else if (status) {
        if (status === 'PAID') {
          newPaid = totalAmount;
          newStatus = 'PAID';
        } else if (status === 'PENDING') {
          newPaid = 0;
          newStatus = 'PENDING';
        } else {
          newStatus = status as any;
        }
      }

      const repaymentChange = newPaid - oldPaid;
      const state = await CalculationService.getFinancialState(userId);
      if (CalculationService.violatesBalanceRules(state.netSavings + repaymentChange, state.actualBalance + repaymentChange)) {
        throw new BadRequestError('Insufficient balance to reopen this lent record.');
      }

      const result = await prisma.$transaction(async (tx) => {
        const loan = await tx.moneyLent.update({
          where: { lid: lent.lid },
          data: { status: newStatus as any, paidAmount: new Prisma.Decimal(newPaid) },
        });
        const account = await tx.account.update({
          where: { uid: userId },
          data: { balance: { increment: new Prisma.Decimal(repaymentChange) } },
        });
        return { loan, account };
      });

      await cacheService.invalidateUserFinance(userId);

      return result;
    }

    const borrowed = await prisma.moneyBorrowed.findFirst({ where: { bid: loanId, uid: userId } });
    if (borrowed) {
      const totalAmount = Number(borrowed.amount);
      const oldPaid = Number((borrowed as any).paidAmount || (borrowed.status === 'PAID' ? totalAmount : 0));

      let newPaid = oldPaid;
      let newStatus = borrowed.status;

      if (paidAmount !== undefined && !isNaN(Number(paidAmount))) {
        newPaid = Math.max(0, Math.min(totalAmount, Number(paidAmount)));
        newStatus = (newPaid >= totalAmount ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'PENDING') as any;
      } else if (status) {
        if (status === 'PAID') {
          newPaid = totalAmount;
          newStatus = 'PAID';
        } else if (status === 'PENDING') {
          newPaid = 0;
          newStatus = 'PENDING';
        } else {
          newStatus = status as any;
        }
      }

      const repaymentChange = -(newPaid - oldPaid);
      const state = await CalculationService.getFinancialState(userId);
      if (CalculationService.violatesBalanceRules(state.netSavings, state.actualBalance + repaymentChange)) {
        throw new BadRequestError('Insufficient balance to repay this borrowed record.');
      }

      const result = await prisma.$transaction(async (tx) => {
        const loan = await tx.moneyBorrowed.update({
          where: { bid: borrowed.bid },
          data: { status: newStatus as any, paidAmount: new Prisma.Decimal(newPaid) },
        });
        const account = await tx.account.update({
          where: { uid: userId },
          data: { balance: { increment: new Prisma.Decimal(repaymentChange) } },
        });
        return { loan, account };
      });

      await cacheService.invalidateUserFinance(userId);

      return result;
    }

    throw new NotFoundError('Loan not found');
  }

  /**
   * Update full loan details and recalculate balances
   */
  static async updateLoan(userId: string | undefined, loanId: string, dto: UpdateLoanDto) {
    if (!userId) throw new UnauthorizedError();

    const { personName, amount, description, dueAt, status, kind, paidAmount, borrowerEmail, reminderFrequencyDays, snoozeReminders } = dto;

    const lent = await prisma.moneyLent.findFirst({ where: { lid: loanId, uid: userId } });
    const borrowed = !lent ? await prisma.moneyBorrowed.findFirst({ where: { bid: loanId, uid: userId } }) : null;

    if (!lent && !borrowed) {
      throw new NotFoundError('Loan record not found');
    }

    const existing = lent || borrowed!;
    const existingKind = lent ? 'lent' : 'borrowed';
    const targetKind = kind && (kind === 'lent' || kind === 'borrowed') ? kind : existingKind;

    const newAmount = amount !== undefined && !isNaN(Number(amount)) && Number(amount) > 0
      ? Number(amount)
      : Number(existing.amount);
    const oldPaid = Number((existing as any).paidAmount || (existing.status === 'PAID' ? Number(existing.amount) : 0));

    let newPaid = paidAmount !== undefined && !isNaN(Number(paidAmount))
      ? Math.max(0, Math.min(newAmount, Number(paidAmount)))
      : status === 'PAID'
      ? newAmount
      : status === 'PENDING'
      ? 0
      : Math.min(newAmount, oldPaid);

    let newStatus = status;
    if (newPaid >= newAmount) newStatus = 'PAID';
    else if (newPaid > 0) newStatus = 'PARTIAL';
    else if (!newStatus || newStatus === 'PAID') newStatus = 'PENDING';

    const newPersonName = personName ? sanitizeString(personName) || existing.personName : existing.personName;
    const newDescription = description !== undefined ? sanitizeString(description) : existing.description;
    const newDueAt = dueAt !== undefined ? (dueAt ? new Date(dueAt) : null) : existing.dueAt;
    const newBorrowerEmail = borrowerEmail !== undefined
      ? (borrowerEmail ? sanitizeString(borrowerEmail)?.toLowerCase() || null : null)
      : (lent ? (lent as any).borrowerEmail : null);
    const newFreq = reminderFrequencyDays !== undefined ? Math.max(1, Number(reminderFrequencyDays)) : (lent ? (lent as any).reminderFrequencyDays || 1 : 1);
    const newSnooze = snoozeReminders !== undefined ? Boolean(snoozeReminders) : (lent ? (lent as any).snoozeReminders : false);

    const oldEffect = existingKind === 'lent' ? oldPaid - Number(existing.amount) : Number(existing.amount) - oldPaid;
    const newEffect = targetKind === 'lent' ? newPaid - newAmount : newAmount - newPaid;
    const balanceDelta = newEffect - oldEffect;

    const state = await CalculationService.getFinancialState(userId);
    const oldNetEffect = existingKind === 'lent' ? oldEffect : 0;
    const newNetEffect = targetKind === 'lent' ? newEffect : 0;

    if (CalculationService.violatesBalanceRules(state.netSavings + newNetEffect - oldNetEffect, state.actualBalance + balanceDelta)) {
      throw new BadRequestError('Insufficient balance to update this loan.');
    }

    const result = await prisma.$transaction(async (tx) => {
      let updatedLoan;
      if (existingKind === targetKind) {
        if (existingKind === 'lent') {
          const claimToken = (lent as any).claimToken || (newBorrowerEmail ? crypto.randomUUID() : null);
          updatedLoan = await tx.moneyLent.update({
            where: { lid: loanId },
            data: {
              personName: newPersonName,
              amount: new Prisma.Decimal(newAmount),
              paidAmount: new Prisma.Decimal(newPaid),
              description: newDescription,
              dueAt: newDueAt,
              status: newStatus as any,
              borrowerEmail: newBorrowerEmail,
              reminderFrequencyDays: newFreq,
              snoozeReminders: newSnooze,
              claimToken,
            },
          });
        } else {
          updatedLoan = await tx.moneyBorrowed.update({
            where: { bid: loanId },
            data: {
              personName: newPersonName,
              amount: new Prisma.Decimal(newAmount),
              paidAmount: new Prisma.Decimal(newPaid),
              description: newDescription,
              dueAt: newDueAt,
              status: newStatus as any,
            },
          });
        }
      } else {
        if (existingKind === 'lent') {
          await tx.moneyLent.delete({ where: { lid: loanId } });
          updatedLoan = await tx.moneyBorrowed.create({
            data: {
              bid: loanId,
              uid: userId,
              personName: newPersonName,
              amount: new Prisma.Decimal(newAmount),
              paidAmount: new Prisma.Decimal(newPaid),
              description: newDescription,
              dueAt: newDueAt,
              status: newStatus as any,
            },
          });
        } else {
          await tx.moneyBorrowed.delete({ where: { bid: loanId } });
          const claimToken = newBorrowerEmail ? crypto.randomUUID() : null;
          updatedLoan = await tx.moneyLent.create({
            data: {
              lid: loanId,
              uid: userId,
              personName: newPersonName,
              amount: new Prisma.Decimal(newAmount),
              paidAmount: new Prisma.Decimal(newPaid),
              description: newDescription,
              dueAt: newDueAt,
              status: newStatus as any,
              borrowerEmail: newBorrowerEmail,
              reminderFrequencyDays: newFreq,
              snoozeReminders: newSnooze,
              claimToken,
            },
          });
        }
      }

      const account = await tx.account.upsert({
        where: { uid: userId },
        create: { uid: userId, balance: new Prisma.Decimal(balanceDelta) },
        update: { balance: { increment: new Prisma.Decimal(balanceDelta) } },
      });

      return { loan: updatedLoan, account };
    });

    await cacheService.invalidateUserFinance(userId);

    return result;
  }

  /**
   * Delete a loan record and reverse its balance effects
   */
  static async deleteLoan(userId: string | undefined, loanId: string) {
    if (!userId) throw new UnauthorizedError();

    const lent = await prisma.moneyLent.findFirst({ where: { lid: loanId, uid: userId } });
    const borrowed = !lent ? await prisma.moneyBorrowed.findFirst({ where: { bid: loanId, uid: userId } }) : null;

    if (!lent && !borrowed) {
      throw new NotFoundError('Loan record not found');
    }

    const existing = lent || borrowed!;
    const existingKind = lent ? 'lent' : 'borrowed';
    const oldAmountNum = Number(existing.amount);
    const oldPaid = Number((existing as any).paidAmount || (existing.status === 'PAID' ? oldAmountNum : 0));
    const oldEffect = existingKind === 'lent' ? oldPaid - oldAmountNum : oldAmountNum - oldPaid;
    const balanceDelta = -oldEffect;

    const state = await CalculationService.getFinancialState(userId);
    const netSavingsDelta = existingKind === 'lent' ? -oldEffect : 0;
    if (CalculationService.violatesBalanceRules(state.netSavings + netSavingsDelta, state.actualBalance + balanceDelta)) {
      throw new BadRequestError('Insufficient balance to delete this loan.');
    }

    await prisma.$transaction(async (tx) => {
      if (existingKind === 'lent') {
        await tx.moneyLent.delete({ where: { lid: loanId } });
      } else {
        await tx.moneyBorrowed.delete({ where: { bid: loanId } });
      }
      await tx.account.update({
        where: { uid: userId },
        data: { balance: { increment: new Prisma.Decimal(balanceDelta) } },
      });
    });

    await cacheService.invalidateUserFinance(userId);

    return { message: 'Loan deleted successfully' };
  }

  /**
   * Public Action: Friend marks payment as claimed paid via token in email
   */
  static async claimPaidByToken(token: string) {
    if (!token || typeof token !== 'string') {
      throw new BadRequestError('Claim token is required.');
    }

    const loan = await prisma.moneyLent.findUnique({
      where: { claimToken: token },
      include: { user: true },
    });

    if (!loan) {
      throw new NotFoundError('Payment request not found or link has expired.');
    }

    if (loan.status === 'PAID') {
      return {
        alreadyPaid: true,
        friendName: loan.personName,
        lenderName: loan.user?.name || 'Your Friend',
        amount: Number(loan.amount),
      };
    }

    // Mark as claimed paid and snooze reminders
    const updated = await prisma.moneyLent.update({
      where: { lid: loan.lid },
      data: {
        claimedPaid: true,
        claimedPaidAt: new Date(),
        snoozeReminders: true,
      },
    });

    // Invalidate lender's cached finance summary
    await cacheService.invalidateUserFinance(loan.uid);

    // Notify lender via email
    if (loan.user?.email) {
      await emailService.sendLenderClaimNotification({
        lenderEmail: loan.user.email,
        lenderName: loan.user.name || loan.user.email.split('@')[0],
        friendName: loan.personName,
        amount: Number(loan.amount) - Number(loan.paidAmount || 0),
        description: loan.description,
      });
    }

    return {
      success: true,
      friendName: loan.personName,
      lenderName: loan.user?.name || loan.user?.email?.split('@')[0] || 'Your Friend',
      amount: Number(loan.amount),
      description: loan.description,
    };
  }

  /**
   * Lender Action: Re-acknowledge that payment was NOT received (dispute claim & resume reminders)
   */
  static async reacknowledgePayment(userId: string | undefined, loanId: string) {
    if (!userId) throw new UnauthorizedError();

    const loan = await prisma.moneyLent.findFirst({
      where: { lid: loanId, uid: userId },
      include: { user: true },
    });

    if (!loan) {
      throw new NotFoundError('Loan record not found.');
    }

    const updated = await prisma.moneyLent.update({
      where: { lid: loanId },
      data: {
        claimedPaid: false,
        claimedPaidAt: null,
        snoozeReminders: false,
        lastReminderSentAt: null,
      },
    });

    await cacheService.invalidateUserFinance(userId);

    // Send dispute notice email to friend if borrowerEmail is present
    if (loan.borrowerEmail && loan.claimToken) {
      const lenderName = loan.user?.name || loan.user?.email?.split('@')[0] || 'Friend';
      await emailService.sendPaymentDisputeNotice({
        toEmail: loan.borrowerEmail,
        friendName: loan.personName,
        lenderName,
        amount: Number(loan.amount) - Number(loan.paidAmount || 0),
        description: loan.description,
        claimToken: loan.claimToken,
      });
    }

    return {
      success: true,
      message: 'Reminders resumed and payment notice sent to friend.',
      loan: updated,
    };
  }
}
