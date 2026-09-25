import { TransactionType, LoanStatus } from '@prisma/client';

export interface FinancialState {
  netSavings: number;
  actualBalance: number;
}

export interface CreateTransactionItemDto {
  name: string;
  price: number | string;
  quantity?: number;
}

export interface CreateTransactionDto {
  type: TransactionType | 'INCOME' | 'EXPENSE';
  amount: number | string;
  description?: string | null;
  category?: string | null;
  accountId?: string | null;
  occurredAt?: string | Date;
  items?: CreateTransactionItemDto[];
}

export interface UpdateTransactionDto {
  type?: TransactionType | 'INCOME' | 'EXPENSE';
  amount?: number | string;
  description?: string | null;
  category?: string | null;
  accountId?: string | null;
  occurredAt?: string | Date;
  items?: CreateTransactionItemDto[];
}

export interface CreateLoanDto {
  personName: string;
  amount: number | string;
  paidAmount?: number | string;
  description?: string | null;
  dueAt?: string | Date | null;
  accountId?: string | null;
}

export interface UpdateLoanDto {
  personName?: string;
  amount?: number | string;
  paidAmount?: number | string;
  description?: string | null;
  dueAt?: string | Date | null;
  status?: LoanStatus | 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL';
  kind?: 'lent' | 'borrowed';
  accountId?: string | null;
}

export interface UpdateLoanStatusDto {
  status?: LoanStatus | 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL';
  paidAmount?: number | string;
}
