import React, { useState, useEffect } from 'react';
import { PencilEditIcon, TrashIcon } from './Icons';
import type { TransactionItem } from './RecentTransactions';
import { apiFetch } from '../lib/api';

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
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setDescription(transaction.name || '');
      setCategory(transaction.category || 'Food & Dining');
      setError('');
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
            category,
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
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
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
            <select
              className="form-control"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>Food & Dining</option>
              <option>Shopping</option>
              <option>Rent & Housing</option>
              <option>Travel</option>
              <option>Utilities</option>
              <option>Entertainment</option>
              <option>Salary</option>
              <option>Others</option>
            </select>
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
                background: '#fee2e2',
                color: '#dc2626',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
              onClick={handleDelete}
              disabled={deleting || saving}
            >
              <TrashIcon size={16} />
              <span>{deleting ? 'Deleting...' : 'Delete'}</span>
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
