import React, { useState, useEffect } from 'react';
import { PencilEditIcon, TrashIcon } from './Icons';
import type { LoanItem } from './LoansSettlements';
import { apiFetch } from '../lib/api';


interface EditLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: LoanItem | null;
  token: string | null;
  onSuccess: () => void;
}

export const EditLoanModal: React.FC<EditLoanModalProps> = ({
  isOpen,
  onClose,
  loan,
  token,
  onSuccess,
}) => {
  const [kind, setKind] = useState<'lent' | 'borrowed'>('lent');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('0');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'PENDING' | 'PAID' | 'PARTIAL'>('PENDING');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (loan) {
      setKind(loan.kind === 'borrowed' ? 'borrowed' : 'lent');
      setPersonName(loan.personName || '');
      setAmount(String(loan.amount || ''));
      setPaidAmount(String(loan.paidAmount !== undefined ? loan.paidAmount : (loan.status === 'PAID' ? loan.amount : 0)));
      setDescription(loan.subtext === 'Personal loan' ? '' : (loan.subtext || ''));
      setStatus(loan.status as any || 'PENDING');
      setError('');
    }
  }, [loan, isOpen]);

  if (!isOpen || !loan) return null;

  const totalNum = parseFloat(amount) || 0;
  const paidNum = parseFloat(paidAmount) || 0;
  const remainingNum = Math.max(0, totalNum - paidNum);

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

    if (!personName.trim()) {
      setError('Please enter the person or group name');
      setSaving(false);
      return;
    }

    const numericPaid = isNaN(paidNum) ? 0 : Math.max(0, Math.min(numericAmount, paidNum));
    const computedStatus = numericPaid >= numericAmount ? 'PAID' : numericPaid > 0 ? 'PARTIAL' : 'PENDING';

    try {
      if (token) {
        const res = await apiFetch(`/api/finance/loans/${loan.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            kind,
            personName: personName.trim(),
            amount: numericAmount,
            paidAmount: numericPaid,
            description: description.trim(),
            status: computedStatus,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update loan record');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error updating loan record');
    } finally {
      setSaving(false);
    }
  };

  const handleSetPaidPreset = (fraction: number) => {
    if (totalNum > 0) {
      const val = Math.round(totalNum * fraction);
      setPaidAmount(String(val));
      if (val >= totalNum) setStatus('PAID');
      else if (val > 0) setStatus('PARTIAL');
      else setStatus('PENDING');
    }
  };


  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this loan/split entry?')) return;
    setDeleting(true);
    setError('');

    try {
      if (token) {
        const res = await apiFetch(`/api/finance/loans/${loan.id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to delete loan');
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error deleting loan');
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
            <h3>Edit Loan / Settlement</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Kind tabs */}
        <div className="modal-tabs">
          <button
            type="button"
            className={`modal-tab-btn ${kind === 'lent' ? 'active' : ''}`}
            onClick={() => setKind('lent')}
          >
            Lent (Gave Money)
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${kind === 'borrowed' ? 'active' : ''}`}
            onClick={() => setKind('borrowed')}
          >
            Borrowed (You Owe)
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Person / Friend Name */}
          <div className="form-group">
            <label>Person / Contact Name</label>
            <input
              type="text"
              placeholder="e.g. Alex, Rahul, Roommates"
              className="form-control"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Total Amount input */}
          <div className="form-group">
            <label>Total Principal Amount (₹)</label>
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

          {/* Paid / Settled Amount (Partial Settlement) */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Amount Settled / Paid So Far (₹)</label>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: remainingNum > 0 ? '#dc2626' : '#059669' }}>
                Remaining: ₹{remainingNum.toLocaleString('en-IN')}
              </span>
            </div>
            <input
              type="number"
              step="any"
              min="0"
              max={amount || undefined}
              placeholder="0"
              className="form-control"
              value={paidAmount}
              onChange={(e) => {
                setPaidAmount(e.target.value);
                const p = parseFloat(e.target.value) || 0;
                if (totalNum > 0 && p >= totalNum) setStatus('PAID');
                else if (p > 0) setStatus('PARTIAL');
                else setStatus('PENDING');
              }}
            />
            {/* Quick Settle Presets */}
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem' }}>
              <button
                type="button"
                className="select-pill"
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}
                onClick={() => handleSetPaidPreset(0)}
              >
                ₹0 (Unpaid)
              </button>
              <button
                type="button"
                className="select-pill"
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}
                onClick={() => handleSetPaidPreset(0.5)}
              >
                50% (₹{Math.round(totalNum * 0.5).toLocaleString('en-IN')})
              </button>
              <button
                type="button"
                className="select-pill"
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem', background: '#d1fae5', color: '#047857', borderColor: '#6ee7b7' }}
                onClick={() => handleSetPaidPreset(1)}
              >
                100% (Full)
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label>Description / Reason</label>
            <input
              type="text"
              placeholder="e.g. Dinner split, Uber ride, House rent..."
              className="form-control"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Status Selection */}
          <div className="form-group">
            <label>Settlement Status</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
              <button
                type="button"
                className={`select-pill ${status === 'PENDING' ? 'active' : ''}`}
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  background: status === 'PENDING' ? '#fee2e2' : '#f8fafc',
                  color: status === 'PENDING' ? '#dc2626' : '#64748b',
                  borderColor: status === 'PENDING' ? '#fca5a5' : '#e2e8f0',
                  fontWeight: 700,
                }}
                onClick={() => handleSetPaidPreset(0)}
              >
                {kind === 'lent' ? 'Yet to receive' : 'Yet to pay'}
              </button>
              <button
                type="button"
                className={`select-pill ${status === 'PARTIAL' ? 'active' : ''}`}
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  background: status === 'PARTIAL' ? '#fef3c7' : '#f8fafc',
                  color: status === 'PARTIAL' ? '#b45309' : '#64748b',
                  borderColor: status === 'PARTIAL' ? '#fde68a' : '#e2e8f0',
                  fontWeight: 700,
                }}
                onClick={() => {
                  if (paidNum === 0 || paidNum >= totalNum) handleSetPaidPreset(0.5);
                  setStatus('PARTIAL');
                }}
              >
                Partial (Part Paid)
              </button>
              <button
                type="button"
                className={`select-pill ${status === 'PAID' ? 'active' : ''}`}
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  background: status === 'PAID' ? '#d1fae5' : '#f8fafc',
                  color: status === 'PAID' ? '#047857' : '#64748b',
                  borderColor: status === 'PAID' ? '#6ee7b7' : '#e2e8f0',
                  fontWeight: 700,
                }}
                onClick={() => handleSetPaidPreset(1)}
              >
                ✓ Fully Settled
              </button>
            </div>
          </div>


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
