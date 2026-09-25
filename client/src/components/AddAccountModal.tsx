import React, { useState, useEffect } from 'react';
import { LuX, LuBanknote, LuLandmark, LuWallet, LuPiggyBank, LuCreditCard, LuTrash2, LuCheck } from 'react-icons/lu';
import type { AccountItem, AccountType } from '../types/account.types';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAccount: (account: AccountItem) => void;
  onDeleteAccount?: (accountId: string) => void;
  editingAccount?: AccountItem | null;
}

const ACCOUNT_TYPES: { type: AccountType; label: string; icon: React.FC<{ size?: number }> }[] = [
  { type: 'CASH', label: 'Cash Wallet', icon: LuBanknote },
  { type: 'BANK', label: 'Bank Account', icon: LuLandmark },
  { type: 'WALLET', label: 'Digital Wallet', icon: LuWallet },
  { type: 'SAVINGS', label: 'Savings', icon: LuPiggyBank },
  { type: 'OTHER', label: 'Other', icon: LuCreditCard },
];

const PRESET_COLORS = [
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#64748b', // Slate
];

export const AddAccountModal: React.FC<AddAccountModalProps> = React.memo(({
  isOpen,
  onClose,
  onSaveAccount,
  onDeleteAccount,
  editingAccount,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('BANK');
  const [initialBalance, setInitialBalance] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    if (editingAccount) {
      setName(editingAccount.name);
      setType(editingAccount.type);
      setInitialBalance(editingAccount.initialBalance ? String(editingAccount.initialBalance) : '0');
      setAccountNumber(editingAccount.accountNumber || '');
      setColor(editingAccount.color || '#3b82f6');
      setIsDefault(Boolean(editingAccount.isDefault));
    } else {
      setName('');
      setType('BANK');
      setInitialBalance('');
      setAccountNumber('');
      setColor('#3b82f6');
      setIsDefault(false);
    }
    setError('');

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (!document.querySelector('.modal-overlay:not(.add-account-modal-overlay)')) {
        document.body.classList.remove('modal-open');
        document.documentElement.classList.remove('modal-open');
      }
    };
  }, [isOpen, editingAccount, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter an account name (e.g. SBI Bank, Cash, HDFC).');
      return;
    }

    const parsedBalance = parseFloat(initialBalance) || 0;

    const account: AccountItem = {
      id: editingAccount ? editingAccount.id : `acc_${Date.now()}`,
      name: name.trim(),
      type,
      initialBalance: parsedBalance,
      color,
      accountNumber: accountNumber.trim()
        ? (accountNumber.startsWith('••••') ? accountNumber.trim() : `•••• ${accountNumber.trim().slice(-4)}`)
        : undefined,
      isDefault,
      createdAt: editingAccount?.createdAt || new Date().toISOString(),
    };

    onSaveAccount(account);
    onClose();
  };

  const SelectedIcon = ACCOUNT_TYPES.find((t) => t.type === type)?.icon || LuLandmark;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card add-account-modal-card" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header" style={{ marginBottom: '1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '12px',
                background: `${color}18`,
                border: `1.5px solid ${color}35`,
                color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 12px ${color}20`,
                transition: 'all 0.2s ease',
              }}
            >
              <SelectedIcon size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {editingAccount ? 'Edit Account' : 'Add New Account'}
              </h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Track separate balances for Cash, SBI, HDFC, Wallets, etc.
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <LuX size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '0.65rem 0.85rem',
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: 'var(--radius-md, 8px)',
              color: '#dc2626',
              fontSize: '0.82rem',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {/* Account Type Selector */}
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.45rem' }}>
              Account Type
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))',
                gap: '0.45rem',
              }}
            >
              {ACCOUNT_TYPES.map((t) => {
                const Icon = t.icon;
                const isSelected = type === t.type;
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => {
                      setType(t.type);
                      if (t.type === 'CASH' && !editingAccount && !name) setName('Cash');
                      if (t.type === 'BANK' && !editingAccount && (!name || name === 'Cash')) setName('SBI Bank');
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      padding: '0.65rem 0.4rem',
                      borderRadius: '10px',
                      border: isSelected ? `2px solid ${color}` : '1.5px solid var(--border-color, #e2e8f0)',
                      background: isSelected ? `${color}12` : 'var(--bg-secondary, #f8fafc)',
                      color: isSelected ? color : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      fontWeight: isSelected ? 700 : 600,
                      fontSize: '0.78rem',
                    }}
                  >
                    <Icon size={18} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Name */}
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Account Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. SBI Savings, Cash, HDFC Salary, Paytm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1.5px solid var(--border-color, #cbd5e1)',
                fontSize: '0.9rem',
                background: 'var(--bg-input, #ffffff)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Starting Balance & Account Number */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Starting Balance (₹)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                className="form-control"
                placeholder="0"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-color, #cbd5e1)',
                  fontSize: '0.9rem',
                  background: 'var(--bg-input, #ffffff)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Account No. <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(Optional)</span>
              </label>
              <input
                type="text"
                maxLength={8}
                className="form-control"
                placeholder="e.g. 4821"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-color, #cbd5e1)',
                  fontSize: '0.9rem',
                  background: 'var(--bg-input, #ffffff)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          {/* Color theme picker */}
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.45rem' }}>
              Card Accent Color
            </label>
            <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {PRESET_COLORS.map((c) => {
                const isCurrent = color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: c,
                      border: isCurrent ? '2.5px solid #ffffff' : '2px solid transparent',
                      boxShadow: isCurrent ? `0 0 0 2.5px ${c}, 0 2px 6px ${c}50` : '0 1px 3px rgba(0,0,0,0.12)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      transform: isCurrent ? 'scale(1.1)' : 'scale(1)',
                      transition: 'all 0.15s ease',
                    }}
                    title={c}
                  >
                    {isCurrent && <LuCheck size={15} strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Default Account Checkbox Card */}
          <label
            htmlFor="isDefaultAccount"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.7rem 0.85rem',
              borderRadius: '10px',
              border: '1.5px solid var(--border-color, #e2e8f0)',
              background: isDefault ? 'var(--primary-50, #f0fdf4)' : 'var(--bg-secondary, #f8fafc)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <input
              type="checkbox"
              id="isDefaultAccount"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              style={{
                width: 18,
                height: 18,
                cursor: 'pointer',
                accentColor: color,
                margin: 0,
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Set as primary account
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Automatically pre-selected when logging new expenses & income
              </span>
            </div>
          </label>

          {/* Actions */}
          <div
            style={{
              marginTop: '0.5rem',
              paddingTop: '0.85rem',
              borderTop: '1px solid var(--border-subtle, #f1f5f9)',
              display: 'flex',
              justifyContent: editingAccount && onDeleteAccount ? 'space-between' : 'flex-end',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            {editingAccount && onDeleteAccount && (
              <button
                type="button"
                className="btn-danger-ghost"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete "${editingAccount.name}"?`)) {
                    onDeleteAccount(editingAccount.id);
                    onClose();
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: '#ef4444',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                }}
              >
                <LuTrash2 size={16} />
                Delete
              </button>
            )}

            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.65rem 1.15rem',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-color, #cbd5e1)',
                  background: 'transparent',
                  color: 'var(--text-secondary, #475569)',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '0.65rem 1.35rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: color,
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: `0 4px 14px ${color}40`,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                {editingAccount ? 'Save Changes' : 'Create Account'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
});
