import React, { useState, useEffect } from 'react';
import {
  FinatleLogo,
  CalendarIcon,
  EyeIcon,
  EyeOffIcon,
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


interface MobileDashboardProps {
  balance: number;
  userName?: string;
  transactions: TransactionItem[];
  loans?: LoanItem[];
  totalExpense?: number;
  expenseCategories?: CategoryExpense[];
  onOpenAddModal: (initialKind?: 'expense' | 'income' | 'lent' | 'borrowed' | 'split') => void;
  onOpenScanner: () => void;
  onOpenLoans: () => void;
  onOpenAllTransactions: () => void;
  onLogout: () => void;
  onOpenPWA: () => void;
  onEditTransaction?: (transaction: TransactionItem) => void;
  onEditLoan?: (loan: LoanItem) => void;
  onSettleLoan?: (id: string, status: LoanItem['status']) => void;
  canSettleLoan?: (loan: LoanItem) => boolean;
  currentNav: string;
  onSelectNav: (nav: string) => void;
}

export const MobileDashboard: React.FC<MobileDashboardProps> = ({
  balance = 0,
  userName = 'Darshan',
  transactions = [],
  loans = [],
  totalExpense = 0,
  expenseCategories = [],
  onOpenAddModal,
  onOpenScanner,
  onOpenLoans,
  onOpenAllTransactions,
  onLogout,
  onOpenPWA,
  onEditTransaction,
  onEditLoan,
  currentNav,
  onSelectNav,
}) => {
  const [showBalance, setShowBalance] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);

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


  const topTransactions = transactions.slice(0, 4);
  const pendingLoans = loans.slice(0, 3);


  const [filterType, setFilterType] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');
  const [mobileSearch, setMobileSearch] = useState('');

  const displayedTransactions = transactions.filter((t) => {
    if (filterType !== 'ALL' && t.type !== filterType) return false;
    if (!mobileSearch.trim()) return true;
    const q = mobileSearch.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
  });

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
          <div
            className="user-avatar"
            style={{ width: 34, height: 34, cursor: 'pointer' }}
            onClick={onLogout}
            title="Profile"
          >
            {userName.slice(0, 2).toUpperCase()}
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
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontWeight: 700 }}
                onClick={() => setIsDrawerOpen(false)}
              >
                ✕
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
                className="nav-item"
                onClick={() => {
                  onOpenLoans();
                  setIsDrawerOpen(false);
                }}
              >
                <NavIcons.Loans />
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
                className={`nav-item ${currentNav === 'goals' ? 'active' : ''}`}
                onClick={() => {
                  onSelectNav('goals');
                  setIsDrawerOpen(false);
                }}
              >
                <NavIcons.Goals active={currentNav === 'goals'} />
                <span>Savings Goals</span>
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
            <h3>Good Day,<br />{userName}!</h3>
            <p>Small steps. Big financial freedom.</p>
          </section>

          {/* Total Balance Card */}
          <div className="mobile-balance-card">
            <div className="mobile-balance-info">
              <div className="balance-title-row">
                <span>Total Balance</span>
                <button
                  className="balance-eye-btn"
                  onClick={() => setShowBalance(!showBalance)}
                  title={showBalance ? 'Hide Balance' : 'Show Balance'}
                >
                  {showBalance ? <EyeIcon size={16} /> : <EyeOffIcon size={16} />}
                </button>
              </div>
              <div className="mobile-balance-amount">
                {showBalance ? formatRupee(balance) : '••••••••'}
              </div>
              <div className="mobile-balance-badge">
                <span>Live verified net balance</span>
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
                <div className="empty-icon" style={{ fontSize: '1.5rem' }}>💳</div>
                <h5>No transactions yet</h5>
                <p>Tap + Add Expense or + Add Income to record your first transaction.</p>
              </div>
            ) : (
              <div className="transactions-list">
                {topTransactions.map((t) => {
                  const isIncome = t.type === 'INCOME' || t.amount > 0;
                  return (
                    <div className="transaction-row" key={t.id}>
                      <div className="row-left">
                        <CategoryBadge category={t.name || t.category} size={36} />
                        <div className="row-info">
                          <h4>{t.name}</h4>
                          <p>{t.category ? `${t.category} • ` : ''}{t.date}</p>
                        </div>
                      </div>
                      <div className="row-right-transaction">
                        <span className={isIncome ? 'amount-positive' : 'amount-negative'}>
                          {isIncome ? `+ ${formatRupee(t.amount)}` : `- ${formatRupee(t.amount)}`}
                        </span>
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

                  return (
                    <div className="loan-row" key={item.id}>
                      <div className="row-left">
                        <div className={`loan-avatar ${item.kind}`}>
                          {isSplit ? (
                            <UsersGroupIcon size={18} />
                          ) : (
                            <span>{item.personName.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="row-info">
                          <h4>{item.title}</h4>
                          <p>{isPartial ? `₹${paid} paid • ₹${remaining} left` : item.subtext}</p>
                        </div>
                      </div>

                      <div className="row-right-loan">
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
                            ? '✓ Settled'
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

          {/* Monthly Overview Donut */}
          <section className="mobile-section" style={{ paddingBottom: '5rem' }}>
            <ExpenseDonutChart totalExpense={totalExpense} categories={expenseCategories} />
          </section>
        </>
      )}

      {/* VIEW 2: ALL TRANSACTIONS */}
      {currentNav === 'transactions' && (
        <section className="mobile-section" style={{ paddingBottom: '5.5rem' }}>
          <div className="mobile-sec-header">
            <h4>Transactions</h4>
            <button
              className="btn-submit-primary"
              style={{ width: 'auto', margin: 0, padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
              onClick={() => onOpenAddModal('expense')}
            >
              + Add
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
              className={`modal-tab-btn ${filterType === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterType('ALL')}
            >
              All
            </button>
            <button
              type="button"
              className={`modal-tab-btn ${filterType === 'EXPENSE' ? 'active' : ''}`}
              onClick={() => setFilterType('EXPENSE')}
            >
              Expenses
            </button>
            <button
              type="button"
              className={`modal-tab-btn ${filterType === 'INCOME' ? 'active' : ''}`}
              onClick={() => setFilterType('INCOME')}
            >
              Income
            </button>
          </div>

          {displayedTransactions.length === 0 ? (
            <div className="empty-data-state">
              <div className="empty-icon">💳</div>
              <h5>No transactions match</h5>
              <p>No transactions found for this filter.</p>
            </div>
          ) : (
            <div className="transactions-list">
              {displayedTransactions.map((t) => {
                const isIncome = t.type === 'INCOME' || t.amount > 0;
                return (
                  <div className="transaction-row" key={t.id}>
                    <div className="row-left">
                      <CategoryBadge category={t.name || t.category} size={36} />
                      <div className="row-info">
                        <h4>{t.name}</h4>
                        <p>{t.category ? `${t.category} • ` : ''}{t.date}</p>
                      </div>
                    </div>
                    <div className="row-right-transaction">
                      <span className={isIncome ? 'amount-positive' : 'amount-negative'}>
                        {isIncome ? `+ ${formatRupee(t.amount)}` : `- ${formatRupee(t.amount)}`}
                      </span>
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

      {/* VIEW 4: GOALS */}
      {currentNav === 'goals' && (
        <section className="mobile-section" style={{ paddingBottom: '5.5rem' }}>
          <div className="mobile-sec-header">
            <h4>Savings Goals</h4>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Track emergency funds and purchase targets</p>
          
          <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.25rem', marginBottom: '1rem', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h5 style={{ fontWeight: 800 }}>Emergency Fund Target</h5>
              <span style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '0.85rem' }}>65%</span>
            </div>
            <div style={{ background: '#f1f5f9', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: '0.5rem' }}>
              <div style={{ background: 'var(--primary)', height: '100%', width: '65%' }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Saved: {formatRupee(balance)}</span>
              <span>Target: ₹1,00,000</span>
            </div>
          </div>
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
          className={`bottom-nav-item ${currentNav === 'insights' ? 'active' : ''}`}
          onClick={() => onSelectNav('insights')}
        >
          <NavIcons.Analytics active={currentNav === 'insights'} />
          <span>Insights</span>
        </button>

        <button
          className={`bottom-nav-item ${currentNav === 'goals' ? 'active' : ''}`}
          onClick={() => onSelectNav('goals')}
        >
          <NavIcons.Goals active={currentNav === 'goals'} />
          <span>Goals</span>
        </button>
      </nav>
    </div>
  );
};

