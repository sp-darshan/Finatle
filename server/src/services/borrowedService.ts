import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { AccountBalanceService } from './accountBalanceService';
import { cacheService } from './cacheService';
import { FinanceService } from './financeService';
import { CreateLoanDto, UpdateLoanDto, UpdateLoanStatusDto } from '../types/finance.types';
import { BadRequestError, UnauthorizedError } from '../errors/AppError';
import { parseAmount, sanitizeString } from '../utils/parsers';

/**
 * BorrowedService
 * Handles all operations related to Money Borrowed (payables):
 * - Creating borrowed records and adding borrowed amounts to account balance
 * - Updating debt repayment statuses (PAID / PARTIAL / PENDING)
 * - Editing borrowed records with balance reconciliation
 * - Deleting borrowed records and adjusting account balance
 */
export class BorrowedService {
  /**
   * Create a new Money Borrowed record
   */
  static async createBorrowed(userId: string | undefined, dto: CreateLoanDto) {
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
    const cappedPaid = Math.min(amount, numericPaid);
    const loanImpact = amount - cappedPaid;

    const data = {
      uid: userId,
      accountId: targetAccount.aid,
      personName: sanitizedPerson,
      amount: new Prisma.Decimal(amount),
      paidAmount: new Prisma.Decimal(numericPaid),
      description: sanitizeString(description),
      dueAt: dueAt ? new Date(dueAt) : null,
      status: status as any,
    };

    const result = await prisma.$transaction(
      async (tx) => {
        const loan = await tx.moneyBorrowed.create({ data });
        const account = await AccountBalanceService.adjustBalance(tx, targetAccount.aid, loanImpact);
        return {
          loan: { ...loan, id: loan.bid, bid: loan.bid, accountId: targetAccount.aid },
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
   * Update repayment status for a Money Borrowed record
   */
  static async updateBorrowedStatus(userId: string, borrowed: any, dto: UpdateLoanStatusDto) {
    const { status, paidAmount } = dto;
    const totalAmount = Number(borrowed.amount);
    const oldPaid = Number(borrowed.paidAmount || (borrowed.status === 'PAID' ? totalAmount : 0));

    let newPaid = oldPaid;
    let newStatus = borrowed.status;

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

    const cappedOldPaid = Math.min(totalAmount, oldPaid);
    const cappedNewPaid = Math.min(totalAmount, newPaid);
    const repaymentChange = -(cappedNewPaid - cappedOldPaid);

    const targetAccount = await AccountBalanceService.resolveAccount(userId, borrowed.accountId);

    if (repaymentChange < 0) {
      await AccountBalanceService.validateBalanceMutation(userId, targetAccount.aid, repaymentChange, 0);
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const updatedLoan = await tx.moneyBorrowed.update({
          where: { bid: borrowed.bid },
          data: {
            status: newStatus as any,
            paidAmount: new Prisma.Decimal(newPaid),
            accountId: targetAccount.aid,
          },
        });

        const account = await AccountBalanceService.adjustBalance(tx, targetAccount.aid, repaymentChange);
        return {
          loan: { ...updatedLoan, id: updatedLoan.bid, bid: updatedLoan.bid, accountId: targetAccount.aid },
          account,
          transaction: null,
        };
      },
      { maxWait: 15000, timeout: 30000 }
    );

    await cacheService.invalidateUserFinance(userId);
    FinanceService.warmUserFinance(userId).catch(() => {});

    return result;
  }

  /**
   * Update full details of a Money Borrowed record
   */
  static async updateBorrowed(userId: string, borrowed: any, dto: UpdateLoanDto) {
    const { personName, amount, description, dueAt, status, paidAmount, accountId } = dto;

    const targetAccount = await AccountBalanceService.resolveAccount(userId, accountId !== undefined ? accountId : borrowed.accountId);
    const newAmount = amount !== undefined && !isNaN(Number(amount)) && Number(amount) > 0
      ? Number(amount)
      : Number(borrowed.amount);
    const oldPaid = Number(borrowed.paidAmount || (borrowed.status === 'PAID' ? Number(borrowed.amount) : 0));

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

    const newPersonName = personName ? sanitizeString(personName) || borrowed.personName : borrowed.personName;
    const newDescription = description !== undefined ? sanitizeString(description) : borrowed.description;
    const newDueAt = dueAt !== undefined ? (dueAt ? new Date(dueAt) : null) : borrowed.dueAt;

    const oldEffect = Number(borrowed.amount) - oldPaid;
    const newEffect = newAmount - newPaid;
    const balanceDelta = newEffect - oldEffect;

    if (balanceDelta < 0) {
      await AccountBalanceService.validateBalanceMutation(userId, targetAccount.aid, balanceDelta, 0);
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const updatedLoan = await tx.moneyBorrowed.update({
          where: { bid: borrowed.bid },
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

        const account = await AccountBalanceService.adjustBalance(tx, targetAccount.aid, balanceDelta);
        return {
          loan: { ...updatedLoan, id: updatedLoan.bid, bid: updatedLoan.bid, accountId: targetAccount.aid },
          account,
          transaction: null,
        };
      },
      { maxWait: 15000, timeout: 30000 }
    );

    await cacheService.invalidateUserFinance(userId);
    FinanceService.warmUserFinance(userId).catch(() => {});

    return result;
  }

  /**
   * Delete a Money Borrowed record and adjust the balance
   */
  static async deleteBorrowed(userId: string, borrowed: any) {
    const oldAmountNum = Number(borrowed.amount);
    const oldPaid = Number(borrowed.paidAmount || (borrowed.status === 'PAID' ? oldAmountNum : 0));
    const oldEffect = oldAmountNum - oldPaid;
    const balanceDelta = -oldEffect;

    const targetAccount = await AccountBalanceService.resolveAccount(userId, borrowed.accountId);

    if (balanceDelta < 0) {
      await AccountBalanceService.validateBalanceMutation(userId, targetAccount.aid, balanceDelta, 0);
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.moneyBorrowed.delete({ where: { bid: borrowed.bid } });
        await AccountBalanceService.adjustBalance(tx, targetAccount.aid, balanceDelta);
      },
      { maxWait: 15000, timeout: 30000 }
    );

    await cacheService.invalidateUserFinance(userId);
    FinanceService.warmUserFinance(userId).catch(() => {});

    return { message: 'Loan deleted successfully' };
  }
}

