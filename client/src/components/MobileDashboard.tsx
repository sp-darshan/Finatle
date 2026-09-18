import React, { useState, useEffect, useRef } from 'react';
import {
  FinatleLogo,
  CalendarIcon,
  LeafSproutIcon,
  MinusIcon,
  PlusIcon,
  UsersGroupIcon,
  ScanBillIcon,
  ChevronRightIcon,
  NavIcons,
  CategoryBadge,
  DownloadAppIcon,
  PencilEditIcon,
} from './Icons';
import type { TransactionItem } from './RecentTransactions';
import { ExpenseDonutChart, type CategoryExpense } from './ExpenseDonutChart';
import type { LoanItem } from './LoansSettlements';
import {
  BudgetManager,
  type BudgetLimit,
} from './BudgetManager';
import { SettingsView } from './SettingsView';
import { LuReceipt, LuX, LuPlus, LuChevronDown, LuChevronUp, LuShoppingBag } from 'react-icons/lu';
import { useGreeting } from '../lib/greeting';


interface MobileDashboardProps {
  balance: number;
  actualBalance?: number;
  userName?: string;
  user?: { uid: string; email: string; name?: string | null; age?: number | null; phone?: string | null } | null;
  token?: string | null;
  onUpdateUser?: (user: any) => void;
  onDeleteAccount?: () => void;
  transactions: TransactionItem[];
  loans?: LoanItem[];
  totalExpense?: number;
  expenseCategories?: CategoryExpense[];
  budgets: BudgetLimit[];
  spending: Record<string, number>;
  onSaveBudget: (budget: BudgetLimit) => void;
  onDeleteBudget: (category: string) => void;
  onOpenAddModal: (initialKind?: 'expense' | 'income' | 'lent' | 'borrowed' | 'split') => void;
  onOpenScanner: () => void;
  onOpenLoans: () => void;
  onOpenAllTransactions: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  onOpenPWA: () => void;
  onEditTransaction?: (transaction: TransactionItem) => void;
  onEditLoan?: (loan: LoanItem) => void;
  onSettleLoan?: (id: string, status: LoanItem['status']) => void;
  canSettleLoan?: (loan: LoanItem) => boolean;
  currentNav: string;
  onSelectNav: (nav: string) => void;
}

export const MobileDashboard: React.FC<MobileDashboardProps> = React.memo(({
  balance = 0,
  actualBalance,
  userName = 'Darshan',
  user,
  token,
  onUpdateUser,
  onDeleteAccount,
  transactions = [],
  loans = [],
  totalExpense = 0,
  expenseCategories = [],
  budgets,
  spending,
  onSaveBudget,
  onDeleteBudget,
  onOpenAddModal,
  onOpenScanner,
  onOpenLoans,
  onOpenAllTransactions,
  onLogout,
  onOpenSettings,
  onOpenPWA,
  onEditTransaction,
  onEditLoan,
  currentNav,
  onSelectNav,
}) => {
  const { greeting, timeString, dateString } = useGreeting();
  const [balanceView, setBalanceView] = useState<'net' | 'actual'>('net');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileOpen]);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      localStorage.getItem('finatle_pwa_installed') === 'true';
    setIsPWAInstalled(isStandalone);
  }, []);

  const formatRupee = (val: number) => {
    const isNeg = val < 0;
    const abs = Math.abs(Math.round(val)).toLocaleString('en-IN');
    return isNeg ? `-₹${abs}` : `₹${abs}`;
  };

  const topTransactions = React.useMemo(() => transactions.slice(0, 5), [transactions]);
  const pendingLoans = React.useMemo(() => loans.slice(0, 5), [loans]);
  const [txTypeFilter, setTxTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [mobileSearch, setMobileSearch] = useState('');

  const displayedTransactions = React.useMemo(() => {
    return transactions.filter((t) => {
      if (txTypeFilter !== 'ALL' && t.type !== txTypeFilter) return false;
      if (!mobileSearch.trim()) return true;
      const q = mobileSearch.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
    });
  }, [transactions, txTypeFilter, mobileSearch]);

  const [loanFilterType, setLoanFilterType] = useState<'ALL' | 'LENT' | 'BORROWED' | 'SPLIT' | 'PENDING' | 'SETTLED'>('ALL');
  const [mobileLoanSearch, setMobileLoanSearch] = useState('');

  const displayedLoans = React.useMemo(() => {
    return loans.filter((l) => {
      if (loanFilterType === 'LENT' && l.kind !== 'lent') return false;
      if (loanFilterType === 'BORROWED' && l.kind !== 'borrowed') return false;
      if (loanFilterType === 'SPLIT' && l.kind !== 'split') return false;
      if (loanFilterType === 'PENDING' && l.status === 'PAID') return false;
      if (loanFilterType === 'SETTLED' && l.status !== 'PAID') return false;
      if (!mobileLoanSearch.trim()) return true;
      const q = mobileLoanSearch.toLowerCase();
      return (
        (l.personName && l.personName.toLowerCase().includes(q)) ||
        (l.title && l.title.toLowerCase().includes(q)) ||
        (l.subtext && l.subtext.toLowerCase().includes(q))
      );
    });
  }, [loans, loanFilterType, mobileLoanSearch]);

  return (
    <div className="mobile-app-shell">
      {/* 1. Header with Menu Drawer Trigger */}
      <header className="mobile-header">
        <div className="mobile-header-left" onClick={() => setIsDrawerOpen(true)} style={{ cursor: 'pointer' }}>
          <FinatleLogo size={32} />
          <h2>Finatle</h2>
        </div>
        <div className="mobile-header-right">
          <button className="icon-button" style={{ width: 34, height: 34 }} title="Calendar">
            <CalendarIcon size={16} />
          </button>
          <div className="mobile-profile-wrapper" ref={profileMenuRef} style={{ position: 'relative' }}>
            <div
              className="user-avatar"
              style={{ width: 34, height: 34, cursor: 'pointer' }}
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              title="Profile"
            >
              {userName.slice(0, 2).toUpperCase()}
            </div>
            {isProfileOpen && (
              <div className="mobile-profile-menu">
                <div className="mobile-profile-header">
                  <div className="mobile-profile-name">{user?.name || userName}</div>
                  <div className="mobile-profile-email">{user?.email || 'User Account'}</div>
                </div>
                <button type="button" onClick={() => { setIsProfileOpen(false); onOpenSettings(); }}>
                  Settings
                </button>
                <button type="button" className="mobile-profile-logout" onClick={() => { setIsProfileOpen(false); onLogout(); }}>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Slide-out Mobile Sidebar Drawer */}
      {isDrawerOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setIsDrawerOpen(false)}>
          <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <FinatleLogo size={30} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Finatle</h3>
              </div>
              <button
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
                onClick={() => setIsDrawerOpen(false)}
                aria-label="Close menu"
              >
                <LuX size={18} />
              </button>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
              <button
                className={`nav-item ${currentNav === 'home' ? 'active' : ''}`}
                onClick={() => {
                  onSelectNav('home');
                  setIsDrawerOpen(false);
                }}
              >
                <NavIcons.Dashboard active={currentNav === 'home'} />
                <span>Dashboard</span>
              </button>
              <button
                className={`nav-item ${currentNav === 'transactions' ? 'active' : ''}`}
                onClick={() => {
                  onSelectNav('transactions');
                  setIsDrawerOpen(false);
                }}
              >
                <NavIcons.Transactions active={currentNav === 'transactions'} />
                <span>Transactions</span>
              </button>
              <button
                className={`nav-item ${currentNav === 'loans' ? 'active' : ''}`}
                onClick={() => {
                  onSelectNav('loans');
                  setIsDrawerOpen(false);
                }}
              >
                <NavIcons.Loans active={currentNav === 'loans'} />
                <span>Loans & Split</span>
              </button>
              <button
                className={`nav-item ${currentNav === 'insights' ? 'active' : ''}`}
                onClick={() => {
                  onSelectNav('insights');
                  setIsDrawerOpen(false);
                }}
              >
                <NavIcons.Analytics active={currentNav === 'insights'} />
                <span>Analytics & Insights</span>
              </button>
              <button
                className={`nav-item ${currentNav === 'budgets' ? 'active' : ''}`}
                onClick={() => {
                  onSelectNav('budgets');
                  setIsDrawerOpen(false);
                }}
              >
                <NavIcons.Budgets active={currentNav === 'budgets'} />
                <span>Budgets</span>
              </button>
              <button
                className={`nav-item ${currentNav === 'settings' ? 'active' : ''}`}
                onClick={() => {
                  onSelectNav('settings');
                  setIsDrawerOpen(false);
                }}
              >
                <NavIcons.Settings active={currentNav === 'settings'} />
                <span>Settings</span>
              </button>
            </nav>

            {/* Install Mobile App button: ONLY shown in mobile drawer if NOT yet installed */}
            {!isPWAInstalled && (
              <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  className="pwa-badge-btn"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    onOpenPWA();
                  }}
                >
                  <DownloadAppIcon size={18} />
                  <span>Install Mobile App</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 1: HOME */}
      {currentNav === 'home' && (
        <>
          {/* Greeting */}
          <section className="mobile-greeting-sec">
            <h3>{greeting},<br />{userName}!</h3>
            <p>{dateString} • {timeString}</p>
          </section>

          {/* Total / Actual Balance Card */}
          <div className="mobile-balance-card">
            <div className="mobile-balance-info">
              <div className="balance-title-row">
                <span>{balanceView === 'net' ? 'Total Balance' : 'Actual Balance'}</span>
                <button
                  type="button"
                  className="balance-toggle-btn"
                  onClick={() => setBalanceView(balanceView === 'net' ? 'actual' : 'net')}
                  title={balanceView === 'net' ? 'Switch to Actual Balance' : 'Switch to Total Balance'}
                >
                  <span>{balanceView === 'net' ? 'Actual' : 'Total'}</span>
                </button>
              </div>
              <div className="mobile-balance-amount">
                {formatRupee(balanceView === 'net' ? balance : (actualBalance ?? balance))}
              </div>
              <div className="mobile-balance-badge">
                <span>
                  {balanceView === 'net' ? 'Net savings from transactions' : 'Actual balance after loans & settlements'}
                </span>
              </div>
            </div>

            <div className="mobile-plant-art">
              <LeafSproutIcon size={64} />
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="mobile-actions-grid">
            <button
              className="quick-action-btn"
              onClick={() => onOpenAddModal('expense')}
            >
              <div className="quick-action-icon expense">
                <MinusIcon size={18} />
              </div>
              <span>Add Expense</span>
            </button>

            <button
              className="quick-action-btn"
              onClick={() => onOpenAddModal('income')}
            >
              <div className="quick-action-icon income">
                <PlusIcon size={18} />
              </div>
              <span>Add Income</span>
            </button>

            <button
              className="quick-action-btn"
              onClick={() => onOpenAddModal('lent')}
            >
              <div className="quick-action-icon lend">
                <UsersGroupIcon size={18} />
              </div>
              <span>Lend/Borrow</span>
            </button>

            <button
              className="quick-action-btn"
              onClick={onOpenScanner}
            >
              <div className="quick-action-icon scan">
                <ScanBillIcon size={18} />
              </div>
              <span>Scan Bill</span>
            </button>
          </div>

          {/* Recent Transactions */}
          <section className="mobile-section">
            <div className="mobile-sec-header">
              <h4>Recent Transactions</h4>
              {transactions.length > 0 && (
                <button
                  className="view-all-btn"
                  style={{ fontSize: '0.82rem' }}
                  onClick={onOpenAllTransactions || (() => onSelectNav('transactions'))}
                >
                  See All
                </button>

              )}
            </div>

            {transactions.length === 0 ? (
              <div className="empty-data-state" style={{ background: '#f8fafc', borderRadius: 'var(--radius-lg)' }}>
                <div className="empty-icon blue">
                  <LuReceipt size={24} />
                </div>
                <h5>No transactions yet</h5>
                <p>Tap + Add Expense or + Add Income to record your first transaction.</p>
              </div>
            ) : (
              <div className="transactions-list">
                {topTransactions.map((t) => {
                  const isIncome = t.type === 'INCOME';
                  const cleanName = t.name ? t.name.replace(/\s*\((?:my share|custom split(?:\s+with\s+[^)]+)?|\d+\s+people split(?:\s*•\s*[^)]*)?|split bill)\)/gi, '').trim() : t.name;
                  const hasItems = Array.isArray(t.items) && t.items.length > 0;
                  const isExpanded = expandedTxId === t.id;

                  return (
                    <div
                      className={`transaction-card-wrapper ${isExpanded ? 'expanded' : ''}`}
                      key={t.id}
                    >
                      <div
                        className={`transaction-row ${hasItems ? 'clickable' : ''}`}
                        onClick={() => hasItems && setExpandedTxId(prev => prev === t.id ? null : t.id)}
                      >
                        <div className="row-left">
                          <CategoryBadge name={cleanName} category={t.category} size={36} />
                          <div className="row-info">
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.3rem' }}>
                              <h4>{cleanName}</h4>
                              {hasItems && (
                                <span className="receipt-pill-badge">
                                  <LuReceipt size={9} />
                                  {t.items!.length} {t.items!.length === 1 ? 'item' : 'items'}
                                </span>
                              )}
                            </div>
                            <p>{t.category ? `${t.category} • ` : ''}{t.date}</p>
                          </div>
                        </div>
                        <div className="row-right-transaction">
                          <span className={isIncome ? 'amount-positive' : 'amount-negative'}>
                            {isIncome ? `+ ${formatRupee(t.amount)}` : `- ${formatRupee(t.amount)}`}
                          </span>
                          {hasItems && (
                            <span style={{ color: '#94a3b8', display: 'inline-flex', alignItems: 'center' }}>
                              {isExpanded ? <LuChevronUp size={14} /> : <LuChevronDown size={14} />}
                            </span>
                          )}
                          {onEditTransaction && (
                            <button
                              className="edit-pencil-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditTransaction(t);
                              }}
                              title="Edit Transaction"
                            >
                              <PencilEditIcon size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {hasItems && isExpanded && (
                        <div className="transaction-breakdown-container" style={{ margin: '0.15rem 0.35rem 0.4rem 2.8rem' }}>
                          <div className="breakdown-header">
                            <h5>
                              <LuShoppingBag size={12} color="#059669" />
                              Receipt Breakdown
                            </h5>
                            <span>{t.items!.length} items</span>
                          </div>
                          <div className="breakdown-items-list">
                            {t.items!.map((item, idx) => (
                              <div className="breakdown-item-row" key={item.id || idx}>
                                <div className="breakdown-item-name" title={item.name}>
                                  <span className="bullet">•</span>
                                  <span className="item-name-text">{item.name}</span>
                                  {item.quantity && item.quantity > 1 && (
                                    <span className="breakdown-item-qty">×{item.quantity}</span>
                                  )}
                                </div>
                                <span className="breakdown-item-price">
                                  ₹{Number(item.price).toLocaleString('en-IN')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Loans & Settlements Section */}
          <section className="mobile-section" style={{ paddingBottom: '0.5rem' }}>
            <div className="mobile-sec-header">
              <h4>Loans & Settlements</h4>
              {loans.length > 0 && (
                <button
                  className="view-all-btn"
                  style={{ fontSize: '0.82rem' }}
                  onClick={onOpenLoans}
                >
                  See All
                </button>
              )}
            </div>

            {pendingLoans.length === 0 ? (
              <div className="mobile-loans-banner" onClick={() => onOpenAddModal('lent')}>
                <div className="loans-banner-left">
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: '#10b981',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <UsersGroupIcon size={20} />
                  </div>
                  <div>
                    <h5>No pending settlements</h5>
                    <p>Tap to record money lent or borrowed</p>
                  </div>
                </div>
                <ChevronRightIcon size={18} />
              </div>
            ) : (
              <div className="loans-list" style={{ marginBottom: '1rem' }}>
                {pendingLoans.map((item) => {
                  const isLent = item.kind === 'lent';
                  const isSplit = item.kind === 'split';
                  const isSettled = item.status === 'PAID';
                  const isPartial = item.status === 'PARTIAL';
                  const paid = item.paidAmount || 0;
                  const remaining = Math.max(0, item.amount - paid);
                  const formatLoanDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Not set';

                  const compactTitle = isSplit
                    ? (item.personName || item.title || 'Group Split')
                    : isLent
                    ? (item.personName ? `To ${item.personName}` : item.title.replace(/^You lent to /i, 'To '))
                    : (item.personName ? `From ${item.personName}` : item.title.replace(/^You borrowed from /i, 'From '));

                  const cleanText = (val?: string) =>
                    val ? val.replace(/\s*\((?:my share|custom split(?:\s+with\s+[^)]+)?|\d+\s+people split(?:\s*•\s*[^)]*)?|split bill)\)/gi, '').trim() : '';
                  const cleanedSubtext = cleanText(item.subtext);

                  return (
                    <div
                      className="loan-row"
                      key={item.id}
                    >
                      <div className="row-left">
                        <div className={`loan-avatar ${item.kind}`}>
                          {isSplit ? (
                            <UsersGroupIcon size={18} />
                          ) : (
                            <span>{item.personName.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="row-info">
                          <h4>{cleanText(compactTitle)}</h4>
                          {cleanedSubtext && <p className="loan-description">{cleanedSubtext}</p>}
                          <div className="loan-meta">
                            <span>{isLent ? 'Lent' : 'Borrowed'}: {formatLoanDate(item.date)}</span>
                            <span>Due: {formatLoanDate(item.dueDate)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="row-right-loan" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                        <span
                          className={
                            isLent || isSplit ? 'amount-positive' : 'amount-negative'
                          }
                          style={{
                            color:
                              isLent || isSplit
                                ? 'var(--text-emerald)'
                                : 'var(--text-primary)',
                            fontWeight: 800,
                          }}
                        >
                          {formatRupee(isPartial ? remaining : item.amount)}
                        </span>

                        <span
                          className={`loan-status-btn ${
                            isSettled
                              ? 'settled'
                              : isPartial
                              ? 'partial'
                              : isLent || isSplit
                              ? 'to-receive'
                              : 'to-pay'
                          }`}
                        >
                          {isSettled
                            ? 'Settled'
                            : isPartial
                            ? `Part (₹${paid})`
                            : isLent
                            ? 'To get'
                            : isSplit
                            ? 'Split'
                            : 'To pay'}
                        </span>

                        {onEditLoan && (
                          <button
                            type="button"
                            className="edit-pencil-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditLoan(item);
                            }}
                            title="Edit Loan"
                          >
                            <PencilEditIcon size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </>
      )}

      {/* VIEW 2: ALL TRANSACTIONS */}
      {currentNav === 'transactions' && (
        <section className="mobile-section" style={{ paddingBottom: '5.5rem' }}>
          <div className="mobile-sec-header">
            <h4>Transactions</h4>
            <button
              type="button"
              className="btn-submit-primary"
              style={{
                width: 'auto',
                margin: 0,
                padding: '0.45rem 0.85rem',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontWeight: 700,
              }}
              onClick={() => onOpenAddModal('expense')}
            >
              <LuPlus size={15} strokeWidth={2.8} />
              <span>Add</span>
            </button>
          </div>

          {/* Search input */}
          <div style={{ marginBottom: '0.75rem' }}>
            <input
              type="text"
              placeholder="Search transactions..."
              className="form-control"
              value={mobileSearch}
              onChange={(e) => setMobileSearch(e.target.value)}
              style={{ fontSize: '0.85rem', padding: '0.55rem 0.75rem' }}
            />
          </div>

          {/* Filter tabs */}
          <div className="modal-tabs" style={{ marginBottom: '1rem' }}>
            <button
              type="button"
              className={`modal-tab-btn ${txTypeFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setTxTypeFilter('ALL')}
            >
              All
            </button>
            <button
              type="button"
              className={`modal-tab-btn ${txTypeFilter === 'EXPENSE' ? 'active' : ''}`}
              onClick={() => setTxTypeFilter('EXPENSE')}
            >
              Expenses
            </button>
            <button
              type="button"
              className={`modal-tab-btn ${txTypeFilter === 'INCOME' ? 'active' : ''}`}
              onClick={() => setTxTypeFilter('INCOME')}
            >
              Income
            </button>
          </div>

          {displayedTransactions.length === 0 ? (
            <div className="empty-data-state">
              <div className="empty-icon blue">
                <LuReceipt size={24} />
              </div>
              <h5>No transactions match</h5>
              <p>No transactions found for this filter.</p>
            </div>
          ) : (
            <div className="transactions-list">
              {displayedTransactions.map((t) => {
                const isIncome = t.type === 'INCOME';
                const cleanName = t.name ? t.name.replace(/\s*\((?:my share|custom split(?:\s+with\s+[^)]+)?|\d+\s+people split(?:\s*•\s*[^)]*)?|split bill)\)/gi, '').trim() : t.name;
                const hasItems = Array.isArray(t.items) && t.items.length > 0;
                const isExpanded = expandedTxId === t.id;

                return (
                  <div
                    className={`transaction-card-wrapper ${isExpanded ? 'expanded' : ''}`}
                    key={t.id}
                  >
                    <div
                      className={`transaction-row ${hasItems ? 'clickable' : ''}`}
                      onClick={() => hasItems && setExpandedTxId(prev => prev === t.id ? null : t.id)}
                    >
                      <div className="row-left">
                        <CategoryBadge name={cleanName} category={t.category} size={36} />
                        <div className="row-info">
                          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.3rem' }}>
                            <h4>{cleanName}</h4>
                            {hasItems && (
                              <span className="receipt-pill-badge">
                                <LuReceipt size={9} />
                                {t.items!.length} {t.items!.length === 1 ? 'item' : 'items'}
                              </span>
                            )}
                          </div>
                          <p>{t.category ? `${t.category} • ` : ''}{t.date}</p>
                        </div>
                      </div>
                      <div className="row-right-transaction">
                        <span className={isIncome ? 'amount-positive' : 'amount-negative'}>
                          {isIncome ? `+ ${formatRupee(t.amount)}` : `- ${formatRupee(t.amount)}`}
                        </span>
                        {hasItems && (
                          <span style={{ color: '#94a3b8', display: 'inline-flex', alignItems: 'center' }}>
                            {isExpanded ? <LuChevronUp size={14} /> : <LuChevronDown size={14} />}
                          </span>
                        )}
                        {onEditTransaction && (
                          <button
                            className="edit-pencil-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditTransaction(t);
                            }}
                            title="Edit Transaction"
                          >
                            <PencilEditIcon size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {hasItems && isExpanded && (
                      <div className="transaction-breakdown-container" style={{ margin: '0.15rem 0.35rem 0.4rem 2.8rem' }}>
                        <div className="breakdown-header">
                          <h5>
                            <LuShoppingBag size={12} color="#059669" />
                            Receipt Breakdown
                          </h5>
                          <span>{t.items!.length} items</span>
                        </div>
                        <div className="breakdown-items-list">
                          {t.items!.map((item, idx) => (
                            <div className="breakdown-item-row" key={item.id || idx}>
                              <div className="breakdown-item-name" title={item.name}>
                                <span className="bullet">•</span>
                                <span className="item-name-text">{item.name}</span>
                                {item.quantity && item.quantity > 1 && (
                                  <span className="breakdown-item-qty">×{item.quantity}</span>
                                )}
                              </div>
                              <span className="breakdown-item-price">
                                ₹{Number(item.price).toLocaleString('en-IN')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* VIEW: ALL LOANS & SPLITS */}
      {currentNav === 'loans' && (
        <section className="mobile-section" style={{ paddingBottom: '5.5rem' }}>
          <div className="mobile-sec-header" style={{ marginBottom: '0.65rem' }}>
            <h4 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Loans & Group Splits</h4>
          </div>

          {/* Quick Action Buttons: 3-column equal grid with proper spacing */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.85rem' }}>
            <button
              type="button"
              className="btn-submit-primary"
              style={{
                width: '100%',
                margin: 0,
                padding: '0.62rem 0.35rem',
                fontSize: '0.84rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                borderRadius: 'var(--radius-md, 12px)',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                boxShadow: '0 2px 5px rgba(2, 132, 199, 0.25)',
              }}
              onClick={() => onOpenAddModal('lent')}
            >
              <LuPlus size={15} strokeWidth={2.8} />
              <span>Lent</span>
            </button>

            <button
              type="button"
              className="btn-submit-primary"
              style={{
                width: '100%',
                margin: 0,
                padding: '0.62rem 0.35rem',
                fontSize: '0.84rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                borderRadius: 'var(--radius-md, 12px)',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                boxShadow: '0 2px 5px rgba(239, 68, 68, 0.25)',
              }}
              onClick={() => onOpenAddModal('borrowed')}
            >
              <LuPlus size={15} strokeWidth={2.8} />
              <span>Borrow</span>
            </button>

            <button
              type="button"
              className="btn-submit-primary"
              style={{
                width: '100%',
                margin: 0,
                padding: '0.62rem 0.35rem',
                fontSize: '0.84rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                borderRadius: 'var(--radius-md, 12px)',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                boxShadow: '0 2px 5px rgba(16, 185, 129, 0.25)',
              }}
              onClick={() => onOpenAddModal('split')}
            >
              <LuPlus size={15} strokeWidth={2.8} />
              <span>Split</span>
            </button>
          </div>

          {/* Search input with clear button */}
          <div style={{ position: 'relative', marginBottom: '0.8rem' }}>
            <input
              type="text"
              placeholder="Search loans, people, splits..."
              className="form-control"
              value={mobileLoanSearch}
              onChange={(e) => setMobileLoanSearch(e.target.value)}
              style={{
                width: '100%',
                fontSize: '0.86rem',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md, 12px)',
                border: '1px solid var(--border-color, #e2e8f0)',
                background: '#ffffff',
              }}
            />
            {mobileLoanSearch && (
              <button
                type="button"
                onClick={() => setMobileLoanSearch('')}
                style={{
                  position: 'absolute',
                  right: '0.65rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  color: '#64748b',
                }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Horizontally scrollable chip filter pills */}
          <div
            style={{
              display: 'flex',
              gap: '0.45rem',
              overflowX: 'auto',
              paddingBottom: '0.35rem',
              marginBottom: '1rem',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {[
              { id: 'ALL', label: 'All' },
              { id: 'LENT', label: 'Lent' },
              { id: 'BORROWED', label: 'Borrowed' },
              { id: 'SPLIT', label: 'Split' },
              { id: 'PENDING', label: 'Pending' },
              { id: 'SETTLED', label: 'Settled' },
            ].map((tab) => {
              const isActive = loanFilterType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLoanFilterType(tab.id as any)}
                  style={{
                    flex: '0 0 auto',
                    padding: '0.42rem 0.85rem',
                    fontSize: '0.78rem',
                    fontWeight: isActive ? 700 : 600,
                    borderRadius: '9999px',
                    border: isActive ? '1px solid var(--primary, #047857)' : '1px solid #e2e8f0',
                    background: isActive ? 'var(--primary-50, #f0fdf4)' : '#ffffff',
                    color: isActive ? 'var(--primary-dark, #047857)' : 'var(--text-secondary, #64748b)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: isActive ? '0 1px 3px rgba(4, 120, 87, 0.12)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {displayedLoans.length === 0 ? (
            <div className="empty-data-state">
              <div className="empty-icon indigo">
                <UsersGroupIcon size={24} />
              </div>
              <h5>No loans or splits found</h5>
              <p>No settlements match your current search or filter criteria.</p>
              <button
                className="select-pill"
                style={{ marginTop: '0.5rem', background: 'var(--settle-50)', color: 'var(--settle-text)', borderColor: 'var(--settle-indigo)' }}
                onClick={() => onOpenAddModal('lent')}
              >
                + Add Loan or Split
              </button>
            </div>
          ) : (
            <div className="loans-list">
              {displayedLoans.map((item) => {
                const isLent = item.kind === 'lent';
                const isSplit = item.kind === 'split';
                const isSettled = item.status === 'PAID';
                const isPartial = item.status === 'PARTIAL';
                const paid = item.paidAmount || 0;
                const remaining = Math.max(0, item.amount - paid);
                const formatLoanDate = (value?: string | null) =>
                  value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Not set';

                const compactTitle = isSplit
                  ? (item.personName || item.title || 'Group Split')
                  : isLent
                  ? (item.personName ? `To ${item.personName}` : item.title.replace(/^You lent to /i, 'To '))
                  : (item.personName ? `From ${item.personName}` : item.title.replace(/^You borrowed from /i, 'From '));

                const cleanText = (val?: string) =>
                  val ? val.replace(/\s*\((?:my share|custom split(?:\s+with\s+[^)]+)?|\d+\s+people split(?:\s*•\s*[^)]*)?|split bill)\)/gi, '').trim() : '';
                const cleanedSubtext = cleanText(item.subtext);

                return (
                  <div
                    className="loan-row"
                    key={item.id}
                  >
                    <div className="row-left">
                      <div className={`loan-avatar ${item.kind}`}>
                        {isSplit ? (
                          <UsersGroupIcon size={18} />
                        ) : (
                          <span>{item.personName.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="row-info">
                        <h4>{cleanText(compactTitle)}</h4>
                        {cleanedSubtext && <p className="loan-description">{cleanedSubtext}</p>}
                        <div className="loan-meta">
                          <span>{isLent ? 'Lent' : 'Borrowed'}: {formatLoanDate(item.date)}</span>
                          <span>Due: {formatLoanDate(item.dueDate)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="row-right-loan" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                      <span
                        className={isLent || isSplit ? 'amount-positive' : 'amount-negative'}
                        style={{
                          color: isLent || isSplit ? 'var(--text-emerald)' : 'var(--text-primary)',
                          fontWeight: 800,
                        }}
                      >
                        {formatRupee(isPartial ? remaining : item.amount)}
                      </span>

                      <span
                        className={`loan-status-btn ${
                          isSettled
                            ? 'settled'
                            : isPartial
                            ? 'partial'
                            : isLent || isSplit
                            ? 'to-receive'
                            : 'to-pay'
                        }`}
                      >
                        {isSettled
                          ? 'Settled'
                          : isPartial
                          ? `Part (₹${paid})`
                          : isLent
                          ? 'To get'
                          : isSplit
                          ? 'Split'
                          : 'To pay'}
                      </span>

                      {onEditLoan && (
                        <button
                          type="button"
                          className="edit-pencil-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditLoan(item);
                          }}
                          title="Edit Loan"
                        >
                          <PencilEditIcon size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* VIEW 3: INSIGHTS */}
      {currentNav === 'insights' && (
        <section className="mobile-section" style={{ paddingBottom: '5.5rem' }}>
          <div className="mobile-sec-header">
            <h4>Financial Insights</h4>
          </div>
          <ExpenseDonutChart totalExpense={totalExpense} categories={expenseCategories} />
          <div style={{ marginTop: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <h5 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Monthly Summary</h5>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
              <span>Total Expenses</span>
              <span style={{ fontWeight: 700, color: 'var(--expense)' }}>{formatRupee(totalExpense)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', fontSize: '0.85rem' }}>
              <span>Active Balance</span>
              <span style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>{formatRupee(balance)}</span>
            </div>
          </div>
        </section>
      )}

      {currentNav === 'budgets' && (
        <section className="mobile-section" style={{ paddingBottom: '5.5rem' }}>
          <div className="mobile-sec-header"><h4>Budgets</h4></div>
          <BudgetManager categories={Object.keys(spending)} spending={spending} budgets={budgets} onSave={onSaveBudget} onDelete={onDeleteBudget} />
        </section>
      )}

      {currentNav === 'settings' && (
        <section className="mobile-section" style={{ paddingBottom: '5.5rem' }}>
          <SettingsView
            user={user || null}
            token={token || null}
            transactions={transactions}
            onUpdateUser={onUpdateUser || (() => {})}
            onLogout={onLogout}
            onDeleteAccount={onDeleteAccount || onLogout}
          />
        </section>
      )}

      {/* Fixed Bottom Navigation Bar */}

      <nav className="mobile-bottom-nav">
        <button
          className={`bottom-nav-item ${currentNav === 'home' ? 'active' : ''}`}
          onClick={() => onSelectNav('home')}
        >
          <NavIcons.Dashboard active={currentNav === 'home'} />
          <span>Home</span>
        </button>

        <button
          className={`bottom-nav-item ${currentNav === 'transactions' ? 'active' : ''}`}
          onClick={() => onSelectNav('transactions')}
        >
          <NavIcons.Transactions active={currentNav === 'transactions'} />
          <span>Transactions</span>
        </button>

        <button
          className={`bottom-nav-item ${currentNav === 'loans' ? 'active' : ''}`}
          onClick={() => onSelectNav('loans')}
        >
          <NavIcons.Loans active={currentNav === 'loans'} />
          <span>Loans</span>
        </button>

        <button
          className={`bottom-nav-item ${currentNav === 'insights' ? 'active' : ''}`}
          onClick={() => onSelectNav('insights')}
        >
          <NavIcons.Analytics active={currentNav === 'insights'} />
          <span>Insights</span>
        </button>

        <button
          className={`bottom-nav-item ${currentNav === 'budgets' ? 'active' : ''}`}
          onClick={() => onSelectNav('budgets')}
        >
          <NavIcons.Budgets active={currentNav === 'budgets'} />
          <span>Budgets</span>
        </button>

      </nav>
    </div>
  );
});

