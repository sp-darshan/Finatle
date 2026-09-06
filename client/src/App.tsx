import { useState, useEffect } from 'react';
import { HeroLanding } from './components/HeroLanding';
import { Sidebar } from './components/Sidebar';
import type { TabType } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { MetricCards } from './components/MetricCards';
import { ExpenseDonutChart } from './components/ExpenseDonutChart';
import type { CategoryExpense } from './components/ExpenseDonutChart';
import { IncomeExpenseBarChart } from './components/IncomeExpenseBarChart';
import { RecentTransactions } from './components/RecentTransactions';
import type { TransactionItem } from './components/RecentTransactions';
import { LoansSettlements } from './components/LoansSettlements';
import type { LoanItem } from './components/LoansSettlements';
import { MobileDashboard } from './components/MobileDashboard';
import { AddRecordModal } from './components/AddRecordModal';
import type { RecordKind } from './components/AddRecordModal';
import { EditTransactionModal } from './components/EditTransactionModal';
import { EditLoanModal } from './components/EditLoanModal';
import { BillScannerModal } from './components/BillScannerModal';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { AuthModal } from './components/AuthModal';
import { apiFetch } from './lib/api';

export function App() {
  // Navigation & View state
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [mobileNav, setMobileNav] = useState('home');
  const [isMobileScreen, setIsMobileScreen] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );
  const [isMobilePreview, setIsMobilePreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  const [addRecordKind, setAddRecordKind] = useState<RecordKind>('expense');
  const [editingTransaction, setEditingTransaction] = useState<TransactionItem | null>(null);
  const [editingLoan, setEditingLoan] = useState<LoanItem | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPWAOpen, setIsPWAOpen] = useState(false);

  // Authentication State
  const [user, setUser] = useState<{ uid: string; email: string; name?: string | null; age?: number | null } | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loadingUser, setLoadingUser] = useState<boolean>(true);

  // Financial Data State (Strictly loaded from DB only)
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loans, setLoans] = useState<LoanItem[]>([]);

  // Auto detect mobile window size
  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Restore and verify the stored session with the backend.
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (!savedToken) {
      setLoadingUser(false);
      return;
    }

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch {
        // ignore
      }
    }

    apiFetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${savedToken}` },
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Invalid token');
      })
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
          fetchUserData(savedToken);
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setToken(null);
      })
      .finally(() => {
        setLoadingUser(false);
      });
  }, []);

  const fetchUserData = async (authToken: string) => {
    try {
      const summaryRes = await apiFetch('/api/finance/summary', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        
        // Transactions strictly from DB
        if (data.transactions && Array.isArray(data.transactions)) {
          const mapped: TransactionItem[] = data.transactions.map((t: any) => ({
            id: t.tid,
            name: t.description || t.category || 'Transaction',
            category: t.category || 'General',
            date: new Date(t.occurredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            amount: Number(t.amount),
            type: t.type,
          }));
          setTransactions(mapped);
        } else {
          setTransactions([]);
        }

        // Loans & Settlements strictly from DB with paidAmount
        const mappedLoans: LoanItem[] = [];
        if (data.moneyLent && Array.isArray(data.moneyLent)) {
          data.moneyLent.forEach((l: any) => {
            const amount = Number(l.amount);
            const paid = Number(l.paidAmount !== undefined ? l.paidAmount : (l.status === 'PAID' ? amount : 0));
            mappedLoans.push({
              id: l.lid,
              kind: 'lent',
              personName: l.personName,
              title: `You lent to ${l.personName}`,
              subtext: l.description || 'Personal expense',
              amount,
              paidAmount: paid,
              status: l.status,
              statusLabel: l.status === 'PAID' ? '✓ Settled' : l.status === 'PARTIAL' ? `Part (₹${paid})` : 'Yet to receive',
            });
          });
        }
        if (data.moneyBorrowed && Array.isArray(data.moneyBorrowed)) {
          data.moneyBorrowed.forEach((b: any) => {
            const amount = Number(b.amount);
            const paid = Number(b.paidAmount !== undefined ? b.paidAmount : (b.status === 'PAID' ? amount : 0));
            mappedLoans.push({
              id: b.bid,
              kind: 'borrowed',
              personName: b.personName,
              title: `You borrowed from ${b.personName}`,
              subtext: b.description || 'Personal loan',
              amount,
              paidAmount: paid,
              status: b.status,
              statusLabel: b.status === 'PAID' ? '✓ Settled' : b.status === 'PARTIAL' ? `Part (₹${paid})` : 'Yet to pay',
            });
          });
        }
        setLoans(mappedLoans);
      }
    } catch {
      // Backend unavailable or empty
    }
  };

  const handleAuthSuccess = (authUser: any, authToken: string) => {
    setUser(authUser);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(authUser));
    fetchUserData(authToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    setTransactions([]);
    setLoans([]);
  };


  const handleAddRecordSuccess = () => {
    if (token) {
      fetchUserData(token);
    }
  };

  const handleEditTransaction = (transaction: TransactionItem) => {
    setEditingTransaction(transaction);
  };

  const handleSettleLoan = async (loanId: string, currentStatus: LoanItem['status']) => {
    const isCurrentlyPaid = currentStatus === 'PAID';
    const nextStatus: LoanItem['status'] = isCurrentlyPaid ? 'PENDING' : 'PAID';
    
    setLoans((prev) =>
      prev.map((item) => {
        if (item.id !== loanId) return item;
        const newPaid = isCurrentlyPaid ? 0 : item.amount;
        return {
          ...item,
          status: nextStatus,
          paidAmount: newPaid,
          statusLabel: nextStatus === 'PAID' ? '✓ Settled' : item.kind === 'lent' ? 'Yet to receive' : 'Yet to pay',
        };
      })
    );

    if (token) {
      try {
        await apiFetch(`/api/finance/loans/${loanId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: nextStatus }),
        });
        fetchUserData(token);
      } catch {
        // ignore
      }
    }
  };

  // Filter transactions according to search input
  const filteredTransactions = transactions.filter((t) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(query) ||
      t.category.toLowerCase().includes(query)
    );
  });

  const filteredLoans = loans.filter((l) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      l.title.toLowerCase().includes(query) ||
      l.personName.toLowerCase().includes(query) ||
      l.subtext.toLowerCase().includes(query)
    );
  });

  // Calculate real metrics strictly from DB records
  const totalIncome = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // Money lent: repaid money increases available savings
  const lentRecovered = loans
    .filter((l) => l.kind === 'lent')
    .reduce((sum, l) => sum + Number(l.paidAmount !== undefined ? l.paidAmount : (l.status === 'PAID' ? l.amount : 0)), 0);

  // Money borrowed: repaid money decreases available savings
  const borrowedRepaid = loans
    .filter((l) => l.kind === 'borrowed')
    .reduce((sum, l) => sum + Number(l.paidAmount !== undefined ? l.paidAmount : (l.status === 'PAID' ? l.amount : 0)), 0);

  // Net Savings reflects core income - expense + lent repayments received - borrowed repayments made (never negative)
  const netSavings = Math.max(0, totalIncome - totalExpense + lentRecovered - borrowedRepaid);

  // Pending unpaid settlements total
  const pendingSettlementsTotal = loans
    .reduce((sum, l) => {
      const paid = Number(l.paidAmount !== undefined ? l.paidAmount : (l.status === 'PAID' ? l.amount : 0));
      return sum + Math.max(0, Number(l.amount) - paid);
    }, 0);


  const pendingSettlementsCount = loans.filter((l) => l.status !== 'PAID').length;
  const lentCount = loans.filter((l) => l.kind === 'lent' && l.status !== 'PAID').length;
  const borrowedCount = loans.filter((l) => l.kind === 'borrowed' && l.status !== 'PAID').length;

  const settlementDetails =
    pendingSettlementsCount > 0
      ? `${pendingSettlementsCount} records • ${borrowedCount} you owe • ${lentCount} owes you`
      : '0 pending settlements';

  // Compute category breakdown strictly from real DB expenses
  const categoryMap: Record<string, number> = {};
  transactions
    .filter((t) => t.type === 'EXPENSE')
    .forEach((t) => {
      const cat = t.category || 'General';
      categoryMap[cat] = (categoryMap[cat] || 0) + Number(t.amount);
    });

  const expenseCategories: CategoryExpense[] = Object.entries(categoryMap).map(([name, amount]) => ({
    name,
    amount,
    percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
    color: '',
  }));

  const openAdd = (kind: RecordKind = 'expense') => {
    setAddRecordKind(kind);
    setIsAddRecordOpen(true);
  };

  const handleOpenAuth = (mode: 'signin' | 'signup' = 'signup') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  // 1. If user is not authenticated and not loading, show the Hero Landing Page!
  if (!user && !loadingUser && !isMobilePreview) {
    return (
      <>
        <HeroLanding
          onOpenAuth={handleOpenAuth}
          onTryMobilePreview={() => setIsMobilePreview(true)}
        />
        <AuthModal
          isOpen={isAuthOpen}
          initialMode={authMode}
          onClose={() => setIsAuthOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  // 2. If viewing on mobile screen OR desktop preview toggle is active:
  if (isMobileScreen || isMobilePreview) {
    return (
      <div className="mobile-view-wrapper" style={{ minHeight: '100vh', background: 'var(--bg-app)' }}>
        {/* If on desktop preview mode, show top bar toggle to exit */}
        {!isMobileScreen && (
          <div style={{ background: '#ffffff', padding: '0.6rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Mobile Simulator Preview</span>
            <button className="select-pill" onClick={() => setIsMobilePreview(false)}>
              Switch to Desktop View 💻
            </button>
          </div>
        )}

        <div style={{ padding: isMobileScreen ? 0 : '1.5rem 0', display: 'flex', justifyContent: 'center' }}>
          <MobileDashboard
            balance={netSavings}
            userName={user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Friend'}
            transactions={filteredTransactions}
            loans={filteredLoans}
            totalExpense={totalExpense}
            expenseCategories={expenseCategories}
            onOpenAddModal={(k) => openAdd((k as RecordKind) || 'expense')}
            onOpenScanner={() => setIsScannerOpen(true)}
            onOpenLoans={() => {
              if (isMobileScreen) {
                setMobileNav('transactions');
              } else {
                setCurrentTab('loans');
              }
            }}
            onOpenAllTransactions={() => setMobileNav('transactions')}
            onOpenAuth={() => handleOpenAuth('signin')}
            onOpenPWA={() => setIsPWAOpen(true)}
            onEditTransaction={handleEditTransaction}
            onEditLoan={(loan) => setEditingLoan(loan)}
            onSettleLoan={handleSettleLoan}
            currentNav={mobileNav}
            onSelectNav={setMobileNav}
          />
        </div>

        {/* Modals & Dialogs */}
        <AuthModal
          isOpen={isAuthOpen}
          initialMode={authMode}
          onClose={() => setIsAuthOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />

        <AddRecordModal
          isOpen={isAddRecordOpen}
          onClose={() => setIsAddRecordOpen(false)}
          initialKind={addRecordKind}
          token={token}
          onSuccess={handleAddRecordSuccess}
        />

        <EditTransactionModal
          isOpen={!!editingTransaction}
          onClose={() => setEditingTransaction(null)}
          transaction={editingTransaction}
          token={token}
          onSuccess={handleAddRecordSuccess}
        />

        <EditLoanModal
          isOpen={!!editingLoan}
          onClose={() => setEditingLoan(null)}
          loan={editingLoan}
          token={token}
          onSuccess={handleAddRecordSuccess}
        />

        <BillScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onAddScannedExpense={async (scanned) => {
            if (token) {
              try {
                await apiFetch('/api/finance/transactions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    type: 'EXPENSE',
                    amount: scanned.amount,
                    description: scanned.name,
                    category: scanned.category,
                  }),
                });
                fetchUserData(token);
              } catch {
                // ignore
              }
            }
          }}
        />

        <PWAInstallPrompt
          isOpen={isPWAOpen}
          onClose={() => setIsPWAOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* 1. Desktop Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab === 'loans') setIsAddRecordOpen(false);
        }}
      />

      {/* 2. Main Content Container */}
      <div className="main-content">
        <TopBar

          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          user={user}
          onOpenAuth={() => handleOpenAuth('signin')}
          onLogout={handleLogout}
          isMobilePreview={isMobilePreview}
          onToggleMobilePreview={() => setIsMobilePreview(!isMobilePreview)}
        />

        <main className="page-container">
          {currentTab === 'dashboard' && (
            <>
              <div className="dashboard-header-row">
                <div className="header-titles">
                  <h2>Dashboard</h2>
                  <p>Financial summary for {user?.name ? user.name : user?.email || 'your account'}</p>
                </div>


                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <button
                      className="btn-submit-primary"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', margin: 0, width: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      onClick={() => openAdd('expense')}
                    >
                      <span>+ Add Record</span>
                    </button>
                    <div className="date-filter-pill">
                      <span>This Month ⌄</span>
                    </div>
                  </div>
                </div>

                {/* 4 Metric Cards */}
                <MetricCards
                  income={totalIncome}
                  expenses={totalExpense}
                  savings={netSavings}
                  pendingSettlements={pendingSettlementsTotal}
                  settlementDetails={settlementDetails}
                  onCardClick={(type) => {
                    if (type === 'income' || type === 'expenses') openAdd(type === 'income' ? 'income' : 'expense');
                    if (type === 'settlements') openAdd('lent');
                  }}
                />

                {/* Charts Grid */}
                <div className="charts-grid">
                  <ExpenseDonutChart totalExpense={totalExpense} categories={expenseCategories} />
                  <IncomeExpenseBarChart transactions={transactions} />
                </div>

                {/* Bottom Row: Transactions & Loans/Settlements */}
                <div className="bottom-grid">
                  <RecentTransactions
                    transactions={filteredTransactions}
                    onViewAll={() => setCurrentTab('transactions')}
                    onAddTransaction={() => openAdd('expense')}
                    onEditTransaction={handleEditTransaction}
                  />
                  <LoansSettlements
                    loans={filteredLoans}
                    onViewAll={() => setCurrentTab('loans')}
                    onSettle={handleSettleLoan}
                    onAddNew={() => openAdd('lent')}
                    onEditLoan={(loan) => setEditingLoan(loan)}
                  />
                </div>
              </>
            )}

            {currentTab === 'transactions' && (
              <div>
                <div className="dashboard-header-row">
                  <div className="header-titles">
                    <h2>All Transactions</h2>
                    <p>Review and filter all your incoming and outgoing payments</p>
                  </div>
                  <button
                    className="btn-submit-primary"
                    style={{ width: 'auto', margin: 0, padding: '0.55rem 1.25rem' }}
                    onClick={() => openAdd('expense')}
                  >
                    + New Transaction
                  </button>
                </div>
                <RecentTransactions
                  transactions={filteredTransactions}
                  onAddTransaction={() => openAdd('expense')}
                  onEditTransaction={handleEditTransaction}
                />
              </div>
            )}

            {currentTab === 'loans' && (
              <div>
                <div className="dashboard-header-row">
                  <div className="header-titles">
                    <h2>Loans & Group Splits</h2>
                    <p>Track money lent to friends, borrowed amounts, and shared trip split expenses</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn-submit-primary"
                      style={{ width: 'auto', margin: 0, padding: '0.55rem 1rem', background: '#0284c7' }}
                      onClick={() => openAdd('lent')}
                    >
                      + Lent Money
                    </button>
                    <button
                      className="btn-submit-primary"
                      style={{ width: 'auto', margin: 0, padding: '0.55rem 1rem', background: '#ef4444' }}
                      onClick={() => openAdd('borrowed')}
                    >
                      + Borrowed Money
                    </button>
                    <button
                      className="btn-submit-primary"
                      style={{ width: 'auto', margin: 0, padding: '0.55rem 1rem' }}
                      onClick={() => openAdd('split')}
                    >
                      + Split Expense
                    </button>
                  </div>
                </div>
                <LoansSettlements
                  loans={filteredLoans}
                  onSettle={handleSettleLoan}
                  onAddNew={() => openAdd('lent')}
                  onEditLoan={(loan) => setEditingLoan(loan)}
                />
              </div>
            )}

            {(currentTab === 'budgets' || currentTab === 'analytics' || currentTab === 'goals' || currentTab === 'statements' || currentTab === 'settings') && (
              <div style={{ background: '#fff', padding: '2.5rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, textTransform: 'capitalize' }}>{currentTab} Overview</h3>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                  Manage your {currentTab} insights, automated categories, and statements here.
                </p>
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                  <button className="select-pill" onClick={() => setCurrentTab('dashboard')}>
                    ← Back to Dashboard
                  </button>
                  <button className="btn-submit-primary" style={{ width: 'auto', margin: 0 }} onClick={() => openAdd('expense')}>
                    + Add New Entry
                  </button>
                </div>
              </div>
            )}
          </main>
      </div>


      {/* Modals & Dialogs */}
      <AuthModal
        isOpen={isAuthOpen}
        initialMode={authMode}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <AddRecordModal
        isOpen={isAddRecordOpen}
        onClose={() => setIsAddRecordOpen(false)}
        initialKind={addRecordKind}
        token={token}
        onSuccess={handleAddRecordSuccess}
      />

      <EditTransactionModal
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        transaction={editingTransaction}
        token={token}
        onSuccess={handleAddRecordSuccess}
      />

      <EditLoanModal
        isOpen={!!editingLoan}
        onClose={() => setEditingLoan(null)}
        loan={editingLoan}
        token={token}
        onSuccess={handleAddRecordSuccess}
      />

      <BillScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onAddScannedExpense={async (scanned) => {
          if (token) {
            try {
                await apiFetch('/api/finance/transactions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  type: 'EXPENSE',
                  amount: scanned.amount,
                  description: scanned.name,
                  category: scanned.category,
                }),
              });
              fetchUserData(token);
            } catch {
              // ignore
            }
          }
        }}
      />

      <PWAInstallPrompt
        isOpen={isPWAOpen}
        onClose={() => setIsPWAOpen(false)}
      />
    </div>
  );
}

export default App;

