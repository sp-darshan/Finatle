import React, { useState, useEffect, useRef } from 'react';
import { PencilEditIcon, TrashIcon } from './Icons';
import type { TransactionItem } from './RecentTransactions';
import { apiFetch } from '../lib/api';
import { CategoryPicker } from './CategoryPicker';

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionItem | null;
  token: string | null;
  onSuccess: () => void | Promise<void>;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction,
  token,
  onSuccess,
}) => {
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Food & Dining');
  const [otherCategory, setOtherCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setDescription(transaction.name || '');
      setCategory(transaction.category || 'Food & Dining');
      setOtherCategory(transaction.category && !['Food & Dining', 'Shopping', 'Rent & Housing', 'Travel', 'Utilities', 'Entertainment', 'Salary', 'General'].includes(transaction.category) ? transaction.category : '');
      setError('');
      setIsConfirmingDelete(false);
    }
  }, [transaction, isOpen]);

  if (!isOpen || !transaction) return null;

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
      if (token) {
        const selectedCategory = category === 'Other' ? otherCategory.trim() || 'Other' : category;
        const res = await apiFetch(`/api/finance/transactions/${transaction.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type,
            amount: numericAmount,
            description: description.trim(),
            category: selectedCategory,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update transaction');
      }

      await onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error updating transaction');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
      deleteTimeoutRef.current = setTimeout(() => {
        setIsConfirmingDelete(false);
      }, 4000);
      return;
    }

    if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
    setDeleting(true);
    setError('');

    try {
      if (token) {
        const res = await apiFetch(`/api/finance/transactions/${transaction.id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to delete transaction');
        }
      }

      await onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error deleting transaction');
    } finally {
      setDeleting(false);
      setIsConfirmingDelete(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <PencilEditIcon size={22} />
            <h3>Edit Transaction</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Type toggle */}
        <div className="modal-tabs">
          <button
            type="button"
            className={`modal-tab-btn ${type === 'EXPENSE' ? 'active' : ''}`}
            onClick={() => setType('EXPENSE')}
          >
            Expense
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${type === 'INCOME' ? 'active' : ''}`}
            onClick={() => setType('INCOME')}
          >
            Income
          </button>
        </div>

        <form onSubmit={handleSubmit}>
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

          {error && (
            <p style={{ color: 'var(--expense)', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
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
              disabled={deleting || saving}
            >
              <TrashIcon size={16} />
              <span>{deleting ? 'Deleting...' : isConfirmingDelete ? 'Confirm Delete?' : 'Delete'}</span>
            </button>

            <button
              type="submit"
              className="btn-submit-primary"
              style={{ flex: 1, margin: 0 }}
              disabled={saving || deleting}
            >
              {saving ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
