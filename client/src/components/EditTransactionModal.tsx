import React, { useState, useEffect, useRef } from 'react';
import { PencilEditIcon, TrashIcon, MinusIcon, PlusIcon } from './Icons';
import { LuX, LuUsers, LuPenLine, LuPlus, LuTrash2, LuUser } from 'react-icons/lu';
import type { TransactionItem } from './RecentTransactions';
import type { LoanItem } from './LoansSettlements';
import { CategoryPicker } from './CategoryPicker';

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
  onSuccess,
}) => {
  const [mode, setMode] = useState<'EXPENSE' | 'INCOME' | 'LENT' | 'BORROWED' | 'SPLIT'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Dining');
  const [otherCategory, setOtherCategory] = useState('');
  const [personName, setPersonName] = useState('');
  const [dueAt, setDueAt] = useState('');

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
    }
  }, [transaction, isOpen]);

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
      const updatedItem: TransactionItem = {
        ...transaction,
        type: mode,
        amount: parsedAmount,
        name: description.trim() || (mode === 'INCOME' ? 'Income' : resolvedCategory),
        category: resolvedCategory,
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
        },
        optimisticData: {
          ...transaction,
          id: transaction.id,
          name: itemTitle,
          category: resolvedCategory,
          amount: equalUserShare,
          type: 'EXPENSE' as const,
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
        setError(`Total lent amount (₹${customTotalLent.toLocaleString('en-IN')}) cannot exceed bill amount (₹${parsedAmount.toLocaleString('en-IN')}).`);
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
        },
        optimisticData: {
          ...transaction,
          id: transaction.id,
          name: itemTitle,
          category: resolvedCategory,
          amount: customUserShare,
          type: 'EXPENSE' as const,
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
                            ₹{perPersonOwed.toLocaleString('en-IN')}
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
                    ₹{computedUserShare.toLocaleString('en-IN')}
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
                    ₹{computedLentAmount.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 600 }}>
                    {splitType === 'EQUAL'
                      ? `(₹${perPersonOwed}/person) → Loans`
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
              <div className="form-group">
                <label>Category</label>
                <CategoryPicker value={category} onChange={setCategory} otherValue={otherCategory} onOtherChange={setOtherCategory} />
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
