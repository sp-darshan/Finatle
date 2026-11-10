import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { CalculationService } from './calculationService';
import { BadRequestError } from '../errors/AppError';

/**
 * AccountBalanceService
 * Single source of truth for resolving user accounts, validating balance invariants,
 * and performing atomic balance increments/decrements.
 */
export class AccountBalanceService {
  /**
   * Resolve target account for a user.
   * If accountId is provided, finds that account.
   * Otherwise, finds default account or first account.
   * If no account exists for user, creates a default 'Cash' account atomically.
   */
  static async resolveAccount(
    userId: string,
    accountId?: string | null,
    dbClient: Prisma.TransactionClient | typeof prisma = prisma
  ) {
    let targetAccount = accountId
      ? await dbClient.account.findFirst({ where: { aid: accountId, uid: userId } })
      : await dbClient.account.findFirst({ where: { uid: userId, isDefault: true } });

    if (!targetAccount) {
      targetAccount = await dbClient.account.findFirst({ where: { uid: userId } });
    }

    if (!targetAccount) {
      targetAccount = await dbClient.account.create({
        data: {
          uid: userId,
          name: 'Cash',
          type: 'CASH',
          balance: new Prisma.Decimal(0),
          initialBalance: new Prisma.Decimal(0),
          color: '#10b981',
          isDefault: true,
        },
      });
    }

    return targetAccount;
  }

  /**
   * Validate that an intended balance mutation will not cause negative net savings or negative balance.
   */
  static async validateBalanceMutation(
    userId: string,
    accountId: string,
    balanceDelta: number,
    netSavingsDelta: number = balanceDelta
  ): Promise<void> {
    const state = await CalculationService.getFinancialState(userId, accountId);
    if (CalculationService.violatesBalanceRules(state.netSavings + netSavingsDelta, state.actualBalance + balanceDelta)) {
      throw new BadRequestError('Insufficient balance in this account for this operation.');
    }

    // Also check overall net savings across all accounts
    const overallState = await CalculationService.getFinancialState(userId);
    if (CalculationService.violatesBalanceRules(overallState.netSavings + netSavingsDelta, overallState.actualBalance + balanceDelta)) {
      throw new BadRequestError('Insufficient overall balance: Net savings cannot be negative.');
    }
  }

  /**
   * Atomically adjust an account's balance within a Prisma transaction
   */
  static async adjustBalance(
    tx: Prisma.TransactionClient,
    accountId: string,
    delta: number | Prisma.Decimal
  ) {
    const decimalDelta = typeof delta === 'number' ? new Prisma.Decimal(delta) : delta;
    return await tx.account.update({
      where: { aid: accountId },
      data: {
        balance: {
          increment: decimalDelta,
        },
      },
    });
  }
}

