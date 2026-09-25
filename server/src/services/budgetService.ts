import { prisma } from '../config/db';
import { UnauthorizedError, BadRequestError } from '../errors/AppError';
import { cacheService } from './cacheService';

export class BudgetService {
  /**
   * Fetch all budgets for a given user
   */
  static async getBudgets(userId?: string) {
    if (!userId) throw new UnauthorizedError();

    const cacheKey = `budgets:${userId}`;
    const cached = await cacheService.get<any[]>(cacheKey);
    if (cached) return cached;

    const budgets = await prisma.budget.findMany({
      where: { uid: userId },
      orderBy: { category: 'asc' },
    });

    const result = budgets.map((b) => ({
      id: b.id,
      category: b.category,
      limit: Number(b.limit),
      period: b.period,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    }));

    await cacheService.set(cacheKey, result, 60 * 1000);
    return result;
  }

  /**
   * Upsert category budget limit
   */
  static async upsertBudget(userId?: string, payload?: { category?: string; limit?: number | string; period?: string }) {
    if (!userId) throw new UnauthorizedError();
    if (!payload?.category || payload.limit === undefined || payload.limit === null) {
      throw new BadRequestError('Category and limit are required.');
    }

    const category = payload.category.trim();
    const limit = Number(payload.limit);
    if (isNaN(limit) || limit <= 0) {
      throw new BadRequestError('Budget limit must be a positive number.');
    }

    const period = payload.period || 'monthly';

    const budget = await prisma.budget.upsert({
      where: {
        uid_category: {
          uid: userId,
          category,
        },
      },
      update: {
        limit,
        period,
      },
      create: {
        uid: userId,
        category,
        limit,
        period,
      },
    });

    // Invalidate caches
    await Promise.all([
      cacheService.delete(`budgets:${userId}`),
      cacheService.invalidateUserFinance(userId),
    ]);

    return {
      id: budget.id,
      category: budget.category,
      limit: Number(budget.limit),
      period: budget.period,
      createdAt: budget.createdAt.toISOString(),
      updatedAt: budget.updatedAt.toISOString(),
    };
  }

  /**
   * Delete category budget
   */
  static async deleteBudget(userId?: string, category?: string) {
    if (!userId) throw new UnauthorizedError();
    if (!category) throw new BadRequestError('Category is required.');

    const trimmed = category.trim();

    await prisma.budget.deleteMany({
      where: {
        uid: userId,
        category: {
          equals: trimmed,
          mode: 'insensitive',
        },
      },
    });

    // Invalidate caches
    await Promise.all([
      cacheService.delete(`budgets:${userId}`),
      cacheService.invalidateUserFinance(userId),
    ]);

    return { success: true, message: `Budget for ${trimmed} deleted.` };
  }
}
