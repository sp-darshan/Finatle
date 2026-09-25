import { prisma } from '../config/db';
import { UnauthorizedError } from '../errors/AppError';
import { cacheService } from './cacheService';

export class FinanceService {
  /**
   * Fetch complete financial summary (account, latest transactions, loans) with caching
   */
  static async getFinanceSummary(userId?: string) {
    if (!userId) throw new UnauthorizedError();

    const cacheKey = `finance:${userId}:summary`;
    const cached = await cacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const [account, transactions, moneyLent, moneyBorrowed, budgets] = await Promise.all([
      prisma.account.findUnique({ where: { uid: userId } }),
      prisma.transaction.findMany({
        where: { uid: userId },
        include: { items: true },
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        take: 100,
      }),
      prisma.moneyLent.findMany({
        where: { uid: userId },
        orderBy: [{ lentAt: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.moneyBorrowed.findMany({
        where: { uid: userId },
        orderBy: [{ borrowedAt: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.budget.findMany({
        where: { uid: userId },
        orderBy: { category: 'asc' },
      }),
    ]);

    const cleanText = (text?: string | null) =>
      text ? text.replace(/\s*\((?:my share|custom split(?:\s+with\s+[^)]+)?|\d+\s+people split(?:\s*•\s*[^)]*)?|split bill)\)/gi, '').trim() : text;

    const result = {
      account: account || { balance: 0 },
      transactions: transactions.map((t) => ({ ...t, description: cleanText(t.description) })),
      moneyLent: moneyLent.map((l) => ({ ...l, description: cleanText(l.description) })),
      moneyBorrowed: moneyBorrowed.map((b) => ({ ...b, description: cleanText(b.description) })),
      budgets: budgets.map((b) => ({
        id: b.id,
        category: b.category,
        limit: Number(b.limit),
        period: b.period,
      })),
    };

    // Store in cache with 30s TTL
    await cacheService.set(cacheKey, result, 30 * 1000);

    return result;
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
