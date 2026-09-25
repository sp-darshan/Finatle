import React from 'react';
import { FinatleLogo, NavIcons } from './Icons';
import {
  LuBanknote,
  LuLandmark,
  LuWallet,
  LuPiggyBank,
  LuCreditCard,
  LuPlus,
  LuPencil,
  LuLayers,
} from 'react-icons/lu';
import type { AccountItem, AccountType } from '../types/account.types';
export type { AccountItem, AccountType };

export type TabType = 'dashboard' | 'transactions' | 'budgets' | 'analytics' | 'loans' | 'settings';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  accounts?: AccountItem[];
  selectedAccountId?: string | 'ALL';
  onSelectAccount?: (id: string | 'ALL') => void;
  onAddAccount?: () => void;
  onEditAccount?: (acc: AccountItem) => void;
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

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  currentTab,
  onSelectTab,
  accounts = [],
  selectedAccountId = 'ALL',
  onSelectAccount,
  onAddAccount,
  onEditAccount,
}) => {
  const navItems: { id: TabType; label: string; icon: React.FC<{ active?: boolean }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: NavIcons.Dashboard },
    { id: 'transactions', label: 'Transactions', icon: NavIcons.Transactions },
    { id: 'budgets', label: 'Budgets', icon: NavIcons.Budgets },
    { id: 'analytics', label: 'Analytics', icon: NavIcons.Analytics },
    { id: 'loans', label: 'Loans & Split', icon: NavIcons.Loans },
    { id: 'settings', label: 'Settings', icon: NavIcons.Settings },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <FinatleLogo size={36} />
        <div className="sidebar-logo-text">
          <h1>Finatle</h1>
          <p>Money in sync with you.</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab(item.id)}
            >
              <Icon active={isActive} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Accounts List & Switcher in Sidebar */}
      {accounts.length > 0 && onSelectAccount && (
        <div className="sidebar-accounts-section">
          <div className="sidebar-accounts-header">
            <span className="sidebar-section-title">ACCOUNTS</span>
            {onAddAccount && (
              <button
                type="button"
                className="sidebar-add-account-btn"
                onClick={onAddAccount}
                title="Add New Account"
                aria-label="Add New Account"
              >
                <LuPlus size={14} />
                <span>Add</span>
              </button>
            )}
          </div>

          <div className="sidebar-accounts-list">
            {/* All Accounts combined option */}
            <div
              className={`sidebar-account-row ${selectedAccountId === 'ALL' ? 'active' : ''}`}
              onClick={() => onSelectAccount('ALL')}
              title="View aggregated summary of all accounts"
            >
              <div className="sidebar-account-left">
                <div
                  className="sidebar-account-icon"
                  style={{
                    background: 'var(--bg-secondary, #f1f5f9)',
                    color: 'var(--text-secondary, #475569)',
                    border: '1px solid var(--border-color, #e2e8f0)',
                  }}
                >
                  <LuLayers size={14} />
                </div>
                <div className="sidebar-account-info">
                  <span className="sidebar-account-name">All Accounts</span>
                  <span className="sidebar-account-sub">Combined</span>
                </div>
              </div>
            </div>

            {/* Individual accounts */}
            {accounts.map((acc) => {
              const Icon = getAccountIcon(acc.type);
              const cardColor = acc.color || '#3b82f6';
              const isSelected = selectedAccountId === (acc.aid || acc.id);

              return (
                <div
                  key={acc.aid || acc.id}
                  className={`sidebar-account-row ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectAccount(acc.aid || acc.id)}
                  title={`${acc.name} (${acc.type})`}
                >
                  <div className="sidebar-account-left">
                    <div
                      className="sidebar-account-icon"
                      style={{
                        background: `${cardColor}18`,
                        color: cardColor,
                      }}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="sidebar-account-info">
                      <span className="sidebar-account-name">{acc.name}</span>
                      <span className="sidebar-account-sub">
                        {acc.accountNumber || acc.type.toLowerCase()}
                      </span>
                    </div>
                  </div>

                  {onEditAccount && (
                    <div className="sidebar-account-right">
                      <button
                        type="button"
                        className="sidebar-account-edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditAccount(acc);
                        }}
                        title="Edit account"
                        aria-label="Edit account"
                      >
                        <LuPencil size={11} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="sidebar-footer">
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem 0' }}>
          Finatle v1.0 • Connected
        </div>
      </div>
    </aside>
  );
});
