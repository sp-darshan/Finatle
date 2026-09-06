import React, { useState } from 'react';
import { apiFetch } from '../lib/api';
import { CategoryPicker } from './CategoryPicker';

export type RecordKind = 'expense' | 'income' | 'lent' | 'borrowed' | 'split';

interface AddRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialKind?: RecordKind;
  token: string | null;
  onSuccess: (newRecord?: any) => void | Promise<void>;
}

export const AddRecordModal: React.FC<AddRecordModalProps> = ({
  isOpen,
  onClose,
  initialKind = 'expense',
  token,
  onSuccess,
}) => {
  const [kind, setKind] = useState<RecordKind>(initialKind);
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Food & Dining');
  const [otherCategory, setOtherCategory] = useState('');
  const [personName, setPersonName] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [splitPeopleCount, setSplitPeopleCount] = useState('4');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Sync initialKind if changed
  React.useEffect(() => {
    setKind(initialKind);
  }, [initialKind]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      setSaving(false);
      return;
    }

    try {
      if (kind === 'expense' || kind === 'income') {
        const selectedCategory = category === 'Other' ? otherCategory.trim() || 'Other' : category;
        const payload = {
          type: kind === 'income' ? 'INCOME' : 'EXPENSE',
          amount: numericAmount,
          description: title.trim() || (kind === 'income' ? 'Income' : selectedCategory),
          category: selectedCategory,
        };

        if (token) {
          const res = await apiFetch('/api/finance/transactions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to save transaction');
        }

        await onSuccess({
          kind: 'transaction',
          data: {
            id: `t-${Date.now()}`,
            name: title.trim() || (kind === 'income' ? 'Salary' : category),
            category: selectedCategory,
            date: 'Just now',
            amount: numericAmount,
            type: kind === 'income' ? 'INCOME' : 'EXPENSE',
          },
        });
      } else if (kind === 'lent' || kind === 'borrowed') {
        const payload = {
          personName: personName.trim() || (kind === 'lent' ? 'Friend' : 'Lender'),
          amount: numericAmount,
          description: title.trim() || undefined,
          dueAt: dueAt || undefined,
        };

        if (token) {
          const res = await apiFetch(`/api/finance/${kind}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || `Failed to save ${kind} record`);
        }

        await onSuccess({
          kind,
          data: {
            id: `loan-${Date.now()}`,
            kind,
            personName: payload.personName,
            title: kind === 'lent' ? `You lent to ${payload.personName}` : `You borrowed from ${payload.personName}`,
            subtext: title.trim() || 'For personal expenses',
            amount: numericAmount,
            status: 'PENDING',
            date: 'Today',
          },
        });
      } else if (kind === 'split') {
        // Group split calculation
        const people = parseInt(splitPeopleCount) || 4;
        const yourShare = numericAmount / people;
        const othersOweYou = numericAmount - yourShare;

        onSuccess({
          kind: 'split',
          data: {
            id: `split-${Date.now()}`,
            kind: 'split',
            personName: 'Friends',
            title: title.trim() || 'Split with Friends',
            subtext: `${people} people • You paid ₹${numericAmount.toLocaleString('en-IN')}`,
            amount: othersOweYou,
            status: 'PENDING',
            statusLabel: "You'll get back",
            date: 'Today',
          },
        });
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Error creating record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add New Record</h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Tab switcher */}
        <div className="modal-tabs">
          <button
            type="button"
            className={`modal-tab-btn ${kind === 'expense' ? 'active' : ''}`}
            onClick={() => setKind('expense')}
          >
            Expense
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${kind === 'income' ? 'active' : ''}`}
            onClick={() => setKind('income')}
          >
            Income
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${kind === 'lent' ? 'active' : ''}`}
            onClick={() => setKind('lent')}
          >
            Lent
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${kind === 'borrowed' ? 'active' : ''}`}
            onClick={() => setKind('borrowed')}
          >
            Borrowed
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${kind === 'split' ? 'active' : ''}`}
            onClick={() => setKind('split')}
          >
            Split
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Amount input */}
          <div className="form-group">
            <label>Amount (₹)</label>
            <input
              type="number"
              step="any"
              min="1"
              placeholder="0"
              className="form-control"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Title / Description */}
          <div className="form-group">
            <label>
              {kind === 'expense'
                ? 'Description / Merchant'
                : kind === 'income'
                ? 'Source'
                : kind === 'split'
                ? 'Split Title (e.g. Goa Trip, Dinner)'
                : 'Reason / Note'}
            </label>
            <input
              type="text"
              placeholder={
                kind === 'expense'
                  ? 'Starbucks, Amazon, Zomato...'
                  : kind === 'income'
                  ? 'Salary, Client Payment...'
                  : kind === 'split'
                  ? 'Goa Trip, Concert Tickets...'
                  : 'For trip expenses, Concert tickets...'
              }
              className="form-control"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Category for Transactions */}
          {(kind === 'expense' || kind === 'income') && (
            <div className="form-group">
              <label>Category</label>
              <CategoryPicker value={category} onChange={setCategory} otherValue={otherCategory} onOtherChange={setOtherCategory} />
            </div>
          )}

          {/* Person Name for Lent / Borrowed */}
          {(kind === 'lent' || kind === 'borrowed') && (
            <div className="form-group">
              <label>{kind === 'lent' ? 'Who did you lend to?' : 'Who did you borrow from?'}</label>
              <input
                type="text"
                placeholder={kind === 'lent' ? 'e.g. Rohan' : 'e.g. Priya'}
                className="form-control"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                required
              />
            </div>
          )}

          {/* Due date for loans */}
          {(kind === 'lent' || kind === 'borrowed') && (
            <div className="form-group">
              <label>Due Date (Optional)</label>
              <input
                type="date"
                className="form-control"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
          )}

          {/* Group size for Split */}
          {kind === 'split' && (
            <div className="form-group">
              <label>Total Number of People (Including You)</label>
              <input
                type="number"
                min="2"
                max="50"
                className="form-control"
                value={splitPeopleCount}
                onChange={(e) => setSplitPeopleCount(e.target.value)}
                required
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                If you paid ₹{amount || '0'} for {splitPeopleCount || 4} people, each person's share is ₹
                {amount ? (parseFloat(amount) / (parseInt(splitPeopleCount) || 1)).toFixed(0) : '0'}. You'll get back ₹
                {amount
                  ? (
                      parseFloat(amount) -
                      parseFloat(amount) / (parseInt(splitPeopleCount) || 1)
                    ).toFixed(0)
                  : '0'}.
              </small>
            </div>
          )}

          {error && (
            <p style={{ color: 'var(--expense)', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-submit-primary"
            disabled={saving}
          >
            {saving ? 'Saving...' : `Save ${kind.charAt(0).toUpperCase() + kind.slice(1)}`}
          </button>
        </form>
      </div>
    </div>
  );
};
