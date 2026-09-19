import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import type { EditTransactionAction } from './components/EditTransactionModal';
import { EditLoanModal } from './components/EditLoanModal';
import { BillScannerModal } from './components/BillScannerModal';
import type { ScannedBillPayload } from './components/BillScannerModal';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { AuthModal } from './components/AuthModal';
import { BudgetManager } from './components/BudgetManager';
import type { BudgetLimit } from './components/BudgetManager';
import { SettingsView } from './components/SettingsView';
import { Toast } from './components/Toast';
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
  return nav as TabType;
};

function getInitialTab(): TabType {
  const urlTab = parseTabFromUrl();
  if (urlTab) return urlTab;

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('finatle_active_tab') as TabType | null;
    if (saved && VALID_TABS.includes(saved)) {
      return saved;
    }
  }

  return 'dashboard';
}

function cleanSplitText(text?: string | null): string {
  if (!text) return '';
  return text.replace(/\s*\((?:my share|custom split(?:\s+with\s+[^)]+)?|\d+\s+people split(?:\s*•\s*[^)]*)?|split bill)\)/gi, '').trim();
}

export function App() {
  const { greeting, timeString, dateString } = useGreeting();
  // Navigation & View state (persisted across refresh and URL back/forward)
  const [currentTab, setCurrentTab] = useState<TabType>(getInitialTab);
  const [mobileNav, setMobileNav] = useState<string>(tabToMobileNav(getInitialTab()));
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  const [addRecordKind, setAddRecordKind] = useState<RecordKind>('expense');
  const [editingTransaction, setEditingTransaction] = useState<TransactionItem | null>(null);
  const [editingLoan, setEditingLoan] = useState<LoanItem | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPWAOpen, setIsPWAOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileScreen, setIsMobileScreen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768;
  });

  // User state
  const [user, setUser] = useState<{ uid: string; email: string; name?: string | null; age?: number | null; phone?: string | null } | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem('user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  });
  const [loadingUser, setLoadingUser] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem('token'));
  });

  // Financial state strictly from DB
  const [transactions, setTransactions] = useState<TransactionItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const u = localStorage.getItem('user');
      const uid = u ? JSON.parse(u).uid : 'default';
      const cached = localStorage.getItem(`finatle_cache_tx_${uid}`);
      const raw: TransactionItem[] = cached ? JSON.parse(cached) : [];
      return raw.map((t) => ({ ...t, name: cleanSplitText(t.name) }));
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
  const [toast, setToast] = useState<{ message: string; type?: 'error' | 'success' | 'info'; id: number } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshRequestRef = useRef(0);

  const showToast = useCallback((message: string, type: 'error' | 'success' | 'info' = 'error') => {
    if (!message) return;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type, id: Date.now() });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

  const hideToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  }, []);

  // Auto detect mobile window size efficiently
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      setIsMobileScreen((prev) => (prev !== isMobile ? isMobile : prev));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock background scroll when any modal or dialog is open
  useEffect(() => {
    const isAnyModalOpen = isAddRecordOpen || !!editingTransaction || !!editingLoan || isScannerOpen || isPWAOpen || isAuthOpen;
    if (isAnyModalOpen) {
      document.body.classList.add('modal-open');
      document.documentElement.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    };
  }, [isAddRecordOpen, editingTransaction, editingLoan, isScannerOpen, isPWAOpen, isAuthOpen]);

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

        // Transactions strictly from DB (sorted by most recent first)
        if (data.transactions && Array.isArray(data.transactions)) {
          const sorted = [...data.transactions].sort((a: any, b: any) => {
            const timeA = new Date(a.occurredAt || a.createdAt).getTime();
            const timeB = new Date(b.occurredAt || b.createdAt).getTime();
            if (timeB !== timeA) return timeB - timeA;
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          });

          const mapped: TransactionItem[] = sorted.map((t: any) => ({
            id: t.tid,
            name: cleanSplitText(t.description) || t.category || 'Transaction',
            category: t.category || 'General',
            date: new Date(t.occurredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            amount: Number(t.amount),
            type: t.type,
            items: Array.isArray(t.items)
              ? t.items.map((it: any) => ({
                  id: it.id,
                  name: it.name,
                  price: Number(it.price) || 0,
                  quantity: Number(it.quantity) || 1,
                }))
              : [],
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

  // Scroll to top on tab / section transition
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const selectors = ['.main-content', '.page-container', '.mobile-view-wrapper', '.mobile-app-shell', '#root'];
    selectors.forEach((sel) => {
      const el = document.querySelector(sel);
      if (el) el.scrollTop = 0;
    });
  }, [currentTab]);

  const scrollToTop = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const selectors = ['.main-content', '.page-container', '.mobile-view-wrapper', '.mobile-app-shell', '#root'];
    selectors.forEach((sel) => {
      const el = document.querySelector(sel);
      if (el) el.scrollTop = 0;
    });
  }, []);

  const handleSelectTab = useCallback((tab: TabType) => {
    setCurrentTab(tab);
    setMobileNav(tabToMobileNav(tab));
    scrollToTop();
  }, [scrollToTop]);

  const handleSelectMobileNav = useCallback((nav: string) => {
    setMobileNav(nav);
    setCurrentTab(mobileNavToTab(nav));
    scrollToTop();
  }, [scrollToTop]);

  const handleOpenSettings = useCallback(() => {
    setCurrentTab('settings');
    setMobileNav('settings');
    scrollToTop();
  }, [scrollToTop]);

  const handleLogout = useCallback(() => {
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
    scrollToTop();
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [scrollToTop]);

  const saveBudget = useCallback((budget: BudgetLimit) => {
    setBudgets((previous) => {
      const filtered = previous.filter((item) => item.category.toLowerCase() !== budget.category.toLowerCase());
      const next = [...filtered, budget];
      const storageKey = user?.uid ? `finatle_budgets_${user.uid}` : 'finatle_budgets_local';
      localStorage.setItem(storageKey, JSON.stringify(next));
      localStorage.setItem('finatle_budgets_local', JSON.stringify(next));
      return next;
    });
  }, [user?.uid]);

  const deleteBudget = useCallback((category: string) => {
    setBudgets((previous) => {
      const next = previous.filter((item) => item.category.toLowerCase() !== category.toLowerCase());
      const storageKey = user?.uid ? `finatle_budgets_${user.uid}` : 'finatle_budgets_local';
      localStorage.setItem(storageKey, JSON.stringify(next));
      localStorage.setItem('finatle_budgets_local', JSON.stringify(next));
      return next;
    });
  }, [user?.uid]);


  const handleAddRecordSuccess = useCallback(async (payload?: { kind: string; apiPayload?: any; optimisticData?: any; splitData?: any }) => {
    if (!payload) {
      if (token) await fetchUserData(token);
      return;
    }

    const { kind, apiPayload, optimisticData, splitData } = payload;
    const uid = user?.uid || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).uid : 'default');

    if (kind === 'split' && splitData) {
      const { userShareTransaction, lentEntries } = splitData;

      // 1. Add split transaction for the user
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
              if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || errData.error || 'Failed to save transaction');
              }
              const data = await res.json();
              const realTxId = data.transaction?.tid || data.transaction?.id || userShareTransaction.optimisticData.id;
              const realItem: TransactionItem = {
                id: realTxId,
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
              fetchUserData(token, false);
            })
            .catch((err) => {
              console.error('[Optimistic] Split user share transaction failed:', err);
              setTransactions((prev) => {
                const updated = prev.filter((t) => t.id !== userShareTransaction.optimisticData.id);
                localStorage.setItem(`finatle_cache_tx_${uid}`, JSON.stringify(updated));
                return updated;
              });
              showToast(err.message || 'Failed to save split transaction. Reverted.', 'error');
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
          Promise.all(
            lentEntries.map((e: any) =>
              apiFetch('/api/finance/lent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(e.apiPayload),
              })
                .then(async (res) => {
                  if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.message || errData.error || 'Failed to save lent record');
                  }
                  return res.json();
                })
                .then((data) => {
                  if (data.loan) {
                    const realLoanId = data.loan.lid || data.loan.bid || data.loan.id || e.optimisticData.id;
                    const realLoan: LoanItem = {
                      id: realLoanId,
                      kind: 'lent',
                      personName: data.loan.personName,
                      title: `You lent to ${data.loan.personName}`,
                      subtext: data.loan.description || 'Split bill',
                      amount: Number(data.loan.amount),
                      paidAmount: Number(data.loan.paidAmount || 0),
                      status: data.loan.status || 'PENDING',
                      statusLabel: data.loan.status === 'PAID' ? 'Settled' : 'Yet to receive',
                      date: data.loan.lentAt ? new Date(data.loan.lentAt).toISOString() : new Date().toISOString(),
                      dueDate: data.loan.dueAt ? new Date(data.loan.dueAt).toISOString() : undefined,
                    };
                    setLoans((prev) => {
                      const updated = prev.map((l) => (l.id === e.optimisticData.id ? realLoan : l));
                      localStorage.setItem(`finatle_cache_loans_${uid}`, JSON.stringify(updated));
                      return updated;
                    });
                  }
                })
            )
          )
            .then(() => {
              if (token) fetchUserData(token, false);
            })
            .catch((err) => {
              console.error('[Optimistic] Split friends loan save error:', err);
              if (token) fetchUserData(token, false);
              showToast(err.message || 'Failed to save lent records.', 'error');
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

      if (token && apiPayload) {
        apiFetch('/api/finance/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(apiPayload),
        })
          .then(async (res) => {
            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.message || errData.error || 'Unable to save transaction.');
            }
            const data = await res.json();
            if (data.transaction) {
              const realTxId = data.transaction.tid || data.transaction.id || optimisticData.id;
              const realItem: TransactionItem = {
                id: realTxId,
                name: cleanSplitText(data.transaction.description) || data.transaction.category || 'Transaction',
                category: data.transaction.category || 'General',
                date: new Date(data.transaction.occurredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                amount: Number(data.transaction.amount),
                type: data.transaction.type,
              };
              setTransactions((prev) => {
                const updated = prev.map((t) => (t.id === optimisticData.id ? realItem : t));
                localStorage.setItem(`finatle_cache_tx_${uid}`, JSON.stringify(updated));
                return updated;
              });
            }
            fetchUserData(token, false);
          })
          .catch((err) => {
            console.error('[Optimistic] Add transaction failed, reverting:', err);
            setTransactions((prev) => {
              const updated = prev.filter((t) => t.id !== optimisticData.id);
              localStorage.setItem(`finatle_cache_tx_${uid}`, JSON.stringify(updated));
              return updated;
            });
            showToast(err.message || 'Unable to save transaction. Reverted.', 'error');
          });
      }
    } else if ((kind === 'lent' || kind === 'borrowed') && optimisticData) {
      setLoans((prev) => {
        const updated = [optimisticData as LoanItem, ...prev];
        localStorage.setItem(`finatle_cache_loans_${uid}`, JSON.stringify(updated));
        return updated;
      });

      if (token && apiPayload) {
        const endpoint = kind === 'borrowed' ? '/api/finance/borrowed' : '/api/finance/lent';
        apiFetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(apiPayload),
        })
          .then(async (res) => {
            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.message || errData.error || 'Unable to save loan.');
            }
            const data = await res.json();
            if (data.loan) {
              const realLoanId = data.loan.lid || data.loan.bid || data.loan.id || optimisticData.id;
              const realItem: LoanItem = {
                id: realLoanId,
                kind,
                personName: data.loan.personName,
                title: kind === 'lent' ? `You lent to ${data.loan.personName}` : `You borrowed from ${data.loan.personName}`,
                subtext: data.loan.description || 'Personal loan',
                amount: Number(data.loan.amount),
                paidAmount: Number(data.loan.paidAmount || 0),
                status: data.loan.status || 'PENDING',
                statusLabel: data.loan.status === 'PAID' ? 'Settled' : kind === 'lent' ? 'Yet to receive' : 'Yet to pay',
                date: data.loan.lentAt ? new Date(data.loan.lentAt).toISOString() : data.loan.borrowedAt ? new Date(data.loan.borrowedAt).toISOString() : new Date().toISOString(),
                dueDate: data.loan.dueAt ? new Date(data.loan.dueAt).toISOString() : undefined,
              };
              setLoans((prev) => {
                const updated = prev.map((l) => (l.id === optimisticData.id ? realItem : l));
                localStorage.setItem(`finatle_cache_loans_${uid}`, JSON.stringify(updated));
                return updated;
              });
            }
            fetchUserData(token, false);
          })
          .catch((err) => {
            console.error('[Optimistic] Add loan failed, reverting:', err);
            setLoans((prev) => {
              const updated = prev.filter((l) => l.id !== optimisticData.id);
              localStorage.setItem(`finatle_cache_loans_${uid}`, JSON.stringify(updated));
              return updated;
            });
            showToast(err.message || 'Unable to save loan. Reverted.', 'error');
          });
      }
    }
  }, [token, user?.uid, showToast]);

  const handleTransactionSuccess = useCallback(async (action?: EditTransactionAction) => {
    if (!action) {
      if (token) await fetchUserData(token, false);
      return;
    }

    const uid = user?.uid || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).uid : 'default');
    const prevTransactions = transactions;
    const prevLoans = loans;

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
          .then(async (res) => {
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.message || data.error || 'Failed to delete transaction.');
            }
            fetchUserData(token, false);
          })
          .catch((err) => {
            console.error('[Optimistic] Delete transaction failed, reverting:', err);
            setTransactions(prevTransactions);
            localStorage.setItem(`finatle_cache_tx_${uid}`, JSON.stringify(prevTransactions));
            showToast(err.message || 'Failed to delete transaction. Reverted.', 'error');
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
          .then(async (res) => {
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.message || data.error || 'Failed to update transaction.');
            }
            fetchUserData(token, false);
          })
          .catch((err) => {
            console.error('[Optimistic] Update transaction failed, reverting:', err);
            setTransactions(prevTransactions);
            localStorage.setItem(`finatle_cache_tx_${uid}`, JSON.stringify(prevTransactions));
            showToast(err.message || 'Failed to update transaction. Reverted.', 'error');
          });
      }
    } else if (action.type === 'convert_to_loan' && action.originalId && action.loanData) {
      const { kind, apiPayload, optimisticData } = action.loanData;
      // 1. Remove from transactions optimistically
      setTransactions((prev) => {
        const updated = prev.filter((t) => t.id !== action.originalId);
        localStorage.setItem(`finatle_cache_tx_${uid}`, JSON.stringify(updated));
        return updated;
      });
      // 2. Add to loans optimistically
      setLoans((prev) => {
        const updated = [optimisticData, ...prev];
        localStorage.setItem(`finatle_cache_loans_${uid}`, JSON.stringify(updated));
        return updated;
      });

      if (token) {
        const endpoint = kind === 'borrowed' ? '/api/finance/borrowed' : '/api/finance/lent';
        Promise.all([
          apiFetch(`/api/finance/transactions/${action.originalId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          }),
          apiFetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(apiPayload),
          }),
        ])
          .then(async ([, createRes]) => {
            if (!createRes.ok) {
              const errData = await createRes.json().catch(() => ({}));
              throw new Error(errData.message || errData.error || 'Failed to create loan record');
            }
            const data = await createRes.json();
            if (data.loan) {
              const realLoanId = data.loan.lid || data.loan.bid || data.loan.id || optimisticData.id;
              const realItem: LoanItem = {
                ...optimisticData,
                id: realLoanId,
              };
              setLoans((prev) => {
                const updated = prev.map((l) => (l.id === optimisticData.id ? realItem : l));
                localStorage.setItem(`finatle_cache_loans_${uid}`, JSON.stringify(updated));
                return updated;
              });
            }
            fetchUserData(token, false);
            showToast(`Converted to ${kind === 'lent' ? 'Lent' : 'Borrowed'} record!`, 'success');
          })
          .catch((err) => {
            console.error('[Convert to loan failed]:', err);
            setTransactions(prevTransactions);
            setLoans(prevLoans);
            localStorage.setItem(`finatle_cache_tx_${uid}`, JSON.stringify(prevTransactions));
            localStorage.setItem(`finatle_cache_loans_${uid}`, JSON.stringify(prevLoans));
            showToast(err.message || 'Failed to convert transaction.', 'error');
          });
      } else {
        showToast(`Converted to ${kind === 'lent' ? 'Lent' : 'Borrowed'} record!`, 'success');
      }
    } else if (action.type === 'convert_to_split' && action.originalId && action.splitData) {
      const { userShareTransaction, lentEntries } = action.splitData;

      // 1. Update user share in transactions optimistically
      if (userShareTransaction) {
        setTransactions((prev) => {
          const updated = prev.map((t) => (t.id === action.originalId ? userShareTransaction.optimisticData : t));
          localStorage.setItem(`finatle_cache_tx_${uid}`, JSON.stringify(updated));
          return updated;
        });

        if (token) {
          apiFetch(`/api/finance/transactions/${action.originalId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(userShareTransaction.apiPayload),
          }).catch((err) => console.error('[Split update transaction share failed]:', err));
        }
      } else {
        // No user share left (100% split to friends)
        setTransactions((prev) => {
          const updated = prev.filter((t) => t.id !== action.originalId);
          localStorage.setItem(`finatle_cache_tx_${uid}`, JSON.stringify(updated));
          return updated;
        });

        if (token) {
          apiFetch(`/api/finance/transactions/${action.originalId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          }).catch((err) => console.error('[Split delete full transaction failed]:', err));
        }
      }

      // 2. Add friends' shares to loans optimistically
      if (lentEntries && lentEntries.length > 0) {
        const optimisticLoans = lentEntries.map((e) => e.optimisticData);
        setLoans((prev) => {
          const updated = [...optimisticLoans, ...prev];
          localStorage.setItem(`finatle_cache_loans_${uid}`, JSON.stringify(updated));
          return updated;
        });

        if (token) {
          Promise.all(
            lentEntries.map((e) =>
              apiFetch('/api/finance/lent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(e.apiPayload),
              })
                .then(async (res) => {
                  if (res.ok) {
                    const data = await res.json();
                    if (data.loan) {
                      const realLoanId = data.loan.lid || data.loan.bid || data.loan.id || e.optimisticData.id;
                      const realItem: LoanItem = {
                        ...e.optimisticData,
                        id: realLoanId,
                      };
                      setLoans((prev) => {
                        const updated = prev.map((l) => (l.id === e.optimisticData.id ? realItem : l));
                        localStorage.setItem(`finatle_cache_loans_${uid}`, JSON.stringify(updated));
                        return updated;
                      });
                    }
                  }
                })
            )
          )
            .then(() => {
              if (token) fetchUserData(token, false);
            })
            .catch((err) => console.error('[Split create lent loans failed]:', err));
        }
      }

      showToast('Transaction split and recorded to loans!', 'success');
    }
  }, [token, user?.uid, transactions, loans, showToast]);

  const handleLoanSuccess = useCallback(async (action?: { type: 'update' | 'delete'; data?: LoanItem; originalId?: string; apiPayload?: any }) => {
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
          .then(async (res) => {
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.message || data.error || 'Failed to delete loan.');
            }
            fetchUserData(token, false);
          })
          .catch((err) => {
            console.error('[Optimistic] Delete loan failed, reverting:', err);
            setLoans(prevLoans);
            localStorage.setItem(`finatle_cache_loans_${uid}`, JSON.stringify(prevLoans));
            showToast(err.message || 'Failed to delete loan. Reverted.', 'error');
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
          .then(async (res) => {
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.message || data.error || 'Failed to update loan.');
            }
            if (token) fetchUserData(token, false);
          })
          .catch((err) => {
            console.error('[Optimistic] Update loan failed, reverting:', err);
            setLoans(prevLoans);
            localStorage.setItem(`finatle_cache_loans_${uid}`, JSON.stringify(prevLoans));
            showToast(err?.message || 'Failed to update loan. Reverted.', 'error');
          });
      }
    }
  }, [token, user?.uid, loans, showToast]);

  const handleEditTransaction = useCallback((transaction: TransactionItem) => {
    setEditingTransaction(transaction);
  }, []);

  const handleEditLoan = useCallback((loan: LoanItem) => {
    setEditingLoan(loan);
  }, []);

  const handleSettleLoan = useCallback(async (loanId: string, currentStatus: LoanItem['status']) => {
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
        showToast(error.message || 'Unable to update settlement status.', 'error');
      }
    }
  }, [token, showToast]);

  const handleConfirmScannedBill = useCallback(async (scanned: ScannedBillPayload) => {
    if (!token) return;

    const uid = user?.uid || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).uid : 'default');
    const tempTxId = `temp-scan-tx-${Date.now()}`;
    const todayFormatted = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    try {
      if (scanned.mode === 'SPLIT' && scanned.splitDetails) {
        // 1. Optimistically insert user share transaction
        if (scanned.splitDetails.userShare > 0) {
          const optimisticTx: TransactionItem = {
            id: tempTxId,
            name: scanned.name,
            category: scanned.category,
            date: todayFormatted,
            amount: scanned.splitDetails.userShare,
            type: 'EXPENSE',
            items: scanned.items,
          };
          setTransactions((prev) => {
            const updated = [optimisticTx, ...prev];
            localStorage.setItem(`finatle_cache_tx_${uid}`, JSON.stringify(updated));
            return updated;
          });

          apiFetch('/api/finance/transactions', {
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
              occurredAt: scanned.date,
              items: scanned.items,
            }),
          })
            .then(async (res) => {
              if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Insufficient balance for this transaction.');
              }
              const data = await res.json();
              if (data.transaction) {
                const realTxId = data.transaction.tid || data.transaction.id || tempTxId;
                const realItem: TransactionItem = {
                  id: realTxId,
                  name: data.transaction.description || scanned.name,
                  category: data.transaction.category || scanned.category,
                  date: todayFormatted,
                  amount: Number(data.transaction.amount ?? scanned.splitDetails?.userShare),
                  type: 'EXPENSE',
                  items: data.transaction.items || scanned.items,
                };
                setTransactions((prev) => {
                  const updated = prev.map((t) => (t.id === tempTxId ? realItem : t));
                  localStorage.setItem(`finatle_cache_tx_${uid}`, JSON.stringify(updated));
                  return updated;
                });
              }
              fetchUserData(token, false);
            })
            .catch((err) => {
              console.error('[Optimistic] Scanned user share sync failed:', err);
              setTransactions((prev) => {
                const updated = prev.filter((t) => t.id !== tempTxId);
                localStorage.setItem(`finatle_cache_tx_${uid}`, JSON.stringify(updated));
                return updated;
              });
              showToast(err.message || 'Insufficient balance for this transaction.', 'error');
            });
        }

        // 2. Optimistically insert lent records for friends
        if (scanned.splitDetails.lentEntries && scanned.splitDetails.lentEntries.length > 0) {
          const optimisticLoans: LoanItem[] = scanned.splitDetails.lentEntries.map((entry, idx) => ({
            id: `temp-scan-loan-${Date.now()}-${idx}`,
            kind: 'lent',
            personName: entry.personName,
            title: `You lent to ${entry.personName}`,
            subtext: entry.description || `${scanned.name} split`,
            amount: entry.amount,
            paidAmount: 0,
            date: new Date().toISOString(),
            status: 'PENDING',
            statusLabel: 'Yet to receive',
          }));

          setLoans((prev) => {
            const updated = [...optimisticLoans, ...prev];
            localStorage.setItem(`finatle_cache_loans_${uid}`, JSON.stringify(updated));
            return updated;
          });

          Promise.all(
            scanned.splitDetails.lentEntries.map((entry, idx) =>
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
              }).then(async (res) => {
                if (!res.ok) {
                  const errData = await res.json().catch(() => ({}));
                  throw new Error(errData.message || 'Insufficient balance to lend.');
                }
                const data = await res.json();
                if (data.loan) {
                  const realId = data.loan.lid || data.loan.bid || data.loan.id;
                  const tempId = optimisticLoans[idx]?.id;
                  if (tempId && realId) {
                    setLoans((prev) => {
                      const updated = prev.map((l) => (l.id === tempId ? { ...l, id: realId } : l));
                      localStorage.setItem(`finatle_cache_loans_${uid}`, JSON.stringify(updated));
                      return updated;
                    });
                  }
                }
                return data;
              })
            )
          )
            .then(() => {
              fetchUserData(token, false);
            })
            .catch((err) => {
              console.error('[Optimistic] Scanned lent sync failed:', err);
              fetchUserData(token, false);
              showToast(err.message || 'Insufficient balance for lent records.', 'error');
            });
        } else if (scanned.splitDetails.lentAmount > 0) {
          const singleLoanId = `temp-scan-loan-${Date.now()}`;
          const optimisticLoan: LoanItem = {
            id: singleLoanId,
            kind: 'lent',
            personName: scanned.splitDetails.personName,
            title: `You lent to ${scanned.splitDetails.personName}`,
            subtext: scanned.splitDetails.description,
            amount: scanned.splitDetails.lentAmount,
            paidAmount: 0,
            date: new Date().toISOString(),
            status: 'PENDING',
            statusLabel: 'Yet to receive',
          };

          setLoans((prev) => {
            const updated = [optimisticLoan, ...prev];
            localStorage.setItem(`finatle_cache_loans_${uid}`, JSON.stringify(updated));
            return updated;
          });

          apiFetch('/api/finance/lent', {
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
          })
            .then(async (res) => {
              if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Insufficient balance to lend.');
              }
              const data = await res.json();
              if (data.loan) {
                const realLoanId = data.loan.lid || data.loan.bid || data.loan.id || singleLoanId;
                const realLoan: LoanItem = {
                  id: realLoanId,
                  kind: 'lent',
                  personName: data.loan.personName,
                  title: `You lent to ${data.loan.personName}`,
                  subtext: data.loan.description || scanned.splitDetails?.description || '',
                  amount: Number(data.loan.amount),
                  paidAmount: 0,
                  date: data.loan.lentAt ? new Date(data.loan.lentAt).toISOString() : new Date().toISOString(),
                  status: 'PENDING',
                  statusLabel: 'Yet to receive',
                };
                setLoans((prev) => {
                  const updated = prev.map((l) => (l.id === singleLoanId ? realLoan : l));
                  localStorage.setItem(`finatle_cache_loans_${uid}`, JSON.stringify(updated));
                  return updated;
                });
              }
              fetchUserData(token, false);
            })
            .catch((err) => {
              console.error('[Optimistic] Scanned single lent sync failed:', err);
              setLoans((prev) => {
                const updated = prev.filter((l) => l.id !== singleLoanId);
                localStorage.setItem(`finatle_cache_loans_${uid}`, JSON.stringify(updated));
                return updated;
              });
              showToast(err.message || 'Insufficient balance to lend.', 'error');
            });
        }
      } else {
        // Direct EXPENSE or INCOME transaction - Instant UI update
        const directType: 'INCOME' | 'EXPENSE' = scanned.mode === 'INCOME' ? 'INCOME' : 'EXPENSE';
        const optimisticTx: TransactionItem = {
          id: tempTxId,
          name: scanned.name,
          category: scanned.category,
          date: todayFormatted,
          amount: scanned.amount,
          type: directType,
          items: scanned.items,
        };

        setTransactions((prev) => {
          const updated = [optimisticTx, ...prev];
          localStorage.setItem(`finatle_cache_tx_${uid}`, JSON.stringify(updated));
          return updated;
        });

        // Fire network write in background
        apiFetch('/api/finance/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: directType,
            amount: scanned.amount,
            description: scanned.name,
            category: scanned.category,
            occurredAt: scanned.date,
            items: scanned.items,
          }),
        })
          .then(async (res) => {
            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.message || 'Insufficient balance for this transaction.');
            }
            const data = await res.json();
            if (data.transaction) {
              const realTxId = data.transaction.tid || data.transaction.id || tempTxId;
              const realItem: TransactionItem = {
                id: realTxId,
                name: data.transaction.description || scanned.name,
                category: data.transaction.category || scanned.category,
                date: todayFormatted,
                amount: Number(data.transaction.amount),
                type: directType,
                items: data.transaction.items || scanned.items,
              };
              setTransactions((prev) => {
                const updated = prev.map((t) => (t.id === tempTxId ? realItem : t));
                localStorage.setItem(`finatle_cache_tx_${uid}`, JSON.stringify(updated));
                return updated;
              });
            }
            fetchUserData(token, false);
          })
          .catch((err) => {
            console.error('[Optimistic] Scanned direct transaction failed:', err);
            setTransactions((prev) => {
              const updated = prev.filter((t) => t.id !== tempTxId);
              localStorage.setItem(`finatle_cache_tx_${uid}`, JSON.stringify(updated));
              return updated;
            });
            showToast(err.message || 'Insufficient balance for this transaction.', 'error');
          });
      }
    } catch (err: any) {
      console.error('Failed to process scanned bill:', err);
      showToast(err.message || 'Failed to process scanned bill.', 'error');
    }
  }, [token, user, showToast]);

  // Filter transactions according to search input (memoized)
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const query = searchQuery.toLowerCase();
    return transactions.filter(
      (t) => t.name.toLowerCase().includes(query) || t.category.toLowerCase().includes(query)
    );
  }, [transactions, searchQuery]);

  const filteredLoans = useMemo(() => {
    if (!searchQuery.trim()) return loans;
    const query = searchQuery.toLowerCase();
    return loans.filter(
      (l) =>
        l.title.toLowerCase().includes(query) ||
        l.personName.toLowerCase().includes(query) ||
        l.subtext.toLowerCase().includes(query)
    );
  }, [loans, searchQuery]);

  // Calculate real metrics strictly from DB records (memoized)
  const {
    totalIncome,
    totalExpense,
    netSavings,
    actualBalance,
    pendingSettlementsTotal,
    settlementDetails,
  } = useMemo(() => {
    const inc = transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const exp = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const lentOut = loans
      .filter((l) => l.kind === 'lent')
      .reduce(
        (sum, l) =>
          sum +
          Math.max(
            0,
            Number(l.amount) -
              Number(l.paidAmount !== undefined ? l.paidAmount : l.status === 'PAID' ? l.amount : 0)
          ),
        0
      );

    const borrowedOut = loans
      .filter((l) => l.kind === 'borrowed')
      .reduce(
        (sum, l) =>
          sum +
          Math.max(
            0,
            Number(l.amount) -
              Number(l.paidAmount !== undefined ? l.paidAmount : l.status === 'PAID' ? l.amount : 0)
          ),
        0
      );

    const savings = Math.max(0, inc - exp - lentOut);
    const actBal = Math.max(0, inc - exp - lentOut + borrowedOut);

    const pendingTotal = loans.reduce((sum, l) => {
      const paid = Number(
        l.paidAmount !== undefined ? l.paidAmount : l.status === 'PAID' ? l.amount : 0
      );
      return sum + Math.max(0, Number(l.amount) - paid);
    }, 0);

    const pCount = loans.filter((l) => l.status !== 'PAID').length;
    const lCount = loans.filter((l) => l.kind === 'lent' && l.status !== 'PAID').length;
    const bCount = loans.filter((l) => l.kind === 'borrowed' && l.status !== 'PAID').length;

    const details =
      pCount > 0
        ? `${pCount} records • ${bCount} you owe • ${lCount} owes you`
        : '0 pending settlements';

    return {
      totalIncome: inc,
      totalExpense: exp,
      lentOutstanding: lentOut,
      borrowedOutstanding: borrowedOut,
      netSavings: savings,
      actualBalance: actBal,
      pendingSettlementsTotal: pendingTotal,
      pendingSettlementsCount: pCount,
      lentCount: lCount,
      borrowedCount: bCount,
      settlementDetails: details,
    };
  }, [transactions, loans]);

  const canSettleLoan = useCallback(
    (loan: LoanItem) =>
      !(loan.kind === 'lent' && loan.status === 'PAID' && netSavings < loan.amount) &&
      !(loan.kind === 'borrowed' && loan.status !== 'PAID' && actualBalance <= 0),
    [netSavings, actualBalance]
  );

  // Compute category breakdown strictly from real DB expenses (memoized)
  const { categoryMap, expenseCategories, expenseSpending } = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'EXPENSE')
      .forEach((t) => {
        const cat = t.category || 'General';
        map[cat] = (map[cat] || 0) + Number(t.amount);
      });

    const cats: CategoryExpense[] = Object.entries(map).map(([name, amount]) => ({
      name,
      amount,
      percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 10000) / 100 : 0,
      color: '',
    }));

    return {
      categoryMap: map,
      expenseCategories: cats,
      expenseSpending: map,
    };
  }, [transactions, totalExpense]);

  const openAdd = useCallback((kind: RecordKind = 'expense') => {
    setAddRecordKind(kind);
    setIsAddRecordOpen(true);
  }, []);

  const handleCloseAdd = useCallback(() => {
    setIsAddRecordOpen(false);
  }, []);

  const handleOpenAuth = useCallback((mode: 'signin' | 'signup' = 'signup') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  }, []);

  const handleCloseAuth = useCallback(() => {
    setIsAuthOpen(false);
  }, []);

  const handleOpenScanner = useCallback(() => {
    setIsScannerOpen(true);
  }, []);

  const handleCloseScanner = useCallback(() => {
    setIsScannerOpen(false);
  }, []);

  const handleOpenPWA = useCallback(() => {
    setIsPWAOpen(true);
  }, []);

  const handleClosePWA = useCallback(() => {
    setIsPWAOpen(false);
  }, []);

  const handleOpenLoansTab = useCallback(() => {
    handleSelectTab('loans');
  }, [handleSelectTab]);

  const handleOpenTransactionsTab = useCallback(() => {
    handleSelectTab('transactions');
  }, [handleSelectTab]);

  const handleCloseEditTransaction = useCallback(() => {
    setEditingTransaction(null);
  }, []);

  const handleCloseEditLoan = useCallback(() => {
    setEditingLoan(null);
  }, []);

  // 1. If verifying existing token but user is not cached yet, show clean loader
  if (loadingUser && !user) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="animate-spin" style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary, #6366f1)', borderRadius: '50%' }} />
      </div>
    );
  }

  // 2. If user is not authenticated, show the Hero Landing Page!
  if (!user) {
    return (
      <>
        <HeroLanding
          onOpenAuth={handleOpenAuth}
        />
        <AuthModal
          isOpen={isAuthOpen}
          initialMode={authMode}
          onClose={handleCloseAuth}
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
            actualBalance={actualBalance}
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
            onOpenAddModal={openAdd}
            onOpenScanner={handleOpenScanner}
            onOpenLoans={handleOpenLoansTab}
            onOpenAllTransactions={handleOpenTransactionsTab}
            budgets={budgets}
            spending={expenseSpending}
            onSaveBudget={saveBudget}
            onDeleteBudget={deleteBudget}
            onLogout={handleLogout}
            onOpenSettings={handleOpenSettings}
            onOpenPWA={handleOpenPWA}
            onEditTransaction={handleEditTransaction}
            onEditLoan={handleEditLoan}
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
          onClose={handleCloseAuth}
          onAuthSuccess={handleAuthSuccess}
        />

        <AddRecordModal
          isOpen={isAddRecordOpen}
          onClose={handleCloseAdd}
          initialKind={addRecordKind}
          token={token}
          onSuccess={handleAddRecordSuccess}
        />

        <EditTransactionModal
          isOpen={!!editingTransaction}
          onClose={handleCloseEditTransaction}
          transaction={editingTransaction}
          token={token}
          onSuccess={handleTransactionSuccess}
        />

        <EditLoanModal
          isOpen={!!editingLoan}
          onClose={handleCloseEditLoan}
          loan={editingLoan}
          token={token}
          onSuccess={handleLoanSuccess}
        />

        <BillScannerModal
          isOpen={isScannerOpen}
          onClose={handleCloseScanner}
          token={token}
          onConfirmBill={handleConfirmScannedBill}
        />

        <PWAInstallPrompt
          isOpen={isPWAOpen}
          onClose={handleClosePWA}
        />

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={hideToast}
          />
        )}
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
                    limit={5}
                    onViewAll={() => handleSelectTab('transactions')}
                    onAddTransaction={() => openAdd('expense')}
                    onEditTransaction={handleEditTransaction}
                  />
                  <LoansSettlements
                    loans={filteredLoans}
                    limit={5}
                    onViewAll={() => handleSelectTab('loans')}
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
        onClose={handleCloseAuth}
        onAuthSuccess={handleAuthSuccess}
      />

      <AddRecordModal
        isOpen={isAddRecordOpen}
        onClose={handleCloseAdd}
        initialKind={addRecordKind}
        token={token}
        onSuccess={handleAddRecordSuccess}
      />

      <EditTransactionModal
        isOpen={!!editingTransaction}
        onClose={handleCloseEditTransaction}
        transaction={editingTransaction}
        token={token}
        onSuccess={handleTransactionSuccess}
      />

      <EditLoanModal
        isOpen={!!editingLoan}
        onClose={handleCloseEditLoan}
        loan={editingLoan}
        token={token}
        onSuccess={handleLoanSuccess}
      />

      <BillScannerModal
        isOpen={isScannerOpen}
        onClose={handleCloseScanner}
        token={token}
        onConfirmBill={handleConfirmScannedBill}
      />

      <PWAInstallPrompt
        isOpen={isPWAOpen}
        onClose={handleClosePWA}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
}

export default App;

