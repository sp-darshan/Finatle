import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { CalculationService } from './calculationService';
import { CreateTransactionDto, UpdateTransactionDto } from '../types/finance.types';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../errors/AppError';
import { parseAmount, sanitizeString } from '../utils/parsers';
import { cacheService } from './cacheService';

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

    const state = await CalculationService.getFinancialState(userId);
    const transactionImpact = type === 'INCOME' ? amount : -amount;
    if (CalculationService.violatesBalanceRules(state.netSavings + transactionImpact, state.actualBalance + transactionImpact)) {
      throw new BadRequestError('Insufficient balance for this transaction.');
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

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          uid: userId,
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
      const updatedAccount = await tx.account.upsert({
        where: { uid: userId },
        create: { uid: userId, balance: new Prisma.Decimal(balanceChange) },
        update: { balance: { increment: new Prisma.Decimal(balanceChange) } },
      });
      return { transaction: { ...transaction, id: transaction.tid, tid: transaction.tid }, account: updatedAccount };
    });

    await cacheService.invalidateUserFinance(userId);

    return result;
  }

  /**
   * Update an existing transaction with balance recalculation
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

    const oldImpact = existing.type === 'INCOME' ? Number(existing.amount) : -Number(existing.amount);
    const newImpact = newType === 'INCOME' ? newAmount : -newAmount;
    const netDifference = newImpact - oldImpact;

    const state = await CalculationService.getFinancialState(userId);
    const netSavingsBeforeEditedTransaction = state.netSavings - oldImpact;
    const actualBalanceBeforeEditedTransaction = state.actualBalance - oldImpact;
    const netSavingsAfterEdit = netSavingsBeforeEditedTransaction + newImpact;
    const actualBalanceAfterEdit = actualBalanceBeforeEditedTransaction + newImpact;

    if (CalculationService.violatesBalanceRules(netSavingsAfterEdit, actualBalanceAfterEdit)) {
      throw new BadRequestError('Insufficient balance for this transaction.');
    }

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.update({
        where: { tid: existing.tid },
        data: {
          type: newType as any,
          amount: new Prisma.Decimal(newAmount),
          description: dto.description !== undefined ? sanitizeString(dto.description) : existing.description,
          category: dto.category !== undefined ? sanitizeString(dto.category) : existing.category,
          occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : existing.occurredAt,
        },
      });

      const account = await tx.account.upsert({
        where: { uid: userId },
        create: { uid: userId, balance: new Prisma.Decimal(netDifference) },
        update: { balance: { increment: new Prisma.Decimal(netDifference) } },
      });

      return { transaction: { ...transaction, id: transaction.tid, tid: transaction.tid }, account };
    });

    await cacheService.invalidateUserFinance(userId);

    return result;
  }

  /**
   * Delete a transaction and reverse its balance impact
   */
  static async deleteTransaction(userId: string | undefined, transactionId: string) {
    if (!userId) throw new UnauthorizedError();

    const existing = await prisma.transaction.findFirst({
      where: { tid: transactionId, uid: userId },
    });

    if (!existing) {
      throw new NotFoundError('Transaction not found');
    }

    const reverseImpact = existing.type === 'INCOME' ? -Number(existing.amount) : Number(existing.amount);
    const state = await CalculationService.getFinancialState(userId);
    if (CalculationService.violatesBalanceRules(state.netSavings + reverseImpact, state.actualBalance + reverseImpact)) {
      throw new BadRequestError('Insufficient balance to delete this transaction.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.transaction.delete({ where: { tid: existing.tid } });
      await tx.account.update({
        where: { uid: userId },
        data: { balance: { increment: new Prisma.Decimal(reverseImpact) } },
      });
    });

    await cacheService.invalidateUserFinance(userId);

    return { message: 'Transaction deleted successfully' };
  }
}
