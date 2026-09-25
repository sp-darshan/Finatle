import { prisma } from '../config/db';
import { FinancialState } from '../types/finance.types';

export class CalculationService {
  /**
   * Computes user's current net savings and actual balance based on transactions and loans
   * (Optionally scoped to a specific account)
   */
  static async getFinancialState(userId: string, accountId?: string): Promise<FinancialState> {
    const txFilter = accountId ? { uid: userId, accountId } : { uid: userId };
    const lentFilter = accountId ? { uid: userId, accountId } : { uid: userId };
    const borrowedFilter = accountId ? { uid: userId, accountId } : { uid: userId };
    const accountFilter = accountId ? { uid: userId, aid: accountId } : { uid: userId };

    const [accounts, transactions, moneyLent, moneyBorrowed] = await Promise.all([
      prisma.account.findMany({ where: accountFilter, select: { initialBalance: true } }),
      prisma.transaction.findMany({ where: txFilter, select: { type: true, amount: true } }),
      prisma.moneyLent.findMany({ where: lentFilter, select: { amount: true, paidAmount: true, status: true } }),
      prisma.moneyBorrowed.findMany({ where: borrowedFilter, select: { amount: true, paidAmount: true, status: true } }),
    ]);

    const totalInitialBalance = accounts.reduce((sum, a) => sum + Number(a.initialBalance || 0), 0);

    const transactionBalance = transactions.reduce(
      (total, transaction) => total + (transaction.type === 'INCOME' ? Number(transaction.amount) : -Number(transaction.amount)),
      0,
    );

    const outstanding = (loan: { amount: unknown; paidAmount: unknown; status: string }) =>
      Math.max(0, Number(loan.amount) - Number(loan.paidAmount || (loan.status === 'PAID' ? loan.amount : 0)));

    const lentOutstanding = moneyLent.reduce((total, loan) => total + outstanding(loan), 0);
    const borrowedOutstanding = moneyBorrowed.reduce((total, loan) => total + outstanding(loan), 0);

    return {
      netSavings: totalInitialBalance + transactionBalance - lentOutstanding,
      actualBalance: totalInitialBalance + transactionBalance - lentOutstanding + borrowedOutstanding,
    };
  }

  /**
   * Balance validation rule: Balance and net savings cannot be negative
   */
  static violatesBalanceRules(netSavings: number, actualBalance: number): boolean {
    return netSavings < 0 || actualBalance < 0;
  }
}
