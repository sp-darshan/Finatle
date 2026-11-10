import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { LentService } from './lentService';
import { BorrowedService } from './borrowedService';
import { AccountBalanceService } from './accountBalanceService';
import { cacheService } from './cacheService';
import { FinanceService } from './financeService';
import { CreateLoanDto, UpdateLoanDto, UpdateLoanStatusDto } from '../types/finance.types';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../errors/AppError';
import { sanitizeString } from '../utils/parsers';

/**
 * LoanService (Unified Facade)
 * Coordinates and delegates all loan operations to specialized LentService and BorrowedService modules,
 * maintaining 100% backward compatibility for all existing controllers and routes.
 */
export class LoanService {
  /**
   * Create a new loan record (either Money Lent or Money Borrowed)
   */
  static async createLoan(userId: string | undefined, dto: CreateLoanDto, kind: 'lent' | 'borrowed') {
    if (!userId) throw new UnauthorizedError();
    return kind === 'lent'
      ? await LentService.createLent(userId, dto)
      : await BorrowedService.createBorrowed(userId, dto);
  }

  /**
   * Update repayment status for a loan (supports temporary optimistic IDs)
   */
  static async updateLoanStatus(userId: string | undefined, loanId: string, dto: UpdateLoanStatusDto) {
    if (!userId) throw new UnauthorizedError();

    // 1. Check Money Lent
    let lent = await prisma.moneyLent.findFirst({ where: { lid: loanId, uid: userId } });
    if (!lent && (loanId.startsWith('temp-') || loanId === 'undefined' || loanId === 'null')) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      lent = await prisma.moneyLent.findFirst({
        where: { uid: userId, createdAt: { gte: fiveMinutesAgo } },
        orderBy: { createdAt: 'desc' },
      });
    }
    if (lent) {
      return await LentService.updateLentStatus(userId, lent, dto);
    }

    // 2. Check Money Borrowed
    let borrowed = await prisma.moneyBorrowed.findFirst({ where: { bid: loanId, uid: userId } });
    if (!borrowed && (loanId.startsWith('temp-') || loanId === 'undefined' || loanId === 'null')) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      borrowed = await prisma.moneyBorrowed.findFirst({
        where: { uid: userId, createdAt: { gte: fiveMinutesAgo } },
        orderBy: { createdAt: 'desc' },
      });
    }
    if (borrowed) {
      return await BorrowedService.updateBorrowedStatus(userId, borrowed, dto);
    }

    throw new NotFoundError('Loan record not found');
  }

  /**
   * Update full details of a loan record, handling kind conversions and balance reconciliation
   */
  static async updateLoan(userId: string | undefined, loanId: string, dto: UpdateLoanDto): Promise<any> {
    if (!userId) throw new UnauthorizedError();

    let lent = await prisma.moneyLent.findFirst({ where: { lid: loanId, uid: userId } });
    if (!lent && (loanId.startsWith('temp-') || loanId === 'undefined' || loanId === 'null')) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      lent = await prisma.moneyLent.findFirst({
        where: { uid: userId, createdAt: { gte: fiveMinutesAgo } },
        orderBy: { createdAt: 'desc' },
      });
    }
    let borrowed = !lent ? await prisma.moneyBorrowed.findFirst({ where: { bid: loanId, uid: userId } }) : null;

    if (!lent && !borrowed) {
      if (loanId.startsWith('temp-') || loanId === 'undefined' || loanId === 'null') {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        borrowed = await prisma.moneyBorrowed.findFirst({
          where: { uid: userId, createdAt: { gte: fiveMinutesAgo } },
          orderBy: { createdAt: 'desc' },
        });
        if (!lent && !borrowed) {
          return await LoanService.createLoan(userId, dto as any, (dto.kind === 'borrowed' ? 'borrowed' : 'lent'));
        }
      }

      // Check if ID matches a Transaction record
      const txMatch = await prisma.transaction.findFirst({ where: { tid: loanId, uid: userId } });
      if (txMatch) {
        const { TransactionService } = await import('./transactionService');
        const txResult = await TransactionService.updateTransaction(userId, loanId, {
          amount: dto.amount,
          description: dto.description || dto.personName,
          accountId: dto.accountId,
        });
        return {
          loan: {
            id: txMatch.tid,
            lid: txMatch.tid,
            personName: dto.personName || txMatch.description || 'Record',
            amount: Number(dto.amount ?? txMatch.amount),
            paidAmount: Number(dto.paidAmount ?? 0),
            status: dto.status || 'PAID',
            accountId: dto.accountId || txMatch.accountId,
          },
          account: txResult.account,
          transaction: txResult.transaction,
        };
      }

      throw new NotFoundError('Loan record not found');
    }

    const existingKind = lent ? 'lent' : 'borrowed';
    const targetKind = dto.kind && (dto.kind === 'lent' || dto.kind === 'borrowed') ? dto.kind : existingKind;

    // Direct delegation if kind is unchanged
    if (existingKind === targetKind) {
      return existingKind === 'lent'
        ? await LentService.updateLent(userId, lent, dto)
        : await BorrowedService.updateBorrowed(userId, borrowed, dto);
    }

    // Handle cross-kind conversion (lent <-> borrowed)
    const existing = lent || borrowed!;
    const targetAccountId = dto.accountId !== undefined ? dto.accountId : existing.accountId;
    const targetAccount = await AccountBalanceService.resolveAccount(userId, targetAccountId);

    const newAmount = dto.amount !== undefined && !isNaN(Number(dto.amount)) && Number(dto.amount) > 0
      ? Number(dto.amount)
      : Number(existing.amount);
    const oldPaid = Number(existing.paidAmount || (existing.status === 'PAID' ? Number(existing.amount) : 0));

    let newPaid = dto.paidAmount !== undefined && !isNaN(Number(dto.paidAmount))
      ? Math.max(0, Number(dto.paidAmount))
      : dto.status === 'PAID'
      ? Math.max(newAmount, oldPaid)
      : dto.status === 'PENDING'
      ? 0
      : oldPaid;

    let newStatus = dto.status;
    if (newPaid >= newAmount) newStatus = 'PAID';
    else if (newPaid > 0) newStatus = 'PARTIAL';
    else if (!newStatus || newStatus === 'PAID') newStatus = 'PENDING';

    const newPersonName = dto.personName ? sanitizeString(dto.personName) || existing.personName : existing.personName;
    const newDescription = dto.description !== undefined ? sanitizeString(dto.description) : existing.description;
    const newDueAt = dto.dueAt !== undefined ? (dto.dueAt ? new Date(dto.dueAt) : null) : existing.dueAt;

    const oldEffect = existingKind === 'lent' ? oldPaid - Number(existing.amount) : Number(existing.amount) - oldPaid;
    const newEffect = targetKind === 'lent' ? newPaid - newAmount : newAmount - newPaid;
    const balanceDelta = newEffect - oldEffect;

    if (balanceDelta < 0) {
      await AccountBalanceService.validateBalanceMutation(userId, targetAccount.aid, balanceDelta, balanceDelta);
    }

    const result = await prisma.$transaction(
      async (tx) => {
        let updatedLoan;
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
              accountId: targetAccount.aid,
            },
          });
        } else {
          await tx.moneyBorrowed.delete({ where: { bid: loanId } });
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
              accountId: targetAccount.aid,
            },
          });
        }

        const account = await AccountBalanceService.adjustBalance(tx, targetAccount.aid, balanceDelta);
        const updatedId = (updatedLoan as any).lid || (updatedLoan as any).bid;
        return {
          loan: { ...updatedLoan, id: updatedId, lid: (updatedLoan as any).lid, bid: (updatedLoan as any).bid, accountId: targetAccount.aid },
          account,
          transaction: null,
        };
      },
      { maxWait: 15000, timeout: 30000 }
    );

    await cacheService.invalidateUserFinance(userId);

    return result;
  }

  /**
   * Delete a loan record and reverse its balance effects
   */
  static async deleteLoan(userId: string | undefined, loanId: string) {
    if (!userId) throw new UnauthorizedError();

    await cacheService.delete(`accounts:${userId}`);
    await cacheService.invalidateUserFinance(userId);

    let lent = await prisma.moneyLent.findFirst({ where: { lid: loanId, uid: userId } });
    if (!lent && (loanId.startsWith('temp-') || loanId === 'undefined' || loanId === 'null')) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      lent = await prisma.moneyLent.findFirst({
        where: { uid: userId, createdAt: { gte: fiveMinutesAgo } },
        orderBy: { createdAt: 'desc' },
      });
    }
    if (lent) {
      return await LentService.deleteLent(userId, lent);
    }

    let borrowed = await prisma.moneyBorrowed.findFirst({ where: { bid: loanId, uid: userId } });
    if (!borrowed && (loanId.startsWith('temp-') || loanId === 'undefined' || loanId === 'null')) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      borrowed = await prisma.moneyBorrowed.findFirst({
        where: { uid: userId, createdAt: { gte: fiveMinutesAgo } },
        orderBy: { createdAt: 'desc' },
      });
    }
    if (borrowed) {
      return await BorrowedService.deleteBorrowed(userId, borrowed);
    }

    return { message: 'Loan deleted successfully' };
  }
}
