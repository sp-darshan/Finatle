import React, { useState, useEffect, useRef } from 'react';
import { PencilEditIcon, TrashIcon, MinusIcon, PlusIcon } from './Icons';
import { LuX, LuUsers, LuPenLine, LuPlus, LuTrash2, LuUser, LuWallet, LuReceipt, LuChevronDown, LuChevronUp } from 'react-icons/lu';
import type { TransactionItem, TransactionBreakdownItem } from './RecentTransactions';
import type { LoanItem } from './LoansSettlements';
import type { AccountItem } from './Sidebar';
import { formatRupee } from '../lib/formatters';
import { CategoryPicker } from './CategoryPicker';
import { CustomDropdown } from './CustomDropdown';

export type EditTransactionAction = {
  type: 'update' | 'delete' | 'convert_to_loan' | 'convert_to_split';
  data?: TransactionItem;
  originalId?: string;
  loanData?: {
    kind: 'lent' | 'borrowed';
    apiPayload: any;
    optimisticData: LoanItem;
  };
  splitData?: {
    userShareTransaction?: {
      apiPayload: any;
      optimisticData: TransactionItem;
    };
    lentEntries: Array<{
      apiPayload: any;
      optimisticData: LoanItem;
    }>;
  };
};

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionItem | null;
  accounts?: AccountItem[];
  token?: string | null;
  onSuccess: (action?: EditTransactionAction) => void | Promise<void>;
}

interface CustomPersonEntry {
  id: string;
  name: string;
  amount: string;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction,
  accounts = [],
  onSuccess,
}) => {
  const [mode, setMode] = useState<'EXPENSE' | 'INCOME' | 'LENT' | 'BORROWED' | 'SPLIT'>('EXPENSE');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Dining');
  const [otherCategory, setOtherCategory] = useState('');
  const [personName, setPersonName] = useState('');
  const [dueAt, setDueAt] = useState('');

  // Receipt breakdown items
  const [items, setItems] = useState<TransactionBreakdownItem[]>([]);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Split state
  const [splitType, setSplitType] = useState<'EQUAL' | 'CUSTOM'>('EQUAL');
  const [splitPeopleCount, setSplitPeopleCount] = useState('4');
  const [equalFriendNames, setEqualFriendNames] = useState<string[]>(['', '', '']);
  const [customPeople, setCustomPeople] = useState<CustomPersonEntry[]>([
    { id: '1', name: '', amount: '' },
  ]);

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transaction) {
      setMode(transaction.type === 'INCOME' ? 'INCOME' : 'EXPENSE');
      const defaultAccId = accounts.find((a) => a.isDefault)?.aid || accounts.find((a) => a.isDefault)?.id || accounts[0]?.aid || accounts[0]?.id || '';
      setSelectedAccountId(transaction.accountId || defaultAccId);
      setAmount(String(transaction.amount || ''));
      setDescription(transaction.name || '');
      setCategory(transaction.category || 'Dining');
      setOtherCategory('');
      setPersonName('');
      setDueAt('');
      setSplitType('EQUAL');
      setSplitPeopleCount('4');
      setEqualFriendNames(['', '', '']);
      setCustomPeople([{ id: '1', name: '', amount: '' }]);
      setError(null);
      setIsConfirmingDelete(false);

      if (transaction.items && Array.isArray(transaction.items) && transaction.items.length > 0) {
        setItems(transaction.items.map((it) => ({
          id: it.id || `item-${Math.random().toString(36).substring(2, 9)}`,
          name: it.name,
          price: Number(it.price) || 0,
          quantity: it.quantity && Number(it.quantity) > 0 ? Number(it.quantity) : 1,
        })));
        setShowBreakdown(true);
      } else {
        setItems([]);
        setShowBreakdown(false);
      }
    }
  }, [transaction, accounts, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');
    return () => {
      if (!document.querySelector('.modal-overlay')) {
        document.body.classList.remove('modal-open');
        document.documentElement.classList.remove('modal-open');
      }
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
      }
    };
  }, []);

  if (!isOpen || !transaction) return null;

  const peopleCount = Math.max(2, parseInt(splitPeopleCount) || 4);

  const handleSetPeopleCount = (newCount: number) => {
    const validCount = Math.max(2, Math.min(100, newCount));
    setSplitPeopleCount(String(validCount));
    setEqualFriendNames((prev) => {
      const friendsNeeded = validCount - 1;
      const next = [...prev];
      if (next.length < friendsNeeded) {
        while (next.length < friendsNeeded) {
          next.push('');
        }
      } else if (next.length > friendsNeeded) {
        return next.slice(0, friendsNeeded);
      }
      return next;
    });
  };

  const handleAddEqualFriend = () => {
    handleSetPeopleCount(peopleCount + 1);
  };

  const handleRemoveEqualFriend = (index: number) => {
    if (peopleCount <= 2) return;
    setEqualFriendNames((prev) => prev.filter((_, i) => i !== index));
    setSplitPeopleCount(String(peopleCount - 1));
  };

  const handleEqualFriendNameChange = (index: number, val: string) => {
    setEqualFriendNames((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleAddPerson = () => {
    setCustomPeople((prev) => [
      ...prev,
      { id: String(Date.now() + Math.random()), name: '', amount: '' },
    ]);
  };

  const handleRemovePerson = (id: string) => {
    if (customPeople.length <= 1) {
      setCustomPeople([{ id: '1', name: '', amount: '' }]);
    } else {
      setCustomPeople((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handlePersonChange = (id: string, field: 'name' | 'amount', val: string) => {
    setCustomPeople((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: val } : p))
    );
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, name: '', price: 0, quantity: 1 },
    ]);
    setShowBreakdown(true);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'name' | 'price' | 'quantity', val: any) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return { ...item, [field]: val };
      })
    );
  };


  const numericAmount = parseFloat(amount) || 0;

  // Split calculation metrics
  const perPersonOwed = numericAmount > 0 ? Math.round((numericAmount / peopleCount) * 100) / 100 : 0;
  const equalTotalLent = numericAmount > 0 ? Math.round(perPersonOwed * (peopleCount - 1) * 100) / 100 : 0;
  const equalUserShare = Math.max(0, Math.round((numericAmount - equalTotalLent) * 100) / 100);

  const customTotalLent = customPeople.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const customUserShare = Math.max(0, Math.round((numericAmount - customTotalLent) * 100) / 100);

  const computedLentAmount = splitType === 'EQUAL' ? equalTotalLent : customTotalLent;
  const computedUserShare = splitType === 'EQUAL' ? equalUserShare : customUserShare;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }

    const resolvedCategory = category === 'Other' && otherCategory.trim()
      ? otherCategory.trim()
      : category;

    // 1. Standard Expense or Income update
    if (mode === 'EXPENSE' || mode === 'INCOME') {
      const validItems = items
        .filter((it) => it.name.trim() || Number(it.price) > 0)
        .map((it) => ({
          id: it.id,
          name: it.name.trim() || 'Item',
          price: Number(it.price) || 0,
          quantity: Number(it.quantity) || 1,
        }));

      if (validItems.length > 0) {
        const itemsTotal = Math.round(validItems.reduce((sum, it) => sum + (it.price * it.quantity), 0) * 100) / 100;
        if (Math.abs(itemsTotal - parsedAmount) > 0.01) {
          setError(`Itemized breakdown total (₹${itemsTotal.toFixed(2)}) does not tally with total amount (₹${parsedAmount.toFixed(2)}). Please match the item prices or adjust the total.`);
          return;
        }
      }

      const updatedItem: TransactionItem = {
        ...transaction,
        type: mode,
        amount: parsedAmount,
        name: description.trim() || (mode === 'INCOME' ? 'Income' : resolvedCategory),
        category: resolvedCategory,
        accountId: selectedAccountId || undefined,
        items: validItems.length > 0 ? validItems : undefined,
      };

      onSuccess({
        type: 'update',
        data: updatedItem,
        originalId: transaction.id,
      });
      onClose();
      return;
    }

    // 2. Money Borrowed (Convert to Borrowed Loan)
    if (mode === 'BORROWED') {
      const person = personName.trim() || 'Lender';
      const subtext = description.trim() || 'Personal loan';
      const apiPayload = {
        personName: person,
        amount: parsedAmount,
        description: subtext,
        dueAt: dueAt || undefined,
        accountId: selectedAccountId || undefined,
      };
      const optimisticData: LoanItem = {
        id: `temp-loan-${Date.now()}`,
        kind: 'borrowed',
        personName: person,
        title: `You borrowed from ${person}`,
        subtext,
        amount: parsedAmount,
        paidAmount: 0,
        status: 'PENDING',
        statusLabel: 'Yet to pay',
        accountId: selectedAccountId || undefined,
        date: new Date().toISOString(),
        dueDate: dueAt || undefined,
      };

      onSuccess({
        type: 'convert_to_loan',
        originalId: transaction.id,
        loanData: {
          kind: 'borrowed',
          apiPayload,
          optimisticData,
        },
      });
      onClose();
      return;
    }

    // 3. Money Lent to Single Person
    if (mode === 'LENT') {
      const person = personName.trim() || 'Friend';
      const subtext = description.trim() || 'Money lent';
      const apiPayload = {
        personName: person,
        amount: parsedAmount,
        description: subtext,
        dueAt: dueAt || undefined,
        accountId: selectedAccountId || undefined,
      };
      const optimisticData: LoanItem = {
        id: `temp-loan-${Date.now()}`,
        kind: 'lent',
        personName: person,
        title: `You lent to ${person}`,
        subtext,
        amount: parsedAmount,
        paidAmount: 0,
        status: 'PENDING',
        statusLabel: 'Yet to receive',
        accountId: selectedAccountId || undefined,
        date: new Date().toISOString(),
        dueDate: dueAt || undefined,
      };

      onSuccess({
        type: 'convert_to_loan',
        originalId: transaction.id,
        loanData: {
          kind: 'lent',
          apiPayload,
          optimisticData,
        },
      });
      onClose();
      return;
    }

    // 4. Split Mode (Equal or Custom)
    if (splitType === 'EQUAL') {
      const friendsCount = peopleCount - 1;
      const lentEntries: Array<{ apiPayload: any; optimisticData: LoanItem }> = [];

      const itemTitle = description.trim() || resolvedCategory || 'Expense';
      const lentTitle = description.trim() || resolvedCategory || 'Split bill';

      for (let i = 0; i < friendsCount; i++) {
        const friend = equalFriendNames[i]?.trim() || `Friend ${i + 1}`;
        const tempId = `temp-split-${Date.now()}-${i}`;
        lentEntries.push({
          apiPayload: {
            personName: friend,
            amount: perPersonOwed,
            description: lentTitle,
            dueAt: dueAt || undefined,
            accountId: selectedAccountId || undefined,
          },
          optimisticData: {
            id: tempId,
            kind: 'lent',
            personName: friend,
            title: `You lent to ${friend}`,
            subtext: lentTitle,
            amount: perPersonOwed,
            paidAmount: 0,
            status: 'PENDING',
            statusLabel: 'Yet to receive',
            accountId: selectedAccountId || undefined,
            date: new Date().toISOString(),
            dueDate: dueAt || undefined,
          },
        });
      }

      const userShareTransaction = equalUserShare > 0 ? {
        apiPayload: {
          type: 'EXPENSE' as const,
          amount: equalUserShare,
          description: itemTitle,
          category: resolvedCategory,
          accountId: selectedAccountId || undefined,
        },
        optimisticData: {
          ...transaction,
          id: transaction.id,
          name: itemTitle,
          category: resolvedCategory,
          amount: equalUserShare,
          type: 'EXPENSE' as const,
          accountId: selectedAccountId || undefined,
        },
      } : undefined;

      onSuccess({
        type: 'convert_to_split',
        originalId: transaction.id,
        splitData: {
          userShareTransaction,
          lentEntries,
        },
      });
      onClose();
    } else {
      // Custom Split Mode
      const validPeople = customPeople
        .map((p, idx) => ({
          name: p.name.trim() || `Friend ${idx + 1}`,
          amount: parseFloat(p.amount) || 0,
        }))
        .filter((p) => p.amount > 0);

      if (validPeople.length === 0) {
        setError('Please add at least one friend with an amount greater than ₹0.');
        return;
      }

      if (customTotalLent > parsedAmount) {
        setError(`Total lent amount (${formatRupee(customTotalLent)}) cannot exceed bill amount (${formatRupee(parsedAmount)}).`);
        return;
      }

      const itemTitle = description.trim() || resolvedCategory || 'Expense';
      const lentTitle = description.trim() || resolvedCategory || 'Split bill';

      const lentEntries = validPeople.map((p, idx) => ({
        apiPayload: {
          personName: p.name,
          amount: p.amount,
          description: lentTitle,
          dueAt: dueAt || undefined,
          accountId: selectedAccountId || undefined,
        },
        optimisticData: {
          id: `temp-split-${Date.now()}-${idx}`,
          kind: 'lent' as const,
          personName: p.name,
          title: `You lent to ${p.name}`,
          subtext: lentTitle,
          amount: p.amount,
          paidAmount: 0,
          status: 'PENDING' as const,
          statusLabel: 'Yet to receive',
          accountId: selectedAccountId || undefined,
          date: new Date().toISOString(),
          dueDate: dueAt || undefined,
        },
      }));

      const userShareTransaction = customUserShare > 0 ? {
        apiPayload: {
          type: 'EXPENSE' as const,
          amount: customUserShare,
          description: itemTitle,
          category: resolvedCategory,
          accountId: selectedAccountId || undefined,
        },
        optimisticData: {
          ...transaction,
          id: transaction.id,
          name: itemTitle,
          category: resolvedCategory,
          amount: customUserShare,
          type: 'EXPENSE' as const,
          accountId: selectedAccountId || undefined,
        },
      } : undefined;

      onSuccess({
        type: 'convert_to_split',
        originalId: transaction.id,
        splitData: {
          userShareTransaction,
          lentEntries,
        },
      });
      onClose();
    }
  };

  const handleDelete = () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
      }
      deleteTimerRef.current = setTimeout(() => {
        setIsConfirmingDelete(false);
      }, 3500);
      return;
    }

    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
    }

    onSuccess({
      type: 'delete',
      originalId: transaction.id,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: mode === 'SPLIT' ? 520 : 460, maxHeight: '92vh', overflowY: 'auto' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <PencilEditIcon size={22} />
            <h3>Edit & Convert Transaction</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <LuX size={18} />
          </button>
        </div>

        {/* Five Mode Tabs */}
        <div className="modal-tabs" style={{ marginBottom: '1.25rem' }}>
          <button
            type="button"
            className={`modal-tab-btn ${mode === 'EXPENSE' ? 'active' : ''}`}
            onClick={() => setMode('EXPENSE')}
          >
            Expense
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${mode === 'INCOME' ? 'active' : ''}`}
            onClick={() => setMode('INCOME')}
          >
            Income
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${mode === 'LENT' ? 'active' : ''}`}
            onClick={() => setMode('LENT')}
          >
            Lent
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${mode === 'BORROWED' ? 'active' : ''}`}
            onClick={() => setMode('BORROWED')}
          >
            Borrowed
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${mode === 'SPLIT' ? 'active' : ''}`}
            onClick={() => setMode('SPLIT')}
          >
            Split
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Account Selector (Cash, SBI, HDFC, Wallets, etc.) */}
          {accounts.length > 0 && (
            <div className="form-group" style={{ marginBottom: '0.85rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <LuWallet size={14} color="var(--primary)" />
                <span>Account</span>
              </label>
              <CustomDropdown
                variant="form"
                value={selectedAccountId}
                onChange={setSelectedAccountId}
                options={accounts.map((acc) => ({
                  value: acc.aid || acc.id || '',
                  label: acc.name,
                  badge: acc.type,
                  sublabel: `${acc.accountNumber ? `•••• ${acc.accountNumber} • ` : ''}Balance: ${formatRupee(Number(acc.balance ?? acc.initialBalance ?? 0))}`,
                }))}
                icon={<LuWallet size={16} />}
                placeholder="Select an account"
                aria-label="Select account"
              />
            </div>
          )}
          {/* 1. LENT MODE (Single Person) */}
          {mode === 'LENT' && (
            <>
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #a7f3d0',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.65rem 0.85rem',
                  marginBottom: '1rem',
                  fontSize: '0.78rem',
                  color: '#065f46',
                  lineHeight: 1.4,
                }}
              >
                💡 <strong>Convert to Money Lent:</strong> This transaction will be moved to Loans & Settlements to track money you lent to a friend.
              </div>

              <div className="form-group">
                <label>Person / Friend Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul, Priya, Alex"
                  className="form-control"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Amount Lent (₹)</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  placeholder="0"
                  className="form-control"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Reason / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Dinner share, Movie ticket, Emergency..."
                  className="form-control"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Expected Due Date (Optional)</label>
                <input
                  type="date"
                  className="form-control"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                />
              </div>
            </>
          )}

          {/* 2. BORROWED MODE */}
          {mode === 'BORROWED' && (
            <>
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.65rem 0.85rem',
                  marginBottom: '1rem',
                  fontSize: '0.78rem',
                  color: '#991b1b',
                  lineHeight: 1.4,
                }}
              >
                💡 <strong>Convert to Borrowed Record:</strong> This transaction will be moved to Loans & Settlements to track money you owe to return.
              </div>

              <div className="form-group">
                <label>Lender / Person Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul, Mom, Bank"
                  className="form-control"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Amount Borrowed (₹)</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  placeholder="0"
                  className="form-control"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Reason / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Rent share, Trip advance..."
                  className="form-control"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Repayment Due Date (Optional)</label>
                <input
                  type="date"
                  className="form-control"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                />
              </div>
            </>
          )}

          {/* 3. SPLIT BILL MODE */}
          {mode === 'SPLIT' && (
            <>
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #a7f3d0',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.65rem 0.85rem',
                  marginBottom: '1rem',
                  fontSize: '0.78rem',
                  color: '#065f46',
                  lineHeight: 1.4,
                }}
              >
                💡 <strong>Split Transaction:</strong> Your personal share updates this expense, while friends' shares are automatically recorded as loans.
              </div>

              <div className="form-group">
                <label>Total Bill Amount (₹)</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  placeholder="0"
                  className="form-control"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Description / Place</label>
                <input
                  type="text"
                  placeholder="e.g. Team Dinner, Goa Airbnb..."
                  className="form-control"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <CategoryPicker value={category} onChange={setCategory} otherValue={otherCategory} onOtherChange={setOtherCategory} />
              </div>

              {/* Split Type Selector */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <button
                  type="button"
                  className="select-pill"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    fontSize: '0.78rem',
                    background: splitType === 'EQUAL' ? '#10b981' : '#ffffff',
                    color: splitType === 'EQUAL' ? '#ffffff' : '#334155',
                    borderColor: splitType === 'EQUAL' ? '#10b981' : '#cbd5e1',
                    fontWeight: 700,
                  }}
                  onClick={() => setSplitType('EQUAL')}
                >
                  <LuUsers size={14} style={{ display: 'inline', marginRight: '0.35rem' }} /> Equal Split
                </button>
                <button
                  type="button"
                  className="select-pill"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    fontSize: '0.78rem',
                    background: splitType === 'CUSTOM' ? '#10b981' : '#ffffff',
                    color: splitType === 'CUSTOM' ? '#ffffff' : '#334155',
                    borderColor: splitType === 'CUSTOM' ? '#10b981' : '#cbd5e1',
                    fontWeight: 700,
                  }}
                  onClick={() => setSplitType('CUSTOM')}
                >
                  <LuPenLine size={14} style={{ display: 'inline', marginRight: '0.35rem' }} /> Custom Split
                </button>
              </div>

              {splitType === 'EQUAL' ? (
                <>
                  <div style={{ marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065f46', margin: 0 }}>
                        People sharing bill (including you):
                      </label>
                      <span style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 700 }}>
                        You + {peopleCount - 1} {peopleCount - 1 === 1 ? 'Friend' : 'Friends'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {[2, 3, 4, 5, 6].map((num) => (
                        <button
                          key={num}
                          type="button"
                          className="select-pill"
                          style={{
                            flex: 1,
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                            padding: '0.35rem 0.2rem',
                            background: peopleCount === num ? '#047857' : '#ffffff',
                            color: peopleCount === num ? '#ffffff' : '#065f46',
                            borderColor: peopleCount === num ? '#047857' : '#6ee7b7',
                            fontWeight: 700,
                            minWidth: 0,
                          }}
                          onClick={() => handleSetPeopleCount(num)}
                        >
                          {num}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleSetPeopleCount(peopleCount - 1)}
                        disabled={peopleCount <= 2}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid #6ee7b7',
                          background: '#ffffff',
                          color: '#065f46',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: peopleCount <= 2 ? 'not-allowed' : 'pointer',
                          opacity: peopleCount <= 2 ? 0.5 : 1,
                          flexShrink: 0,
                        }}
                        title="Decrease people"
                      >
                        <MinusIcon size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetPeopleCount(peopleCount + 1)}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid #6ee7b7',
                          background: '#ffffff',
                          color: '#065f46',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                        title="Increase people"
                      >
                        <PlusIcon size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Friends' Names Input List */}
                  <div style={{ marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065f46', margin: 0 }}>
                        Friends' Names ({equalFriendNames.length} {equalFriendNames.length === 1 ? 'Friend' : 'Friends'}):
                      </label>
                      <button
                        type="button"
                        onClick={handleAddEqualFriend}
                        style={{
                          background: '#dcfce7',
                          border: '1px solid #86efac',
                          color: '#15803d',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <LuPlus size={13} /> Add Friend
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '160px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                      {equalFriendNames.map((name, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            background: '#ffffff',
                            padding: '0.4rem 0.55rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid #cbd5e1',
                            boxSizing: 'border-box',
                            width: '100%',
                          }}
                        >
                          <LuUser size={14} style={{ color: '#64748b', flexShrink: 0 }} />
                          <input
                            type="text"
                            placeholder={`Friend ${idx + 1} Name (e.g. Rahul)`}
                            className="form-control"
                            style={{ flex: 1, fontSize: '0.82rem', padding: '0.35rem 0.5rem', margin: 0, minWidth: 0 }}
                            value={name}
                            onChange={(e) => handleEqualFriendNameChange(idx, e.target.value)}
                          />
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#047857', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {formatRupee(perPersonOwed)}
                          </span>
                          {peopleCount > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveEqualFriend(idx)}
                              style={{
                                background: '#fee2e2',
                                border: 'none',
                                color: '#dc2626',
                                borderRadius: 'var(--radius-sm)',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                flexShrink: 0,
                              }}
                              title={`Remove Friend ${idx + 1}`}
                            >
                              <LuTrash2 size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065f46', margin: 0 }}>
                      People who owe you (Individual amounts):
                    </label>
                    <button
                      type="button"
                      onClick={handleAddPerson}
                      style={{
                        background: '#dcfce7',
                        border: '1px solid #86efac',
                        color: '#15803d',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <LuPlus size={13} /> Add Person
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '160px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                    {customPeople.map((person, index) => (
                      <div
                        key={person.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          background: '#ffffff',
                          padding: '0.4rem 0.55rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', color: '#64748b' }}>
                          <LuUser size={14} />
                        </div>
                        <input
                          type="text"
                          placeholder={`Friend ${index + 1} Name`}
                          className="form-control"
                          style={{ flex: 1.3, fontSize: '0.82rem', padding: '0.35rem 0.5rem', margin: 0 }}
                          value={person.name}
                          onChange={(e) => handlePersonChange(person.id, 'name', e.target.value)}
                        />
                        <div style={{ position: 'relative', flex: 1 }}>
                          <span style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>
                            ₹
                          </span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Amount"
                            className="form-control"
                            style={{ paddingLeft: '1.25rem', paddingRight: '0.4rem', fontSize: '0.82rem', paddingBlock: '0.35rem', margin: 0, fontWeight: 700 }}
                            value={person.amount}
                            onChange={(e) => handlePersonChange(person.id, 'amount', e.target.value)}
                          />
                        </div>
                        {customPeople.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePerson(person.id)}
                            style={{
                              background: '#fee2e2',
                              border: 'none',
                              color: '#dc2626',
                              borderRadius: 'var(--radius-sm)',
                              width: '24px',
                              height: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                            title="Remove person"
                          >
                            <LuTrash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Split Calculation Breakdown */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #6ee7b7',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.65rem 0.85rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Your Personal Expense</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#dc2626' }}>
                    {formatRupee(computedUserShare)}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Updated in Transactions</div>
                </div>

                <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '0.5rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    {splitType === 'EQUAL'
                      ? `Lent to ${peopleCount - 1} Friends`
                      : `Lent to ${customPeople.length} ${customPeople.length === 1 ? 'Person' : 'People'}`}
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#059669' }}>
                    {formatRupee(computedLentAmount)}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 600 }}>
                    {splitType === 'EQUAL'
                      ? `(${formatRupee(perPersonOwed)}/person) → Loans`
                      : `Added as ${customPeople.length} loan ${customPeople.length === 1 ? 'entry' : 'entries'}`}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 4. EXPENSE / INCOME MODE */}
          {(mode === 'EXPENSE' || mode === 'INCOME') && (
            <>
              {/* Amount input */}
              <div className="form-group">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  placeholder="0"
                  className="form-control"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label>Description / Merchant</label>
                <input
                  type="text"
                  placeholder="e.g. Starbucks, Grocery, Salary..."
                  className="form-control"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              {/* Category */}
              <div className="form-group" style={{ marginBottom: '0.65rem' }}>
                <label>Category</label>
                <CategoryPicker value={category} onChange={setCategory} otherValue={otherCategory} onOtherChange={setOtherCategory} />
              </div>

              {/* Receipt Breakdown / Line Items */}
              <div className="receipt-breakdown-card">
                <div
                  className="receipt-breakdown-header"
                  onClick={() => setShowBreakdown((prev) => !prev)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                    <div className="receipt-icon-badge">
                      <LuReceipt size={18} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          Receipt Breakdown
                        </span>
                        {items.length > 0 && (
                          <span style={{ fontSize: '0.72rem', color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '0.1rem 0.5rem', borderRadius: '9999px', fontWeight: 700 }}>
                            {items.length} {items.length === 1 ? 'item' : 'items'}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                        Itemized purchase products & prices
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    style={{
                      background: '#f1f5f9',
                      border: 'none',
                      color: 'var(--text-secondary, #475569)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      cursor: 'pointer',
                      padding: 0,
                      flexShrink: 0,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {showBreakdown ? <LuChevronUp size={16} /> : <LuChevronDown size={16} />}
                  </button>
                </div>

                {showBreakdown && (
                  <div style={{ marginTop: '0.85rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                    {items.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '0.75rem 0.5rem' }}>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 0.65rem 0' }}>
                          No itemized line items recorded yet.
                        </p>
                        <button
                          type="button"
                          className="btn-add-item-premium"
                          style={{ maxWidth: '240px', margin: '0 auto' }}
                          onClick={handleAddItem}
                        >
                          <LuPlus size={15} /> Add First Item
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                        <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.2rem' }}>
                          {items.map((item, idx) => (
                            <div key={item.id || idx} className="receipt-item-card">
                              <div className="receipt-item-main-row">
                                <input
                                  type="text"
                                  placeholder={`Item ${idx + 1} name (e.g. Milk, Cappuccino...)`}
                                  className="receipt-item-name-input"
                                  value={item.name}
                                  onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                                  autoFocus={idx === items.length - 1 && !item.name}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="receipt-delete-item-btn"
                                  title="Remove item"
                                >
                                  <LuTrash2 size={13} />
                                </button>
                              </div>

                              <div className="receipt-item-sub-row">
                                <div className="receipt-qty-box">
                                  <span className="receipt-label-tiny">Qty:</span>
                                  <input
                                    type="number"
                                    min="1"
                                    placeholder="1"
                                    className="receipt-item-qty-input"
                                    value={item.quantity ?? 1}
                                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                    title="Quantity"
                                  />
                                </div>

                                <div className="receipt-price-box">
                                  <span className="receipt-label-tiny">Price:</span>
                                  <div className="receipt-price-input-wrap">
                                    <span className="receipt-currency-prefix">₹</span>
                                    <input
                                      type="number"
                                      step="any"
                                      min="0"
                                      placeholder="0"
                                      className="receipt-item-price-input"
                                      value={item.price ?? ''}
                                      onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                                      title="Price per unit"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="receipt-line-total">
                                <span className="receipt-label-tiny">Item Total</span>
                                <span className="receipt-total-val">
                                  {formatRupee((Number(item.price) || 0) * (Number(item.quantity) || 1))}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px dashed #e2e8f0' }}>
                          <button
                            type="button"
                            className="btn-add-item-pill"
                            onClick={handleAddItem}
                          >
                            <LuPlus size={14} /> Add Line Item
                          </button>

                          {(() => {
                            const sum = Math.round(items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0) * 100) / 100;
                            const isMatch = Math.abs(sum - numericAmount) <= 0.01;
                            const diff = Math.round((numericAmount - sum) * 100) / 100;
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <span style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '9999px',
                                  background: isMatch ? '#ecfdf5' : '#fffbeb',
                                  color: isMatch ? '#047857' : '#b45309',
                                  border: `1px solid ${isMatch ? '#a7f3d0' : '#fde68a'}`,
                                }}>
                                  {isMatch ? `✓ Tallied (₹${sum.toFixed(2)})` : `⚠️ Items Total: ₹${sum.toFixed(2)} (${diff > 0 ? `₹${diff.toFixed(2)} left` : `₹${Math.abs(diff).toFixed(2)} over`})`}
                                </span>
                                {!isMatch && sum > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setAmount(String(sum))}
                                    style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      padding: '0.15rem 0.45rem',
                                      borderRadius: '6px',
                                      background: '#fef3c7',
                                      color: '#92400e',
                                      border: '1px solid #fcd34d',
                                      cursor: 'pointer',
                                    }}
                                    title="Set total transaction amount to match breakdown items"
                                  >
                                    Match
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {error && (
            <p style={{ color: 'var(--expense)', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button
              type="button"
              style={{
                padding: '0.75rem 1rem',
                background: isConfirmingDelete ? '#dc2626' : '#fee2e2',
                color: isConfirmingDelete ? '#ffffff' : '#dc2626',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s ease',
              }}
              onClick={handleDelete}
            >
              <TrashIcon size={16} />
              <span>{isConfirmingDelete ? 'Confirm Delete?' : 'Delete'}</span>
            </button>

            <button
              type="submit"
              className="btn-submit-primary"
              style={{
                flex: 1,
                margin: 0,
                background: mode === 'BORROWED' ? '#ef4444' : mode === 'LENT' || mode === 'SPLIT' ? '#047857' : 'var(--primary)',
              }}
            >
              {mode === 'EXPENSE' || mode === 'INCOME'
                ? 'Save Changes'
                : mode === 'BORROWED'
                  ? 'Convert to Borrowed'
                  : mode === 'SPLIT'
                    ? 'Split & Save Loans'
                    : 'Convert to Lent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
