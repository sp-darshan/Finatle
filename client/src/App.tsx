import { useState, useEffect, useRef } from 'react';
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
import { BudgetManager } from './components/BudgetManager';
import type { BudgetLimit } from './components/BudgetManager';
import { SettingsView } from './components/SettingsView';
import { apiFetch } from './lib/api';

export function App() {
  // Navigation & View state
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [mobileNav, setMobileNav] = useState('home');
  const [isMobileScreen, setIsMobileScreen] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );
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
  const [user, setUser] = useState<{ uid: string; email: string; name?: string | null; age?: number | null; phone?: string | null } | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loadingUser, setLoadingUser] = useState<boolean>(true);

  // Financial Data State (Strictly loaded from DB only)
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loans, setLoans] = useState<LoanItem[]>([]);
  const [budgets, setBudgets] = useState<BudgetLimit[]>([]);
  const [settlementError, setSettlementError] = useState('');
  const refreshRequestRef = useRef(0);

  // Auto detect mobile window size
  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const userId = user?.uid || (() => {
      try {
        const u = localStorage.getItem('user');
        return u ? JSON.parse(u).uid : null;
      } catch {
        return null;
      }
    })();
    const storageKey = userId ? `finatle_budgets_${userId}` : 'finatle_budgets_local';
    const savedBudgets = localStorage.getItem(storageKey) || localStorage.getItem('finatle_budgets_local');
    if (savedBudgets) {
      try {
        const parsed = JSON.parse(savedBudgets);
        if (Array.isArray(parsed)) {
          setBudgets(parsed);
          return;
        }
      } catch {
        // ignore
      }
    }
  }, [user?.uid]);

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

  const fetchUserData = async (authToken: string, refreshLoans = true) => {
    const refreshRequest = ++refreshRequestRef.current;
    try {
      const summaryRes = await apiFetch('/api/finance/summary', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        if (refreshRequest !== refreshRequestRef.current) return;
        
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
            const paid = l.status === 'PAID' ? amount : Number(l.paidAmount || 0);
            mappedLoans.push({
              id: l.lid,
              kind: 'lent',
              personName: l.personName,
              title: `You lent to ${l.personName}`,
              subtext: l.description || 'Personal expense',
              amount,
              paidAmount: paid,
              date: l.lentAt,
              dueDate: l.dueAt,
              status: l.status,
              statusLabel: l.status === 'PAID' ? '✓ Settled' : l.status === 'PARTIAL' ? `Part (₹${paid})` : 'Yet to receive',
            });
          });
        }
        if (data.moneyBorrowed && Array.isArray(data.moneyBorrowed)) {
          data.moneyBorrowed.forEach((b: any) => {
            const amount = Number(b.amount);
            const paid = b.status === 'PAID' ? amount : Number(b.paidAmount || 0);
            mappedLoans.push({
              id: b.bid,
              kind: 'borrowed',
              personName: b.personName,
              title: `You borrowed from ${b.personName}`,
              subtext: b.description || 'Personal loan',
              amount,
              paidAmount: paid,
              date: b.borrowedAt,
              dueDate: b.dueAt,
              status: b.status,
              statusLabel: b.status === 'PAID' ? '✓ Settled' : b.status === 'PARTIAL' ? `Part (₹${paid})` : 'Yet to pay',
            });
          });
        }
        if (refreshLoans) setLoans(mappedLoans);
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

  const tabToMobileNav = (tab: TabType): string => {
    if (tab === 'dashboard') return 'home';
    if (tab === 'analytics') return 'insights';
    return tab;
  };

  const mobileNavToTab = (nav: string): TabType => {
    if (nav === 'home') return 'dashboard';
    if (nav === 'insights') return 'analytics';
    if (nav === 'transactions' || nav === 'budgets' || nav === 'loans' || nav === 'settings') return nav as TabType;
    return 'dashboard';
  };

  const handleSelectTab = (tab: TabType) => {
    setCurrentTab(tab);
    setMobileNav(tabToMobileNav(tab));
  };

  const handleSelectMobileNav = (nav: string) => {
    setMobileNav(nav);
    setCurrentTab(mobileNavToTab(nav));
  };

  const handleOpenSettings = () => {
    setCurrentTab('settings');
    setMobileNav('settings');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    setTransactions([]);
    setLoans([]);
    setBudgets([]);
    setCurrentTab('dashboard');
    setMobileNav('home');
  };

  const saveBudget = (budget: BudgetLimit) => {
    setBudgets((previous) => {
      const filtered = previous.filter((item) => item.category.toLowerCase() !== budget.category.toLowerCase());
      const next = [...filtered, budget];
      const storageKey = user?.uid ? `finatle_budgets_${user.uid}` : 'finatle_budgets_local';
      localStorage.setItem(storageKey, JSON.stringify(next));
      localStorage.setItem('finatle_budgets_local', JSON.stringify(next));
      return next;
    });
  };

  const deleteBudget = (category: string) => {
    setBudgets((previous) => {
      const next = previous.filter((item) => item.category.toLowerCase() !== category.toLowerCase());
      const storageKey = user?.uid ? `finatle_budgets_${user.uid}` : 'finatle_budgets_local';
      localStorage.setItem(storageKey, JSON.stringify(next));
      localStorage.setItem('finatle_budgets_local', JSON.stringify(next));
      return next;
    });
  };


  const handleAddRecordSuccess = async () => {
    if (token) {
      await fetchUserData(token);
    }
  };

  const handleTransactionSuccess = async () => {
    if (token) {
      await fetchUserData(token, false);
    }
  };

  const handleEditTransaction = (transaction: TransactionItem) => {
    setEditingTransaction(transaction);
  };

  const handleSettleLoan = async (loanId: string, currentStatus: LoanItem['status']) => {
    setSettlementError('');
    const isCurrentlyPaid = currentStatus === 'PAID';
    const nextStatus: LoanItem['status'] = isCurrentlyPaid ? 'PENDING' : 'PAID';

    setLoans((prev) =>
      prev.map((item) => item.id === loanId
        ? {
            ...item,
            status: nextStatus,
            paidAmount: isCurrentlyPaid ? 0 : item.amount,
            statusLabel: nextStatus === 'PAID' ? '✓ Settled' : item.kind === 'lent' ? 'Yet to receive' : 'Yet to pay',
          }
        : item)
    );
    
    if (token) {
      try {
        const response = await apiFetch(`/api/finance/loans/${loanId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: nextStatus }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Unable to update settlement status.');
        }
        await fetchUserData(token);
      } catch (error: any) {
        setLoans((prev) =>
          prev.map((item) => item.id === loanId
            ? {
                ...item,
                status: currentStatus,
                paidAmount: currentStatus === 'PAID' ? item.amount : 0,
                statusLabel: currentStatus === 'PAID' ? '✓ Settled' : item.kind === 'lent' ? 'Yet to receive' : 'Yet to pay',
              }
            : item)
        );
        setSettlementError(error.message || 'Unable to update settlement status.');
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

  // Unpaid lent money is out of savings. Borrowed money is tracked separately
  // because it increases cash on hand without increasing earned savings.
  const lentOutstanding = loans
    .filter((l) => l.kind === 'lent')
    .reduce((sum, l) => sum + Math.max(0, Number(l.amount) - Number(l.paidAmount !== undefined ? l.paidAmount : (l.status === 'PAID' ? l.amount : 0))), 0);

  const borrowedOutstanding = loans
    .filter((l) => l.kind === 'borrowed')
    .reduce((sum, l) => sum + Math.max(0, Number(l.amount) - Number(l.paidAmount !== undefined ? l.paidAmount : (l.status === 'PAID' ? l.amount : 0))), 0);

  const netSavings = Math.max(0, totalIncome - totalExpense - lentOutstanding);
  const actualBalance = Math.max(0, totalIncome - totalExpense - lentOutstanding + borrowedOutstanding);

  const canSettleLoan = (loan: LoanItem) =>
    !(loan.kind === 'lent' && loan.status === 'PAID' && netSavings < loan.amount) &&
    !(loan.kind === 'borrowed' && loan.status !== 'PAID' && actualBalance <= 0);

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
  const expenseSpending = Object.fromEntries(Object.entries(categoryMap));

  const openAdd = (kind: RecordKind = 'expense') => {
    setAddRecordKind(kind);
    setIsAddRecordOpen(true);
  };

  const handleOpenAuth = (mode: 'signin' | 'signup' = 'signup') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  // 1. If user is not authenticated and not loading, show the Hero Landing Page!
  if (!user && !loadingUser) {
    return (
      <>
        <HeroLanding
          onOpenAuth={handleOpenAuth}
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

  // Use the mobile layout automatically on narrow screens.
  if (isMobileScreen) {
    return (
      <div className="mobile-view-wrapper" style={{ minHeight: '100vh', background: 'var(--bg-app)' }}>
        <div style={{ padding: 0, display: 'flex', justifyContent: 'center' }}>
          <MobileDashboard
            balance={netSavings}
            userName={user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Friend'}
            user={user}
            token={token}
            onUpdateUser={(updatedUser) => {
              setUser(updatedUser);
              localStorage.setItem('user', JSON.stringify(updatedUser));
            }}
            onDeleteAccount={handleLogout}
            transactions={filteredTransactions}
            loans={filteredLoans}
            totalExpense={totalExpense}
            expenseCategories={expenseCategories}
            onOpenAddModal={(k) => openAdd((k as RecordKind) || 'expense')}
            onOpenScanner={() => setIsScannerOpen(true)}
            onOpenLoans={() => handleSelectTab('loans')}
            onOpenAllTransactions={() => handleSelectTab('transactions')}
            budgets={budgets}
            spending={expenseSpending}
            onSaveBudget={saveBudget}
            onDeleteBudget={deleteBudget}
            onLogout={handleLogout}
            onOpenSettings={handleOpenSettings}
            onOpenPWA={() => setIsPWAOpen(true)}
            onEditTransaction={handleEditTransaction}
            onEditLoan={(loan) => setEditingLoan(loan)}
            onSettleLoan={handleSettleLoan}
            canSettleLoan={canSettleLoan}
            currentNav={mobileNav}
            onSelectNav={handleSelectMobileNav}
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
          onSuccess={handleTransactionSuccess}
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
          handleSelectTab(tab);
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
          onOpenSettings={handleOpenSettings}
          onOpenScanner={() => setIsScannerOpen(true)}
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
                    <select
                      className="select-pill"
                      defaultValue="This Month"
                      aria-label="Filter date range"
                      style={{ height: '36px' }}
                    >
                      <option value="This Month">This Month</option>
                      <option value="Last Month">Last Month</option>
                      <option value="This Quarter">This Quarter</option>
                      <option value="This Year">This Year</option>
                      <option value="All Time">All Time</option>
                    </select>
                  </div>
                </div>

                {/* 4 Metric Cards */}
                {settlementError && <p className="form-error">{settlementError}</p>}
                <MetricCards
                  income={totalIncome}
                  expenses={totalExpense}
                  savings={netSavings}
                  actualBalance={actualBalance}
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
                    canSettle={canSettleLoan}
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
                  canSettle={canSettleLoan}
                  onAddNew={() => openAdd('lent')}
                  onEditLoan={(loan) => setEditingLoan(loan)}
                />
              </div>
            )}

            {currentTab === 'budgets' && (
              <section className="dashboard-card">
                <div className="card-header"><h3>Monthly Category Budgets</h3></div>
                <BudgetManager categories={Object.keys(categoryMap)} spending={expenseSpending} budgets={budgets} onSave={saveBudget} onDelete={deleteBudget} />
              </section>
            )}

            {currentTab === 'analytics' && (
              <div className="charts-grid">
                <ExpenseDonutChart totalExpense={totalExpense} categories={expenseCategories} />
                <IncomeExpenseBarChart transactions={transactions} />
              </div>
            )}

            {currentTab === 'settings' && (
              <SettingsView
                user={user}
                token={token}
                transactions={transactions}
                onUpdateUser={(updatedUser) => {
                  setUser(updatedUser);
                  localStorage.setItem('user', JSON.stringify(updatedUser));
                }}
                onLogout={handleLogout}
                onDeleteAccount={handleLogout}
              />
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
        onSuccess={handleTransactionSuccess}
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

