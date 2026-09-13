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
import type { ScannedBillPayload } from './components/BillScannerModal';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { AuthModal } from './components/AuthModal';
import { BudgetManager } from './components/BudgetManager';
import type { BudgetLimit } from './components/BudgetManager';
import { SettingsView } from './components/SettingsView';
import { apiFetch } from './lib/api';
import { useGreeting } from './lib/greeting';

const VALID_TABS: TabType[] = ['dashboard', 'transactions', 'budgets', 'analytics', 'loans', 'settings'];

function parseTabFromUrl(): TabType | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
  if (VALID_TABS.includes(hash as TabType)) return hash as TabType;

  const path = window.location.pathname.replace(/^\//, '').trim().toLowerCase();
  if (VALID_TABS.includes(path as TabType)) return path as TabType;

  return null;
}

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

function getInitialTab(): TabType {
  const fromUrl = parseTabFromUrl();
  if (fromUrl) return fromUrl;

  const saved = typeof window !== 'undefined' ? localStorage.getItem('finatle_active_tab') : null;
  if (saved && VALID_TABS.includes(saved as TabType)) {
    return saved as TabType;
  }

  return 'dashboard';
}

export function App() {
  const { greeting, timeString, dateString } = useGreeting();
  // Navigation & View state (persisted across refresh and URL back/forward)
  const [currentTab, setCurrentTab] = useState<TabType>(getInitialTab);
  const [mobileNav, setMobileNav] = useState<string>(() => tabToMobileNav(getInitialTab()));
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

  // Authentication State (initialized synchronously from localStorage to prevent flash on reload)
  const [user, setUser] = useState<{ uid: string; email: string; name?: string | null; age?: number | null; phone?: string | null } | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  });
  const [loadingUser, setLoadingUser] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem('token');
  });

  const cleanSplitText = (text?: string | null): string => {
    if (!text) return '';
    return text
      .replace(/\s*\((?:my share|custom split(?:\s+with\s+[^)]+)?|\d+\s+people split(?:\s*•\s*[^)]*)?|split bill)\)/gi, '')
      .trim();
  };

  // Financial Data State (with local cache for 0ms initial render)
  const [transactions, setTransactions] = useState<TransactionItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const u = localStorage.getItem('user');
      const uid = u ? JSON.parse(u).uid : 'default';
      const cached = localStorage.getItem(`finatle_cache_tx_${uid}`);
      const raw: TransactionItem[] = cached ? JSON.parse(cached) : [];
      return raw.map((t) => ({ ...t, name: cleanSplitText(t.name) || t.category || 'Transaction' }));
    } catch {
      return [];
    }
  });
  const [loans, setLoans] = useState<LoanItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const u = localStorage.getItem('user');
      const uid = u ? JSON.parse(u).uid : 'default';
      const cached = localStorage.getItem(`finatle_cache_loans_${uid}`);
      const raw: LoanItem[] = cached ? JSON.parse(cached) : [];
      return raw.map((l) => ({ ...l, title: cleanSplitText(l.title), subtext: cleanSplitText(l.subtext) }));
    } catch {
      return [];
    }
  });
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

  // Synchronize mobileNav when currentTab changes (e.g. via deep link or desktop click)
  useEffect(() => {
    setMobileNav(tabToMobileNav(currentTab));
  }, [currentTab]);

  // Synchronize currentTab on popstate / hash change
  useEffect(() => {
    const handleLocationChange = () => {
      const newTab = getInitialTab();
      setCurrentTab(newTab);
      setMobileNav(tabToMobileNav(newTab));
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Load budgets from localStorage for active user
  useEffect(() => {
    const storageKey = user?.uid ? `finatle_budgets_${user.uid}` : 'finatle_budgets_local';
    const saved = localStorage.getItem(storageKey) || localStorage.getItem('finatle_budgets_local');
    if (saved) {
      try {
        setBudgets(JSON.parse(saved));
      } catch {
        setBudgets([]);
      }
    }
  }, [user?.uid]);

  // Restore and verify the stored session with the backend.
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken) {
      setLoadingUser(false);
      return;
    }

    // Immediately trigger financial data fetch for cached session
    fetchUserData(savedToken);

    apiFetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${savedToken}` },
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
          }
          return;
        }

        // ONLY log out if backend explicitly rejects token as 401 or 403
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('finatle_active_tab');
          setUser(null);
          setToken(null);
        }
      })
      .catch((err) => {
        // Network errors or aborted requests during rapid reloads should NOT wipe cached session
        console.warn('[Session] Background session verification notice:', err);
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
        
        const uid = user?.uid || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).uid : 'default');

        // Transactions strictly from DB
        if (data.transactions && Array.isArray(data.transactions)) {
          const mapped: TransactionItem[] = data.transactions.map((t: any) => ({
            id: t.tid,
            name: cleanSplitText(t.description) || t.category || 'Transaction',
            category: t.category || 'General',
            date: new Date(t.occurredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            amount: Number(t.amount),
            type: t.type,
          }));
          setTransactions(mapped);
          localStorage.setItem(`finatle_cache_tx_${uid}`, JSON.stringify(mapped));
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
              subtext: cleanSplitText(l.description) || 'Personal expense',
              amount,
              paidAmount: paid,
              date: l.lentAt,
              dueDate: l.dueAt,
              status: l.status,
              statusLabel: l.status === 'PAID' ? 'Settled' : l.status === 'PARTIAL' ? `Part (₹${paid})` : 'Yet to receive',
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
              subtext: cleanSplitText(b.description) || 'Personal loan',
              amount,
              paidAmount: paid,
              date: b.borrowedAt,
              dueDate: b.dueAt,
              status: b.status,
              statusLabel: b.status === 'PAID' ? 'Settled' : b.status === 'PARTIAL' ? `Part (₹${paid})` : 'Yet to pay',
            });
          });
        }
        if (refreshLoans) {
          setLoans(mappedLoans);
          localStorage.setItem(`finatle_cache_loans_${uid}`, JSON.stringify(mappedLoans));
        }
      }
    } catch {
      // Backend unavailable or offline - cached state remains active
    }
  };

  const handleAuthSuccess = (authUser: any, authToken: string) => {
    setUser(authUser);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(authUser));
    fetchUserData(authToken);
  };

  // Keep URL hash and localStorage in sync with active tab
  useEffect(() => {
    localStorage.setItem('finatle_active_tab', currentTab);
    const expectedHash = `#/${currentTab}`;
    if (window.location.hash !== expectedHash) {
      window.history.replaceState(null, '', expectedHash);
    }
  }, [currentTab]);

  // Listen for browser back / forward buttons
  useEffect(() => {
    const handleLocationChange = () => {
      const tab = parseTabFromUrl();
      if (tab && tab !== currentTab) {
        setCurrentTab(tab);
        setMobileNav(tabToMobileNav(tab));
      }
    };
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, [currentTab]);

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
    localStorage.removeItem('finatle_active_tab');
    setUser(null);
    setToken(null);
    setTransactions([]);
    setLoans([]);
    setBudgets([]);
    setCurrentTab('dashboard');
    setMobileNav('home');
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname);
    }
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


  const handleAddRecordSuccess = async (payload?: { kind: string; apiPayload?: any; optimisticData?: any; splitData?: any }) => {
    if (!payload) {
      if (token) await fetchUserData(token);
      return;
    }

    const { kind, apiPayload, optimisticData, splitData } = payload;
    const uid = user?.uid || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).uid : 'default');

    if (kind === 'split' && splitData) {
      const { userShareTransaction, lentEntries } = splitData;

      // 1. If user has a personal share, record it as a transaction optimistically
      if (userShareTransaction) {
        setTransactions((prev) => {
          const updated = [userShareTransaction.optimisticData as TransactionItem, ...prev];
          localStorage.setItem(`finatle_cache_tx_${uid}`, JSON.stringify(updated));
          return updated;
        });

        if (token) {
          apiFetch('/api/finance/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(userShareTransaction.apiPayload),
          })
            .then(async (res) => {
              if (res.ok) {
                const data = await res.json();
                const realItem: TransactionItem = {
                  id: data.transaction?.tid || userShareTransaction.optimisticData.id,
                  name: data.transaction?.description || userShareTransaction.optimisticData.name,
                  category: data.transaction?.category || userShareTransaction.optimisticData.category,
                  date: data.transaction?.occurredAt ? new Date(data.transaction.occurredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : userShareTransaction.optimisticData.date,
                  amount: Number(data.transaction?.amount ?? userShareTransaction.optimisticData.amount),
                  type: data.transaction?.type || userShareTransaction.optimisticData.type,
                };
                setTransactions((prev) => {
                  const updated = prev.map((t) => (t.id === userShareTransaction.optimisticData.id ? realItem : t));
                  localStorage.setItem(`finatle_cache_tx_${uid}`, JSON.stringify(updated));
                  return updated;
                });
              }
            })
            .catch((err) => {
              console.error('[Optimistic] Split user share transaction failed:', err);
              setTransactions((prev) => {
                const updated = prev.filter((t) => t.id !== userShareTransaction.optimisticData.id);
                localStorage.setItem(`finatle_cache_tx_${uid}`, JSON.stringify(updated));
                return updated;
              });
            });
        }
      }

      // 2. Add each individual friend lent entry optimistically to loans
      if (lentEntries && Array.isArray(lentEntries) && lentEntries.length > 0) {
        const optimisticLoans = lentEntries.map((e: any) => e.optimisticData as LoanItem);
        setLoans((prev) => {
          const updated = [...optimisticLoans, ...prev];
          localStorage.setItem(`finatle_cache_loans_${uid}`, JSON.stringify(updated));
          return updated;
        });

        if (token) {
          lentEntries.forEach((entry: any) => {
            apiFetch('/api/finance/lent', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify(entry.apiPayload),
            })
              .then(async (res) => {
                if (res.ok) {
                  const data = await res.json();
                  const realId = data.lent?.lid || entry.optimisticData.id;
                  setLoans((prev) => {
                    const updated = prev.map((l) => (l.id === entry.optimisticData.id ? { ...l, id: realId } : l));
                    localStorage.setItem(`finatle_cache_loans_${uid}`, JSON.stringify(updated));
                    return updated;
                  });
                }
              })
              .catch((err) => {
                console.error('[Optimistic] Split lent creation failed:', err);
                setLoans((prev) => {
                  const updated = prev.filter((l) => l.id !== entry.optimisticData.id);
                  localStorage.setItem(`finatle_cache_loans_${uid}`, JSON.stringify(updated));
                  return updated;
                });
              });
          });
        }
      }
      return;
    }

    if (kind === 'transaction' && optimisticData) {
      setTransactions((prev) => {
        const updated = [optimisticData as TransactionItem, ...prev];
        localStorage.setItem(`finatle_cache_tx_${uid}`, JSON.stringify(updated));
        return updated;
      });

      if (token) {
        apiFetch('/api/finance/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(apiPayload),
        })
          .then(async (res) => {
            if (res.ok) {
              const data = await res.json();
              const realItem: TransactionItem = {
                id: data.transaction?.tid || optimisticData.id,
                name: data.transaction?.description || optimisticData.name,
                category: data.transaction?.category || optimisticData.category,
                date: data.transaction?.occurredAt ? new Date(data.transaction.occurredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : optimisticData.date,
                amount: Number(data.transaction?.amount ?? optimisticData.amount),
                type: data.transaction?.type || optimisticData.type,
              };
              setTransactions((prev) => {
                const updated = prev.map((t) => (t.id === optimisticData.id ? realItem : t));
                localStorage.setItem(`finatle_cache_tx_${uid}`, JSON.stringify(updated));
                return updated;
              });
            } else {
              throw new Error('Failed to save transaction');
            }
          })
          .catch((err) => {
            console.error('[Optimistic] Transaction failed, reverting:', err);
            setTransactions((prev) => {
              const updated = prev.filter((t) => t.id !== optimisticData.id);
              localStorage.setItem(`finatle_cache_tx_${uid}`, JSON.stringify(updated));
              return updated;
            });
            setSettlementError('Unable to save transaction. Reverted.');
          });
      }
    } else if ((kind === 'lent' || kind === 'borrowed') && optimisticData) {
      const endpoint = kind === 'borrowed' ? '/api/finance/borrowed' : '/api/finance/lent';
      setLoans((prev) => {
        const updated = [optimisticData as LoanItem, ...prev];
        localStorage.setItem(`finatle_cache_loans_${uid}`, JSON.stringify(updated));
        return updated;
      });

      if (token) {
        apiFetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(apiPayload),
        })
          .then(async (res) => {
            if (res.ok) {
              const data = await res.json();
              const realId = (kind === 'borrowed' ? data.borrowed?.bid : data.lent?.lid) || optimisticData.id;
              setLoans((prev) => {
                const updated = prev.map((l) => (l.id === optimisticData.id ? { ...l, id: realId } : l));
                localStorage.setItem(`finatle_cache_loans_${uid}`, JSON.stringify(updated));
                return updated;
              });
            } else {
              throw new Error('Failed to save loan record');
            }
          })
          .catch((err) => {
            console.error('[Optimistic] Loan creation failed, reverting:', err);
            setLoans((prev) => {
              const updated = prev.filter((l) => l.id !== optimisticData.id);
              localStorage.setItem(`finatle_cache_loans_${uid}`, JSON.stringify(updated));
              return updated;
            });
            setSettlementError('Unable to save loan. Reverted.');
          });
      }
    }
  };

  const handleTransactionSuccess = async (action?: { type: 'update' | 'delete'; data?: TransactionItem; originalId?: string }) => {
    if (!action) {
      if (token) await fetchUserData(token, false);
      return;
    }

    const uid = user?.uid || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).uid : 'default');
    const prevTransactions = transactions;

    if (action.type === 'delete' && action.originalId) {
      setTransactions((prev) => {
        const updated = prev.filter((t) => t.id !== action.originalId);
        localStorage.setItem(`finatle_cache_tx_${uid}`, JSON.stringify(updated));
        return updated;
      });

      if (token) {
        apiFetch(`/api/finance/transactions/${action.originalId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
          .catch((err) => {
            console.error('[Optimistic] Delete transaction failed, reverting:', err);
            setTransactions(prevTransactions);
            localStorage.setItem(`finatle_cache_tx_${uid}`, JSON.stringify(prevTransactions));
            setSettlementError('Failed to delete transaction. Reverted.');
          });
      }
    } else if (action.type === 'update' && action.data && action.originalId) {
      const updatedData = action.data;
      setTransactions((prev) => {
        const updated = prev.map((t) => (t.id === action.originalId ? updatedData : t));
        localStorage.setItem(`finatle_cache_tx_${uid}`, JSON.stringify(updated));
        return updated;
      });

      if (token) {
        apiFetch(`/api/finance/transactions/${action.originalId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            type: updatedData.type,
            amount: updatedData.amount,
            description: updatedData.name,
            category: updatedData.category,
          }),
        })
          .catch((err) => {
            console.error('[Optimistic] Update transaction failed, reverting:', err);
            setTransactions(prevTransactions);
            localStorage.setItem(`finatle_cache_tx_${uid}`, JSON.stringify(prevTransactions));
            setSettlementError('Failed to update transaction. Reverted.');
          });
      }
    }
  };

  const handleLoanSuccess = async (action?: { type: 'update' | 'delete'; data?: LoanItem; originalId?: string; apiPayload?: any }) => {
    if (!action) {
      if (token) await fetchUserData(token);
      return;
    }

    const uid = user?.uid || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).uid : 'default');
    const prevLoans = loans;

    if (action.type === 'delete' && action.originalId) {
      const targetLoan = prevLoans.find((l) => l.id === action.originalId);
      setLoans((prev) => {
        const updated = prev.filter((l) => l.id !== action.originalId);
        localStorage.setItem(`finatle_cache_loans_${uid}`, JSON.stringify(updated));
        return updated;
      });

      if (token && targetLoan) {
        const endpoint = targetLoan.kind === 'borrowed'
          ? `/api/finance/borrowed/${action.originalId}`
          : `/api/finance/lent/${action.originalId}`;

        apiFetch(endpoint, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
          .catch((err) => {
            console.error('[Optimistic] Delete loan failed, reverting:', err);
            setLoans(prevLoans);
            localStorage.setItem(`finatle_cache_loans_${uid}`, JSON.stringify(prevLoans));
            setSettlementError('Failed to delete loan. Reverted.');
          });
      }
    } else if (action.type === 'update' && action.data && action.originalId) {
      const updatedData = action.data;
      setLoans((prev) => {
        const updated = prev.map((l) => (l.id === action.originalId ? updatedData : l));
        localStorage.setItem(`finatle_cache_loans_${uid}`, JSON.stringify(updated));
        return updated;
      });

      if (token && action.apiPayload) {
        const endpoint = updatedData.kind === 'borrowed'
          ? `/api/finance/borrowed/${action.originalId}`
          : `/api/finance/lent/${action.originalId}`;

        apiFetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(action.apiPayload),
        })
          .catch((err) => {
            console.error('[Optimistic] Update loan failed, reverting:', err);
            setLoans(prevLoans);
            localStorage.setItem(`finatle_cache_loans_${uid}`, JSON.stringify(prevLoans));
            setSettlementError('Failed to update loan. Reverted.');
          });
      }
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
            statusLabel: nextStatus === 'PAID' ? 'Settled' : item.kind === 'lent' ? 'Yet to receive' : 'Yet to pay',
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
                statusLabel: currentStatus === 'PAID' ? 'Settled' : item.kind === 'lent' ? 'Yet to receive' : 'Yet to pay',
              }
            : item)
        );
        setSettlementError(error.message || 'Unable to update settlement status.');
      }
    }
  };

  const handleConfirmScannedBill = async (scanned: ScannedBillPayload) => {
    if (!token) return;

    try {
      if (scanned.mode === 'SPLIT' && scanned.splitDetails) {
        // 1. Create personal expense transaction for user's share (if > 0)
        if (scanned.splitDetails.userShare > 0) {
          await apiFetch('/api/finance/transactions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              type: 'EXPENSE',
              amount: scanned.splitDetails.userShare,
              description: scanned.name,
              category: scanned.category,
            }),
          });
        }

        // 2. Create Lent loan records for each individual person (or group)
        if (scanned.splitDetails.lentEntries && scanned.splitDetails.lentEntries.length > 0) {
          await Promise.all(
            scanned.splitDetails.lentEntries.map((entry) =>
              apiFetch('/api/finance/lent', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  personName: entry.personName,
                  amount: entry.amount,
                  description: entry.description || `${scanned.name} split`,
                  lentAt: scanned.date,
                }),
              })
            )
          );
        } else if (scanned.splitDetails.lentAmount > 0) {
          await apiFetch('/api/finance/lent', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              personName: scanned.splitDetails.personName,
              amount: scanned.splitDetails.lentAmount,
              description: scanned.splitDetails.description,
              lentAt: scanned.date,
            }),
          });
        }
      } else {
        // Direct EXPENSE or INCOME transaction
        await apiFetch('/api/finance/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: scanned.mode,
            amount: scanned.amount,
            description: scanned.name,
            category: scanned.category,
          }),
        });
      }

      await fetchUserData(token);
    } catch (err) {
      console.error('Failed to process scanned bill:', err);
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
    percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 10000) / 100 : 0,
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
          onSuccess={handleLoanSuccess}
        />

        <BillScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          token={token}
          onConfirmBill={handleConfirmScannedBill}
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
                  <h2>{greeting}, {user?.name ? user.name.split(' ')[0] : user?.email ? user.email.split('@')[0] : 'there'}!</h2>
                  <p>{dateString} • {timeString} • Financial summary for {user?.name ? user.name : user?.email || 'your account'}</p>
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
        onSuccess={handleLoanSuccess}
      />

      <BillScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        token={token}
        onConfirmBill={handleConfirmScannedBill}
      />

      <PWAInstallPrompt
        isOpen={isPWAOpen}
        onClose={() => setIsPWAOpen(false)}
      />
    </div>
  );
}

export default App;

