import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { CalculationService } from './calculationService';
import { AccountBalanceService } from './accountBalanceService';
import { cacheService } from './cacheService';
import { FinanceService } from './financeService';
import { CreateLoanDto, UpdateLoanDto, UpdateLoanStatusDto } from '../types/finance.types';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../errors/AppError';
import { parseAmount, sanitizeString } from '../utils/parsers';

/**
 * LentService
 * Handles all operations related to Money Lent (receivables):
 * - Creating lent records and deducting lend amounts from account balance
 * - Updating repayment statuses (settling loans and optional paid-back transactions)
 * - Editing lent records with balance reconciliation
 * - Deleting lent records and restoring original account balance
 */
export class LentService {
  /**
   * Create a new Money Lent record
   */
  static async createLent(userId: string | undefined, dto: CreateLoanDto) {
    if (!userId) throw new UnauthorizedError();

    const { personName, description, dueAt, paidAmount } = dto;
    const amount = parseAmount(dto.amount);
    const sanitizedPerson = sanitizeString(personName);

    if (!sanitizedPerson || !amount) {
      throw new BadRequestError('Person name and an amount greater than zero are required.');
    }

    const numericPaid = paidAmount !== undefined && !isNaN(Number(paidAmount))
      ? Math.max(0, Number(paidAmount))
      : 0;
    const status = numericPaid >= amount ? 'PAID' : numericPaid > 0 ? 'PARTIAL' : 'PENDING';

    const targetAccount = await AccountBalanceService.resolveAccount(userId, dto.accountId);
    const isSplit = Boolean(dto.isSplit);

    const cappedPaid = Math.min(amount, numericPaid);
    // Split loans do not reduce cash balance since their parent transaction already did
    const loanImpact = isSplit ? 0 : cappedPaid - amount;
    const netSavingsImpact = !isSplit ? loanImpact : 0;

    if (loanImpact < 0) {
      await AccountBalanceService.validateBalanceMutation(userId, targetAccount.aid, loanImpact, netSavingsImpact);
    }

    const data = {
      uid: userId,
      accountId: targetAccount.aid,
      personName: sanitizedPerson,
      amount: new Prisma.Decimal(amount),
      paidAmount: new Prisma.Decimal(numericPaid),
      description: sanitizeString(description),
      dueAt: dueAt ? new Date(dueAt) : null,
      status: status as any,
      isSplit,
    };

    const result = await prisma.$transaction(
      async (tx) => {
        const loan = await tx.moneyLent.create({ data });
        const account = await AccountBalanceService.adjustBalance(tx, targetAccount.aid, loanImpact);
        return {
          loan: { ...loan, id: loan.lid, lid: loan.lid, accountId: targetAccount.aid },
          account,
        };
      },
      { maxWait: 15000, timeout: 30000 }
    );

    await cacheService.invalidateUserFinance(userId);
    FinanceService.warmUserFinance(userId).catch(() => {});

    return result;
  }

  /**
   * Update repayment status (PAID / PARTIAL / PENDING) for a Money Lent record
   */
  static async updateLentStatus(userId: string, lent: any, dto: UpdateLoanStatusDto) {
    const { status, paidAmount } = dto;
    const totalAmount = Number(lent.amount);
    const oldPaid = Number(lent.paidAmount || (lent.status === 'PAID' ? totalAmount : 0));

    let newPaid = oldPaid;
    let newStatus = lent.status;

    if (paidAmount !== undefined && !isNaN(Number(paidAmount))) {
      newPaid = Math.max(0, Number(paidAmount));
      newStatus = (newPaid >= totalAmount ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'PENDING') as any;
    } else if (status) {
      if (status === 'PAID') {
        newPaid = Math.max(totalAmount, oldPaid);
        newStatus = 'PAID';
      } else if (status === 'PENDING') {
        newPaid = 0;
        newStatus = 'PENDING';
      } else {
        newStatus = status as any;
      }
    }

    const repaymentChange = newPaid - oldPaid;
    const targetAccount = await AccountBalanceService.resolveAccount(userId, lent.accountId);

    if (repaymentChange < 0) {
      await AccountBalanceService.validateBalanceMutation(userId, targetAccount.aid, repaymentChange, repaymentChange);
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const updatedLoan = await tx.moneyLent.update({
          where: { lid: lent.lid },
          data: {
            status: newStatus as any,
            paidAmount: new Prisma.Decimal(newPaid),
            accountId: targetAccount.aid,
          },
        });

        // Create an accompanying settled income record when marked PAID
        let settledTransaction = null;
        if (newStatus === 'PAID' && lent.status !== 'PAID') {
          const settledAmount = newPaid > 0 ? newPaid : (repaymentChange > 0 ? repaymentChange : totalAmount);
          if (settledAmount > 0) {
            settledTransaction = await tx.transaction.create({
              data: {
                uid: userId,
                accountId: targetAccount.aid,
                type: 'INCOME',
                amount: new Prisma.Decimal(settledAmount),
                category: 'Other (Paid Back)',
                description: lent.personName,
                occurredAt: new Date(),
              },
            });
          }
        }

        const account = await AccountBalanceService.adjustBalance(tx, targetAccount.aid, repaymentChange);
        return {
          loan: { ...updatedLoan, id: updatedLoan.lid, lid: updatedLoan.lid, accountId: targetAccount.aid },
          account,
          transaction: settledTransaction,
        };
      },
      { maxWait: 15000, timeout: 30000 }
    );

    await cacheService.invalidateUserFinance(userId);
    FinanceService.warmUserFinance(userId).catch(() => {});

    return result;
  }

  /**
   * Update full details of a Money Lent record
   */
  static async updateLent(userId: string, lent: any, dto: UpdateLoanDto) {
    const { personName, amount, description, dueAt, status, paidAmount, accountId } = dto;

    const targetAccount = await AccountBalanceService.resolveAccount(userId, accountId !== undefined ? accountId : lent.accountId);
    const newAmount = amount !== undefined && !isNaN(Number(amount)) && Number(amount) > 0
      ? Number(amount)
      : Number(lent.amount);
    const oldPaid = Number(lent.paidAmount || (lent.status === 'PAID' ? Number(lent.amount) : 0));

    let newPaid = paidAmount !== undefined && !isNaN(Number(paidAmount))
      ? Math.max(0, Number(paidAmount))
      : status === 'PAID'
      ? Math.max(newAmount, oldPaid)
      : status === 'PENDING'
      ? 0
      : oldPaid;

    let newStatus = status;
    if (newPaid >= newAmount) newStatus = 'PAID';
    else if (newPaid > 0) newStatus = 'PARTIAL';
    else if (!newStatus || newStatus === 'PAID') newStatus = 'PENDING';

    const newPersonName = personName ? sanitizeString(personName) || lent.personName : lent.personName;
    const newDescription = description !== undefined ? sanitizeString(description) : lent.description;
    const newDueAt = dueAt !== undefined ? (dueAt ? new Date(dueAt) : null) : lent.dueAt;

    const oldEffect = oldPaid - Number(lent.amount);
    const newEffect = newPaid - newAmount;
    const balanceDelta = newEffect - oldEffect;

    if (balanceDelta < 0) {
      await AccountBalanceService.validateBalanceMutation(userId, targetAccount.aid, balanceDelta, balanceDelta);
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const updatedLoan = await tx.moneyLent.update({
          where: { lid: lent.lid },
          data: {
            personName: newPersonName,
            amount: new Prisma.Decimal(newAmount),
            paidAmount: new Prisma.Decimal(newPaid),
            description: newDescription,
            dueAt: newDueAt,
            status: newStatus as any,
            accountId: targetAccount.aid,
          },
        });

        let settledTransaction = null;
        if (newStatus === 'PAID' && lent.status !== 'PAID') {
          const settledAmount = newPaid > 0 ? newPaid : (balanceDelta > 0 ? balanceDelta : newAmount);
          if (settledAmount > 0) {
            settledTransaction = await tx.transaction.create({
              data: {
                uid: userId,
                accountId: targetAccount.aid,
                type: 'INCOME',
                amount: new Prisma.Decimal(settledAmount),
                category: 'Other (Paid Back)',
                description: newPersonName,
                occurredAt: new Date(),
              },
            });
          }
        }

        const account = await AccountBalanceService.adjustBalance(tx, targetAccount.aid, balanceDelta);
        return {
          loan: { ...updatedLoan, id: updatedLoan.lid, lid: updatedLoan.lid, accountId: targetAccount.aid },
          account,
          transaction: settledTransaction,
        };
      },
      { maxWait: 15000, timeout: 30000 }
    );

    await cacheService.invalidateUserFinance(userId);
    FinanceService.warmUserFinance(userId).catch(() => {});

    return result;
  }

  /**
   * Delete a Money Lent record and refund the remaining lent amount to account balance
   */
  static async deleteLent(userId: string, lent: any) {
    const oldAmountNum = Number(lent.amount);
    const isSplitLoan = Boolean(lent.isSplit);
    const oldPaid = Number(lent.paidAmount || (lent.status === 'PAID' ? oldAmountNum : 0));
    const oldEffect = oldPaid - oldAmountNum;
    const balanceDelta = isSplitLoan ? 0 : -oldEffect;

    const targetAccount = await AccountBalanceService.resolveAccount(userId, lent.accountId);

    if (balanceDelta < 0) {
      await AccountBalanceService.validateBalanceMutation(userId, targetAccount.aid, balanceDelta, !isSplitLoan ? -oldEffect : 0);
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.moneyLent.delete({ where: { lid: lent.lid } });
        await AccountBalanceService.adjustBalance(tx, targetAccount.aid, balanceDelta);
      },
      { maxWait: 15000, timeout: 30000 }
    );

    await cacheService.invalidateUserFinance(userId);
    FinanceService.warmUserFinance(userId).catch(() => {});

    return { message: 'Loan deleted successfully' };
  }
}

