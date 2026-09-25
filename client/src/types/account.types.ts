export type AccountType = 'CASH' | 'BANK' | 'WALLET' | 'SAVINGS' | 'OTHER';

export interface AccountItem {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  color?: string;
  accountNumber?: string;
  isDefault?: boolean;
  createdAt?: string;
}

export const DEFAULT_ACCOUNTS: AccountItem[] = [
  {
    id: 'acc_cash_default',
    name: 'Cash',
    type: 'CASH',
    initialBalance: 0,
    color: '#10b981', // emerald
    isDefault: true,
  },
  {
    id: 'acc_bank_sbi',
    name: 'SBI Bank',
    type: 'BANK',
    initialBalance: 0,
    color: '#3b82f6', // blue
    isDefault: false,
    accountNumber: '•••• 4821',
  },
];

export function getStoredAccounts(userId?: string | null): AccountItem[] {
  if (typeof window === 'undefined') return DEFAULT_ACCOUNTS;
  const key = userId ? `finatle_accounts_${userId}` : 'finatle_accounts_local';
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore json error
  }
  return DEFAULT_ACCOUNTS;
}

export function saveStoredAccounts(accounts: AccountItem[], userId?: string | null): void {
  if (typeof window === 'undefined') return;
  const key = userId ? `finatle_accounts_${userId}` : 'finatle_accounts_local';
  try {
    localStorage.setItem(key, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save accounts to localStorage:', e);
  }
}
