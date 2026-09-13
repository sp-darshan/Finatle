import { TransactionType, LoanStatus } from '@prisma/client';

export interface FinancialState {
  netSavings: number;
  actualBalance: number;
}

export interface CreateTransactionDto {
  type: TransactionType | 'INCOME' | 'EXPENSE';
  amount: number | string;
  description?: string | null;
  category?: string | null;
  occurredAt?: string | Date;
}

export interface UpdateTransactionDto {
  type?: TransactionType | 'INCOME' | 'EXPENSE';
  amount?: number | string;
  description?: string | null;
  category?: string | null;
  occurredAt?: string | Date;
}

export interface CreateLoanDto {
  personName: string;
  amount: number | string;
  paidAmount?: number | string;
  description?: string | null;
  dueAt?: string | Date | null;
  borrowerEmail?: string | null;
  reminderFrequencyDays?: number;
}

export interface UpdateLoanDto {
  personName?: string;
  amount?: number | string;
  paidAmount?: number | string;
  description?: string | null;
  dueAt?: string | Date | null;
  status?: LoanStatus | 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL';
  kind?: 'lent' | 'borrowed';
  borrowerEmail?: string | null;
  reminderFrequencyDays?: number;
  snoozeReminders?: boolean;
}

export interface UpdateLoanStatusDto {
  status?: LoanStatus | 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL';
  paidAmount?: number | string;
}
