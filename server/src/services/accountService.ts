import { prisma } from '../config/db';
import { UnauthorizedError, BadRequestError, NotFoundError } from '../errors/AppError';
import { cacheService } from './cacheService';

export interface CreateAccountPayload {
  name: string;
  type?: 'CASH' | 'BANK' | 'WALLET' | 'SAVINGS' | 'OTHER';
  initialBalance?: number | string;
  accountNumber?: string;
  institution?: string;
  color?: string;
  isDefault?: boolean;
}

export interface UpdateAccountPayload {
  name?: string;
  type?: 'CASH' | 'BANK' | 'WALLET' | 'SAVINGS' | 'OTHER';
  initialBalance?: number | string;
  balance?: number | string;
  accountNumber?: string;
  institution?: string;
  color?: string;
  isDefault?: boolean;
}

export class AccountService {
  /**
   * Fetch all user accounts, creating a default Cash account if none exists
   */
  static async getAccounts(userId?: string) {
    if (!userId) throw new UnauthorizedError();

    const cacheKey = `accounts:${userId}`;
    const cached = await cacheService.get<any[]>(cacheKey);
    if (cached) return cached;

    const [accounts, txs, lents, borroweds] = await Promise.all([
      prisma.account.findMany({
        where: { uid: userId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      }),
      prisma.transaction.findMany({
        where: { uid: userId },
        select: { accountId: true, type: true, amount: true },
      }),
      prisma.moneyLent.findMany({
        where: { uid: userId },
        select: { accountId: true, amount: true, paidAmount: true, status: true },
      }),
      prisma.moneyBorrowed.findMany({
        where: { uid: userId },
        select: { accountId: true, amount: true, paidAmount: true, status: true },
      }),
    ]);

    let userAccounts = accounts;

    // Auto-seed default cash account if the user has none
    if (userAccounts.length === 0) {
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
      userAccounts = [defaultAcc];
    }

    const result = userAccounts.map((acc) => {
      const accTxs = txs.filter((t) => t.accountId === acc.aid);
      const accLent = lents.filter((l) => l.accountId === acc.aid);
      const accBorrowed = borroweds.filter((b) => b.accountId === acc.aid);

      const txNet = accTxs.reduce(
        (sum, t) => sum + (t.type === 'INCOME' ? Number(t.amount) : -Number(t.amount)),
        0
      );
      const lentOutstanding = accLent.reduce(
        (sum, l) => sum + Math.max(0, Number(l.amount) - Number(l.paidAmount || (l.status === 'PAID' ? l.amount : 0))),
        0
      );
      const borrowedOutstanding = accBorrowed.reduce(
        (sum, b) => sum + Math.max(0, Number(b.amount) - Number(b.paidAmount || (b.status === 'PAID' ? b.amount : 0))),
        0
      );

      const realTimeBalance = Number(acc.initialBalance || 0) + txNet - lentOutstanding + borrowedOutstanding;

      return {
        id: acc.aid,
        aid: acc.aid,
        name: acc.name,
        type: acc.type,
        balance: realTimeBalance,
        initialBalance: Number(acc.initialBalance || 0),
        accountNumber: acc.accountNumber || undefined,
        institution: acc.institution || undefined,
        color: acc.color || '#10b981',
        isDefault: acc.isDefault,
        createdAt: acc.createdAt.toISOString(),
        updatedAt: acc.updatedAt.toISOString(),
      };
    });

    await cacheService.set(cacheKey, result, 60 * 1000);
    return result;
  }

  /**
   * Create a new bank/cash/wallet account
   */
  static async createAccount(userId?: string, payload?: CreateAccountPayload) {
    if (!userId) throw new UnauthorizedError();
    if (!payload?.name?.trim()) {
      throw new BadRequestError('Account name is required.');
    }

    const initialBal = Number(payload.initialBalance || 0);
    const balance = isNaN(initialBal) ? 0 : initialBal;

    // If marked as default, clear any existing default flag for this user
    if (payload.isDefault) {
      await prisma.account.updateMany({
        where: { uid: userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const newAccount = await prisma.account.create({
      data: {
        uid: userId,
        name: payload.name.trim(),
        type: (payload.type as any) || 'BANK',
        balance: balance,
        initialBalance: balance,
        accountNumber: payload.accountNumber?.trim() || null,
        institution: payload.institution?.trim() || null,
        color: payload.color || '#3b82f6',
        isDefault: Boolean(payload.isDefault),
      },
    });

    await this.invalidateUserAccountCache(userId);

    return {
      id: newAccount.aid,
      aid: newAccount.aid,
      name: newAccount.name,
      type: newAccount.type,
      balance: Number(newAccount.balance),
      initialBalance: Number(newAccount.initialBalance),
      accountNumber: newAccount.accountNumber || undefined,
      institution: newAccount.institution || undefined,
      color: newAccount.color || '#3b82f6',
      isDefault: newAccount.isDefault,
      createdAt: newAccount.createdAt.toISOString(),
      updatedAt: newAccount.updatedAt.toISOString(),
    };
  }

  /**
   * Update an existing account details
   */
  static async updateAccount(userId?: string, accountId?: string, payload?: UpdateAccountPayload) {
    if (!userId) throw new UnauthorizedError();
    if (!accountId) throw new BadRequestError('Account ID is required.');

    const existing = await prisma.account.findFirst({
      where: { aid: accountId, uid: userId },
    });
    if (!existing) throw new NotFoundError('Account not found.');

    if (payload?.isDefault) {
      await prisma.account.updateMany({
        where: { uid: userId, isDefault: true, aid: { not: accountId } },
        data: { isDefault: false },
      });
    }

    const updateData: any = {};
    if (payload?.name !== undefined) updateData.name = payload.name.trim();
    if (payload?.type !== undefined) updateData.type = payload.type;
    if (payload?.accountNumber !== undefined) updateData.accountNumber = payload.accountNumber?.trim() || null;
    if (payload?.institution !== undefined) updateData.institution = payload.institution?.trim() || null;
    if (payload?.color !== undefined) updateData.color = payload.color;
    if (payload?.isDefault !== undefined) updateData.isDefault = Boolean(payload.isDefault);

    if (payload?.initialBalance !== undefined) {
      const initBal = Number(payload.initialBalance);
      if (!isNaN(initBal)) {
        const diff = initBal - Number(existing.initialBalance);
        updateData.initialBalance = initBal;
        updateData.balance = Number(existing.balance) + diff;
      }
    }

    if (payload?.balance !== undefined) {
      const newBal = Number(payload.balance);
      if (!isNaN(newBal)) updateData.balance = newBal;
    }

    const updated = await prisma.account.update({
      where: { aid: accountId },
      data: updateData,
    });

    await this.invalidateUserAccountCache(userId);

    return {
      id: updated.aid,
      aid: updated.aid,
      name: updated.name,
      type: updated.type,
      balance: Number(updated.balance),
      initialBalance: Number(updated.initialBalance),
      accountNumber: updated.accountNumber || undefined,
      institution: updated.institution || undefined,
      color: updated.color || '#3b82f6',
      isDefault: updated.isDefault,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Delete an account
   */
  static async deleteAccount(userId?: string, accountId?: string) {
    if (!userId) throw new UnauthorizedError();
    if (!accountId) throw new BadRequestError('Account ID is required.');

    const count = await prisma.account.count({ where: { uid: userId } });
    if (count <= 1) {
      throw new BadRequestError('You must maintain at least one active account.');
    }

    const existing = await prisma.account.findFirst({
      where: { aid: accountId, uid: userId },
    });
    if (!existing) throw new NotFoundError('Account not found.');

    await prisma.account.delete({ where: { aid: accountId } });

    // If the deleted account was default, set another account as default
    if (existing.isDefault) {
      const remaining = await prisma.account.findFirst({ where: { uid: userId } });
      if (remaining) {
        await prisma.account.update({
          where: { aid: remaining.aid },
          data: { isDefault: true },
        });
      }
    }

    await this.invalidateUserAccountCache(userId);

    return { success: true, message: 'Account deleted successfully.' };
  }

  /**
   * Invalidate account and finance summary caches
   */
  static async invalidateUserAccountCache(userId: string) {
    await Promise.all([
      cacheService.delete(`accounts:${userId}`),
      cacheService.invalidateUserFinance(userId),
    ]);
  }
}
