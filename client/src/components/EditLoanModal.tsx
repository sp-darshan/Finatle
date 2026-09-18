import React, { useState, useEffect, useRef } from 'react';
import { LuX, LuCheck } from 'react-icons/lu';
import { PencilEditIcon, TrashIcon } from './Icons';
import type { LoanItem } from './LoansSettlements';

interface EditLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: LoanItem | null;
  token?: string | null;
  onSuccess: (action?: { type: 'update' | 'delete'; data?: LoanItem; originalId?: string; apiPayload?: any }) => void | Promise<void>;
  onReacknowledgeLoan?: (loanId: string) => void;
}

export const EditLoanModal: React.FC<EditLoanModalProps> = ({
  isOpen,
  onClose,
  loan,
  onSuccess,
  onReacknowledgeLoan,
}) => {
  const [kind, setKind] = useState<'lent' | 'borrowed'>('lent');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('0');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [borrowerEmail, setBorrowerEmail] = useState('');
  const [reminderFrequencyDays, setReminderFrequencyDays] = useState('3');
  const [status, setStatus] = useState<'PENDING' | 'PAID' | 'PARTIAL'>('PENDING');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (loan) {
      setKind(loan.kind === 'borrowed' ? 'borrowed' : 'lent');
      setPersonName(loan.personName || '');
      setAmount(String(loan.amount || ''));
      setPaidAmount(String(loan.paidAmount !== undefined ? loan.paidAmount : (loan.status === 'PAID' ? loan.amount : 0)));
      setDescription(loan.subtext === 'Personal loan' ? '' : (loan.subtext || ''));
      setDueAt(loan.dueDate ? new Date(loan.dueDate).toISOString().split('T')[0] : '');
      setBorrowerEmail(loan.borrowerEmail || '');
      setReminderFrequencyDays(String(loan.reminderFrequencyDays || 3));
      setStatus(loan.status as any || 'PENDING');
      setError('');
      setIsConfirmingDelete(false);
    }
  }, [loan, isOpen]);

  if (!isOpen || !loan) return null;

  const totalNum = parseFloat(amount) || 0;
  const paidNum = parseFloat(paidAmount) || 0;
  const remainingNum = Math.max(0, totalNum - paidNum);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (!personName.trim()) {
      setError('Please enter the person or group name');
      return;
    }

    const numericPaid = isNaN(paidNum) ? 0 : Math.max(0, Math.min(numericAmount, paidNum));
    const computedStatus = numericPaid >= numericAmount ? 'PAID' : numericPaid > 0 ? 'PARTIAL' : 'PENDING';
    const email = kind === 'lent' ? borrowerEmail.trim() : undefined;
    const freq = kind === 'lent' && dueAt && email ? parseInt(reminderFrequencyDays) || 3 : undefined;

    const apiPayload = {
      kind,
      personName: personName.trim(),
      amount: numericAmount,
      paidAmount: numericPaid,
      description: description.trim(),
      dueAt: dueAt || undefined,
      borrowerEmail: email || undefined,
      reminderFrequencyDays: freq,
      status: computedStatus,
    };

    const optimisticData: LoanItem = {
      ...loan,
      kind,
      personName: personName.trim(),
      title: kind === 'lent' ? `You lent to ${personName.trim()}` : `You borrowed from ${personName.trim()}`,
      subtext: description.trim() || 'Personal loan',
      amount: numericAmount,
      paidAmount: numericPaid,
      status: computedStatus,
      statusLabel: computedStatus === 'PAID' ? 'Settled' : computedStatus === 'PARTIAL' ? `Part (₹${numericPaid})` : kind === 'lent' ? 'Yet to receive' : 'Yet to pay',
      dueDate: dueAt || undefined,
      borrowerEmail: email || undefined,
      reminderFrequencyDays: freq,
    };

    onSuccess({
      type: 'update',
      data: optimisticData,
      originalId: loan.id,
      apiPayload,
    });
    onClose();
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


  const handleDelete = () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
      deleteTimeoutRef.current = setTimeout(() => {
        setIsConfirmingDelete(false);
      }, 4000);
      return;
    }

    if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);

    onSuccess({
      type: 'delete',
      originalId: loan.id,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <PencilEditIcon size={22} />
            <h3>Edit Loan / Settlement</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <LuX size={18} />
          </button>
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
          {/* Claimed Paid Notification Banner */}
          {loan?.claimedPaid && (
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 0.9rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.6rem',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#065f46' }}>
                  ✓ Friend reported this loan as paid
                </div>
                <div style={{ fontSize: '0.74rem', color: '#047857', marginTop: '0.15rem' }}>
                  If received, select 100% Full below. If not received, dispute to resume email reminders.
                </div>
              </div>
              {onReacknowledgeLoan && (
                <button
                  type="button"
                  style={{
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: '1px solid #fca5a5',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    onReacknowledgeLoan(loan.id);
                    onClose();
                  }}
                  title="Mark as not received and send follow-up reminder emails"
                >
                  ⚠️ Not Received (Resend Mail)
                </button>
              )}
            </div>
          )}

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

          {/* Due date for loans */}
          <div className="form-group">
            <label>Due Date (Optional)</label>
            <input
              type="date"
              className="form-control"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>

          {/* Automated Email Reminder for Lent */}
          {kind === 'lent' && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', padding: '0.75rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ marginBottom: dueAt && borrowerEmail ? '0.5rem' : 0 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
                  Friend's Email ID (For automated overdue reminders)
                </label>
                <input
                  type="email"
                  placeholder="friend@example.com (optional)"
                  className="form-control"
                  value={borrowerEmail}
                  onChange={(e) => setBorrowerEmail(e.target.value)}
                  style={{ fontSize: '0.82rem' }}
                />
              </div>

              {dueAt && borrowerEmail && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065f46' }}>
                    Reminder Frequency After Due Date
                  </label>
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
                    {[
                      { days: '1', label: 'Daily' },
                      { days: '2', label: 'Every 2d' },
                      { days: '3', label: 'Every 3d' },
                      { days: '7', label: 'Weekly' },
                    ].map((opt) => (
                      <button
                        key={opt.days}
                        type="button"
                        className="select-pill"
                        style={{
                          flex: 1,
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          padding: '0.3rem 0.4rem',
                          background: reminderFrequencyDays === opt.days ? '#047857' : '#ffffff',
                          color: reminderFrequencyDays === opt.days ? '#ffffff' : '#334155',
                          borderColor: reminderFrequencyDays === opt.days ? '#047857' : '#cbd5e1',
                          fontWeight: 700,
                        }}
                        onClick={() => setReminderFrequencyDays(opt.days)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
                onClick={() => handleSetPaidPreset(1)}
              >
                <LuCheck size={14} /> Fully Settled
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
