import { prisma } from '../config/db';
import { UnauthorizedError } from '../errors/AppError';

export class FinanceService {
  /**
   * Fetch complete financial summary (account, latest transactions, loans)
   */
  static async getFinanceSummary(userId?: string) {
    if (!userId) throw new UnauthorizedError();

    const [account, transactions, moneyLent, moneyBorrowed] = await Promise.all([
      prisma.account.findUnique({ where: { uid: userId } }),
      prisma.transaction.findMany({ where: { uid: userId }, orderBy: { occurredAt: 'desc' }, take: 50 }),
      prisma.moneyLent.findMany({ where: { uid: userId }, orderBy: { lentAt: 'desc' } }),
      prisma.moneyBorrowed.findMany({ where: { uid: userId }, orderBy: { borrowedAt: 'desc' } }),
    ]);

    return {
      account: account || { balance: 0 },
      transactions,
      moneyLent,
      moneyBorrowed,
    };
  }

  /**
   * Fetch account balance
   */
  static async getAccountBalance(userId?: string) {
    if (!userId) throw new UnauthorizedError();

    const account = await prisma.account.findUnique({ where: { uid: userId } });
    return {
      account: account || { uid: userId, balance: 0 },
    };
  }
}
