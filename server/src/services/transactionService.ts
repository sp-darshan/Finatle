import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { CalculationService } from './calculationService';
import { CreateTransactionDto, UpdateTransactionDto } from '../types/finance.types';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../errors/AppError';
import { parseAmount, sanitizeString } from '../utils/parsers';
import { cacheService } from './cacheService';
import { FinanceService } from './financeService';

export class TransactionService {
  /**
   * Create a new transaction (income or expense) and sync account balance
   */
  static async createTransaction(userId: string | undefined, dto: CreateTransactionDto) {
    if (!userId) throw new UnauthorizedError();

    const { type, occurredAt } = dto;
    const amount = parseAmount(dto.amount);
    const description = sanitizeString(dto.description);
    const category = sanitizeString(dto.category);

    if (!amount || !['INCOME', 'EXPENSE'].includes(type)) {
      throw new BadRequestError('Type must be INCOME or EXPENSE and amount must be greater than zero.');
    }


    let targetAccount = dto.accountId
      ? await prisma.account.findFirst({ where: { aid: dto.accountId, uid: userId } })
      : await prisma.account.findFirst({ where: { uid: userId, isDefault: true } });

    if (!targetAccount) {
      targetAccount = await prisma.account.findFirst({ where: { uid: userId } });
    }

    if (!targetAccount) {
      targetAccount = await prisma.account.create({
        data: {
          uid: userId,
          name: 'Cash',
          type: 'CASH',
          balance: 0,
          initialBalance: 0,
          color: '#10b981',
          isDefault: true,
        },
      });
    }

    const state = await CalculationService.getFinancialState(userId, targetAccount.aid);
    const transactionImpact = type === 'INCOME' ? amount : -amount;
    if (CalculationService.violatesBalanceRules(state.netSavings + transactionImpact, state.actualBalance + transactionImpact)) {
      throw new BadRequestError('Insufficient balance in this account for this transaction.');
    }

    const balanceChange = type === 'INCOME' ? amount : -amount;
    const now = new Date();
    let finalOccurredAt = now;
    if (occurredAt) {
      const parsedDate = new Date(occurredAt);
      if (!isNaN(parsedDate.getTime())) {
        const isToday =
          parsedDate.getUTCFullYear() === now.getUTCFullYear() &&
          parsedDate.getUTCMonth() === now.getUTCMonth() &&
          parsedDate.getUTCDate() === now.getUTCDate();
        finalOccurredAt = isToday ? now : parsedDate;
      }
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const transaction = await tx.transaction.create({
          data: {
            uid: userId,
            accountId: targetAccount.aid,
            type,
            amount: new Prisma.Decimal(amount),
            description,
            category,
            occurredAt: finalOccurredAt,
            items: Array.isArray(dto.items) && dto.items.length > 0
              ? {
                  create: dto.items
                    .filter((it) => it && (it.name || Number(it.price) > 0))
                    .map((it) => ({
                      name: sanitizeString(it.name) || 'Item',
                      price: new Prisma.Decimal(parseAmount(it.price) || 0),
                      quantity: it.quantity && Number(it.quantity) > 0 ? Number(it.quantity) : 1,
                    })),
                }
              : undefined,
          },
          include: {
            items: true,
          },
        });

        const updatedAccount = await tx.account.update({
          where: { aid: targetAccount.aid },
          data: { balance: { increment: new Prisma.Decimal(balanceChange) } },
        });

        return { transaction: { ...transaction, id: transaction.tid, tid: transaction.tid, accountId: targetAccount.aid }, account: updatedAccount };
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );

    await cacheService.delete(`accounts:${userId}`);
    await cacheService.invalidateUserFinance(userId);
    FinanceService.warmUserFinance(userId).catch(() => {});

    return result;
  }

  /**
   * Update an existing transaction with balance recalculation and account migration
   */
  static async updateTransaction(
    userId: string | undefined,
    transactionId: string,
    dto: UpdateTransactionDto
  ) {
    if (!userId) throw new UnauthorizedError();

    const existing = await prisma.transaction.findFirst({
      where: { tid: transactionId, uid: userId },
    });

    if (!existing) {
      throw new NotFoundError('Transaction not found');
    }

    const newType = dto.type || existing.type;
    if (!['INCOME', 'EXPENSE'].includes(newType)) {
      throw new BadRequestError('Type must be INCOME or EXPENSE.');
    }

    const parsedNewAmount = dto.amount !== undefined ? parseAmount(dto.amount) : null;
    const newAmount = parsedNewAmount !== null ? parsedNewAmount : Number(existing.amount);
    if (!newAmount || newAmount <= 0) {
      throw new BadRequestError('Amount must be greater than zero.');
    }

    const sourceAccountId = existing.accountId;
    let targetAccountId = dto.accountId !== undefined ? dto.accountId : sourceAccountId;

    let targetAccount = targetAccountId
      ? await prisma.account.findFirst({ where: { aid: targetAccountId, uid: userId } })
      : await prisma.account.findFirst({ where: { uid: userId, isDefault: true } }) || await prisma.account.findFirst({ where: { uid: userId } });

    if (!targetAccount) {
      targetAccount = await prisma.account.create({
        data: {
          uid: userId,
          name: 'Cash',
          type: 'CASH',
          balance: 0,
          initialBalance: 0,
          color: '#10b981',
          isDefault: true,
        },
      });
    }
    targetAccountId = targetAccount.aid;

    const oldImpact = existing.type === 'INCOME' ? Number(existing.amount) : -Number(existing.amount);
    const newImpact = newType === 'INCOME' ? newAmount : -newAmount;

    // Strict account-scoped validation
    if (sourceAccountId === targetAccountId) {
      const netDifference = newImpact - oldImpact;
      const state = await CalculationService.getFinancialState(userId, targetAccountId);
      if (CalculationService.violatesBalanceRules(state.netSavings + netDifference, state.actualBalance + netDifference)) {
        throw new BadRequestError('Insufficient balance in this account for this update.');
      }
    } else {
      // 1. Validate source account upon transaction removal
      if (sourceAccountId) {
        const sourceState = await CalculationService.getFinancialState(userId, sourceAccountId);
        if (CalculationService.violatesBalanceRules(sourceState.netSavings - oldImpact, sourceState.actualBalance - oldImpact)) {
          throw new BadRequestError('Insufficient balance in source account to transfer this transaction.');
        }
      }
      // 2. Validate destination account upon transaction addition
      const targetState = await CalculationService.getFinancialState(userId, targetAccountId);
      if (CalculationService.violatesBalanceRules(targetState.netSavings + newImpact, targetState.actualBalance + newImpact)) {
        throw new BadRequestError('Insufficient balance in destination account for this transaction.');
      }
    }

    // 3. Overall user validation
    const overallState = await CalculationService.getFinancialState(userId);
    const overallDiff = newImpact - oldImpact;
    if (CalculationService.violatesBalanceRules(overallState.netSavings + overallDiff, overallState.actualBalance + overallDiff)) {
      throw new BadRequestError('Insufficient overall balance for this transaction.');
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // Update line items breakdown if provided in dto
        if (Array.isArray(dto.items)) {
          await tx.transactionItem.deleteMany({
            where: { transactionId: existing.tid },
          });

          const validItems = dto.items.filter((it) => it && (it.name || Number(it.price) > 0));
          if (validItems.length > 0) {
            await tx.transactionItem.createMany({
              data: validItems.map((it) => ({
                transactionId: existing.tid,
                name: sanitizeString(it.name) || 'Item',
                price: new Prisma.Decimal(parseAmount(it.price) || 0),
                quantity: it.quantity && Number(it.quantity) > 0 ? Number(it.quantity) : 1,
              })),
            });
          }
        }

        const transaction = await tx.transaction.update({
          where: { tid: existing.tid },
          data: {
            type: newType as any,
            accountId: targetAccountId,
            amount: new Prisma.Decimal(newAmount),
            description: dto.description !== undefined ? sanitizeString(dto.description) : existing.description,
            category: dto.category !== undefined ? sanitizeString(dto.category) : existing.category,
            occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : existing.occurredAt,
          },
          include: {
            items: true,
          },
        });

        if (sourceAccountId === targetAccountId) {
          const netDifference = newImpact - oldImpact;
          await tx.account.update({
            where: { aid: targetAccountId },
            data: { balance: { increment: new Prisma.Decimal(netDifference) } },
          });
        } else {
          if (sourceAccountId) {
            await tx.account.update({
              where: { aid: sourceAccountId },
              data: { balance: { decrement: new Prisma.Decimal(oldImpact) } },
            });
          }
          await tx.account.update({
            where: { aid: targetAccountId },
            data: { balance: { increment: new Prisma.Decimal(newImpact) } },
          });
        }

        return { transaction: { ...transaction, id: transaction.tid, tid: transaction.tid, accountId: targetAccountId }, account: targetAccount };
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );

    await cacheService.delete(`accounts:${userId}`);
    await cacheService.invalidateUserFinance(userId);
    FinanceService.warmUserFinance(userId).catch(() => {});

    return result;
  }

  /**
   * Delete a transaction and reverse its balance impact
   */
  static async deleteTransaction(userId: string | undefined, transactionId: string) {
    if (!userId) throw new UnauthorizedError();

    // Invalidate cache immediately to prevent concurrent refresh from reading stale summary
    await cacheService.delete(`accounts:${userId}`);
    await cacheService.invalidateUserFinance(userId);

    const existing = await prisma.transaction.findFirst({
      where: { tid: transactionId, uid: userId },
    });

    if (!existing) {
      // Idempotent: already deleted or not found
      return { message: 'Transaction deleted successfully' };
    }

    const reverseImpact = existing.type === 'INCOME' ? -Number(existing.amount) : Number(existing.amount);
    const targetAccountId = existing.accountId || undefined;
    const state = await CalculationService.getFinancialState(userId, targetAccountId);
    if (CalculationService.violatesBalanceRules(state.netSavings + reverseImpact, state.actualBalance + reverseImpact)) {
      throw new BadRequestError('Insufficient balance in this account to delete this transaction.');
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.transaction.delete({ where: { tid: existing.tid } });

        const targetAccount = existing.accountId
          ? await tx.account.findFirst({ where: { aid: existing.accountId } })
          : await tx.account.findFirst({ where: { uid: userId, isDefault: true } }) || await tx.account.findFirst({ where: { uid: userId } });

        if (targetAccount) {
          await tx.account.update({
            where: { aid: targetAccount.aid },
            data: { balance: { increment: new Prisma.Decimal(reverseImpact) } },
          });
        }
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );

    await cacheService.delete(`accounts:${userId}`);
    await cacheService.invalidateUserFinance(userId);
    FinanceService.warmUserFinance(userId).catch(() => {});

    return { message: 'Transaction deleted successfully' };
  }
}
