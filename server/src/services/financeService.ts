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

    const [accounts, transactions, moneyLent, moneyBorrowed, budgets] = await Promise.all([
      prisma.account.findMany({
        where: { uid: userId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      }),
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

    // Ensure at least one account exists
    let resolvedAccounts = accounts;
    if (resolvedAccounts.length === 0) {
      const defaultAcc = await prisma.account.create({
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
      resolvedAccounts = [defaultAcc];
    }

    const cleanText = (text?: string | null) =>
      text ? text.replace(/\s*\((?:my share|custom split(?:\s+with\s+[^)]+)?|\d+\s+people split(?:\s*•\s*[^)]*)?|split bill)\)/gi, '').trim() : text;

    const mappedAccounts = resolvedAccounts.map((acc) => ({
      id: acc.aid,
      aid: acc.aid,
      name: acc.name,
      type: acc.type,
      balance: Number(acc.balance),
      initialBalance: Number(acc.initialBalance),
      accountNumber: acc.accountNumber || undefined,
      institution: acc.institution || undefined,
      color: acc.color || '#10b981',
      isDefault: acc.isDefault,
      createdAt: acc.createdAt.toISOString(),
      updatedAt: acc.updatedAt.toISOString(),
    }));

    const totalBalance = mappedAccounts.reduce((acc, a) => acc + a.balance, 0);

    const result = {
      account: { balance: totalBalance },
      accounts: mappedAccounts,
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
    await cacheService.set(cacheKey, result, 30);

    return result;
  }

  /**
   * Fetch user accounts and aggregate balance
   */
  static async getAccountBalance(userId?: string) {
    if (!userId) throw new UnauthorizedError();

    const accounts = await prisma.account.findMany({
      where: { uid: userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    const mappedAccounts = accounts.map((acc) => ({
      id: acc.aid,
      aid: acc.aid,
      name: acc.name,
      type: acc.type,
      balance: Number(acc.balance),
      initialBalance: Number(acc.initialBalance),
      accountNumber: acc.accountNumber || undefined,
      institution: acc.institution || undefined,
      color: acc.color || '#10b981',
      isDefault: acc.isDefault,
    }));

    const totalBalance = mappedAccounts.reduce((acc, a) => acc + a.balance, 0);

    return {
      account: { uid: userId, balance: totalBalance },
      accounts: mappedAccounts,
    };
  }

  /**
   * Pre-warm user finance summary directly in Redis after any mutation
   */
  static async warmUserFinance(userId?: string) {
    if (!userId) return;
    try {
      await this.getFinanceSummary(userId);
    } catch {
      // Ignore background warming error
    }
  }
}
