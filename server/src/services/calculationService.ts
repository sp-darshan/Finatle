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
      prisma.transaction.findMany({ where: txFilter, select: { type: true, amount: true, category: true, description: true } }),
      prisma.moneyLent.findMany({ where: lentFilter, select: { amount: true, paidAmount: true, status: true, isSplit: true, personName: true } }),
      prisma.moneyBorrowed.findMany({ where: borrowedFilter, select: { amount: true, paidAmount: true, status: true } }),
    ]);

    const totalInitialBalance = accounts.reduce((sum, a) => sum + Number(a.initialBalance || 0), 0);

    const transactionBalance = transactions.reduce(
      (total, transaction) => total + (transaction.type === 'INCOME' ? Number(transaction.amount) : -Number(transaction.amount)),
      0,
    );

    const paidBackTxNames = new Set(
      transactions
        .filter((t) => t.category && t.category.toLowerCase().includes('paid back'))
        .map((t) => (t.description || '').trim().toLowerCase())
    );

    const outstanding = (loan: { amount: unknown; paidAmount: unknown; status: string; personName?: string }) => {
      const amt = Number(loan.amount);
      const paid = Number(loan.paidAmount || (loan.status === 'PAID' ? amt : 0));
      const personKey = (loan.personName || '').trim().toLowerCase();
      // If this settled loan has an accompanying 'Other (Paid Back)' Income transaction,
      // retain loan.amount so the Income transaction accounts for the repayment without double-counting.
      if (loan.status === 'PAID' && personKey && paidBackTxNames.has(personKey)) {
        return amt;
      }
      return Math.max(0, amt - paid);
    };

    // Exclude split loans from lentOutstanding since their full amount is already recorded in transactions
    const lentOutstanding = moneyLent
      .filter((loan: any) => !loan.isSplit)
      .reduce((total, loan) => total + outstanding(loan), 0);
    const borrowedOutstanding = moneyBorrowed.reduce((total, loan) => total + Math.max(0, Number(loan.amount) - Number(loan.paidAmount || (loan.status === 'PAID' ? loan.amount : 0))), 0);

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
