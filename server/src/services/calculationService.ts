import { prisma } from '../config/db';
import { FinancialState } from '../types/finance.types';

export class CalculationService {
  /**
   * Computes user's current net savings and actual balance based on transactions and loans
   */
  static async getFinancialState(userId: string): Promise<FinancialState> {
    const [transactions, moneyLent, moneyBorrowed] = await Promise.all([
      prisma.transaction.findMany({ where: { uid: userId }, select: { type: true, amount: true } }),
      prisma.moneyLent.findMany({ where: { uid: userId }, select: { amount: true, paidAmount: true, status: true } }),
      prisma.moneyBorrowed.findMany({ where: { uid: userId }, select: { amount: true, paidAmount: true, status: true } }),
    ]);

    const transactionBalance = transactions.reduce(
      (total, transaction) => total + (transaction.type === 'INCOME' ? Number(transaction.amount) : -Number(transaction.amount)),
      0,
    );

    const outstanding = (loan: { amount: unknown; paidAmount: unknown; status: string }) =>
      Math.max(0, Number(loan.amount) - Number(loan.paidAmount || (loan.status === 'PAID' ? loan.amount : 0)));

    const lentOutstanding = moneyLent.reduce((total, loan) => total + outstanding(loan), 0);
    const borrowedOutstanding = moneyBorrowed.reduce((total, loan) => total + outstanding(loan), 0);

    return {
      netSavings: transactionBalance - lentOutstanding,
      actualBalance: transactionBalance - lentOutstanding + borrowedOutstanding,
    };
  }

  /**
   * Checks if either net savings or actual balance is negative
   */
  static violatesBalanceRules(netSavings: number, actualBalance: number): boolean {
    return netSavings < 0 || actualBalance < 0;
  }
}
