import React, { useState, useEffect, useRef } from 'react';
import { PencilEditIcon, TrashIcon } from './Icons';
import { LuX } from 'react-icons/lu';
import type { TransactionItem } from './RecentTransactions';
import { CategoryPicker } from './CategoryPicker';

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionItem | null;
  token?: string | null;
  onSuccess: (action?: { type: 'update' | 'delete'; data?: TransactionItem; originalId?: string }) => void | Promise<void>;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onSuccess,
}) => {
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Dining');
  const [otherCategory, setOtherCategory] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setDescription(transaction.name);
      setCategory(transaction.category || 'Dining');
      setOtherCategory('');
      setError(null);
      setIsConfirmingDelete(false);
    }
  }, [transaction, isOpen]);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
      }
    };
  }, []);

  if (!isOpen || !transaction) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }

    const resolvedCategory = category === 'Other' && otherCategory.trim()
      ? otherCategory.trim()
      : category;

    const updatedItem: TransactionItem = {
      ...transaction,
      type,
      amount: parsedAmount,
      name: description || (type === 'INCOME' ? 'Income' : resolvedCategory),
      category: resolvedCategory,
    };

    onSuccess({
      type: 'update',
      data: updatedItem,
      originalId: transaction.id,
    });
    onClose();
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
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <PencilEditIcon size={22} />
            <h3>Edit Transaction</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <LuX size={18} />
          </button>
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
            >
              <TrashIcon size={16} />
              <span>{isConfirmingDelete ? 'Confirm Delete?' : 'Delete'}</span>
            </button>

            <button
              type="submit"
              className="btn-submit-primary"
              style={{ flex: 1, margin: 0 }}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
