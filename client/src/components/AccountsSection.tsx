import React from 'react';
import { LuBanknote, LuLandmark, LuWallet, LuPiggyBank, LuCreditCard, LuPlus, LuPencil } from 'react-icons/lu';
import type { AccountItem, AccountType } from '../types/account.types';

interface AccountsSectionProps {
  accounts: AccountItem[];
  selectedAccountId?: string | 'ALL';
  onSelectAccount?: (id: string | 'ALL') => void;
  onAddAccount: () => void;
  onEditAccount: (account: AccountItem) => void;
  title?: string;
  isMobile?: boolean;
}

const getAccountIcon = (type: AccountType) => {
  switch (type) {
    case 'CASH':
      return LuBanknote;
    case 'BANK':
      return LuLandmark;
    case 'WALLET':
      return LuWallet;
    case 'SAVINGS':
      return LuPiggyBank;
    default:
      return LuCreditCard;
  }
};

import { formatRupee } from '../lib/formatters';

export const AccountsSection: React.FC<AccountsSectionProps> = React.memo(({
  accounts = [],
  selectedAccountId = 'ALL',
  onSelectAccount,
  onAddAccount,
  onEditAccount,
  title = 'Your Accounts',
  isMobile = false,
}) => {
  return (
    <div className="accounts-section">
      <div className="accounts-header-row">
        <h3>
          <LuWallet size={18} color="var(--primary)" />
          {title}
        </h3>
        <button
          type="button"
          className="accounts-add-btn-mini"
          onClick={onAddAccount}
          title="Add New Account"
        >
          <LuPlus size={14} />
          <span>Add Account</span>
        </button>
      </div>

      <div className="accounts-carousel">
        {/* "All Accounts" Filter Chip Card if selection is enabled */}
        {onSelectAccount && (
          <div
            className={`account-card-item ${selectedAccountId === 'ALL' ? 'selected' : ''}`}
            style={{
              flex: isMobile ? '0 0 150px' : '0 0 170px',
              minWidth: isMobile ? 140 : 160,
              ['--card-accent' as any]: 'var(--primary)',
            }}
            onClick={() => onSelectAccount('ALL')}
          >
            <div className="account-card-top">
              <div className="account-type-badge-wrap">
                <div
                  className="account-card-icon"
                  style={{
                    background: 'var(--primary-light, #ecfdf5)',
                    color: 'var(--primary, #10b981)',
                  }}
                >
                  <LuWallet size={18} />
                </div>
                <div className="account-card-name-wrap">
                  <span className="account-card-name">All Combined</span>
                </div>
              </div>
            </div>
            <div className="account-card-bottom">
              <div className="account-card-balance-col">
                <span className="account-card-balance-label">Total Balance</span>
                <span className="account-card-balance-val">
                  {formatRupee(accounts.reduce((sum, a) => sum + (Number(a.balance ?? a.initialBalance) || 0), 0))}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Individual Account Cards */}
        {accounts.map((acc) => {
          const Icon = getAccountIcon(acc.type);
          const cardColor = acc.color || '#3b82f6';
          const isSelected = selectedAccountId === (acc.aid || acc.id);
          const currentBal = Number(acc.balance ?? acc.initialBalance ?? 0);

          return (
            <div
              key={acc.aid || acc.id}
              className={`account-card-item ${isSelected ? 'selected' : ''}`}
              style={{
                ['--card-accent' as any]: cardColor,
              }}
              onClick={() => {
                if (onSelectAccount) {
                  onSelectAccount(acc.aid || acc.id);
                } else {
                  onEditAccount(acc);
                }
              }}
            >
              <div className="account-card-top">
                <div className="account-type-badge-wrap">
                  <div
                    className="account-card-icon"
                    style={{
                      background: `${cardColor}18`,
                      color: cardColor,
                      border: `1px solid ${cardColor}30`,
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="account-card-name-wrap">
                    <span className="account-card-name" title={acc.name}>
                      {acc.name}
                    </span>
                    {acc.accountNumber && (
                      <span className="account-card-number">{acc.accountNumber}</span>
                    )}
                  </div>
                </div>

                <div className="account-card-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="account-edit-icon-btn"
                    onClick={() => onEditAccount(acc)}
                    title="Edit account details"
                    aria-label="Edit account"
                  >
                    <LuPencil size={13} />
                  </button>
                </div>
              </div>

              <div className="account-card-bottom">
                <div className="account-card-balance-col">
                  <span className="account-card-balance-label">Balance</span>
                  <span
                    className="account-card-balance-val"
                    style={{ color: currentBal < 0 ? '#ef4444' : undefined }}
                  >
                    {formatRupee(currentBal)}
                  </span>
                </div>
                {acc.isDefault && <span className="account-default-pill">Primary</span>}
              </div>
            </div>
          );
        })}

        {/* Add Account Card */}
        <div
          className="account-card-add-new"
          onClick={onAddAccount}
          role="button"
          tabIndex={0}
        >
          <div className="account-card-add-icon">
            <LuPlus size={18} />
          </div>
          <span>+ Add Account</span>
        </div>
      </div>
    </div>
  );
});
