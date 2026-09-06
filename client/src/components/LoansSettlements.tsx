import React from 'react';
import { PencilEditIcon, UsersGroupIcon } from './Icons';

export interface LoanItem {
  id: string;
  kind: 'lent' | 'borrowed' | 'split';
  personName: string;
  title: string;
  subtext: string;
  amount: number;
  paidAmount?: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL';
  statusLabel?: string;
  date?: string;
}

interface LoansSettlementsProps {
  loans: LoanItem[];
  onViewAll?: () => void;
  onSettle?: (id: string, currentStatus: LoanItem['status']) => void;
  canSettle?: (loan: LoanItem) => boolean;
  onAddNew?: () => void;
  onEditLoan?: (loan: LoanItem) => void;
}

export const LoansSettlements: React.FC<LoansSettlementsProps> = ({
  loans,
  onViewAll,
  onAddNew,
  onEditLoan,
}) => {
  const formatRupee = (val: number) => `₹${Math.round(val).toLocaleString('en-IN')}`;

  return (
    <div className="dashboard-card">
      <div className="card-header">
        <h3>Loans & Settlements</h3>
        {loans.length > 0 && onViewAll && (
          <button className="view-all-btn" onClick={onViewAll}>
            View All
          </button>
        )}
      </div>

      <div className="loans-list">
        {loans.length === 0 ? (
          <div className="empty-data-state">
            <div className="empty-icon">🤝</div>
            <h5>No pending settlements</h5>
            <p>Track money you lent to someone, borrowed from friends, or split on group trips.</p>
            {onAddNew && (
              <button
                className="select-pill"
                style={{ marginTop: '0.5rem', background: 'var(--settle-50)', color: 'var(--settle-text)', borderColor: 'var(--settle-indigo)' }}
                onClick={onAddNew}
              >
                + Add Loan or Split
              </button>
            )}
          </div>
        ) : (
          loans.map((item) => {
            const isLent = item.kind === 'lent';
            const isSplit = item.kind === 'split';
            const isSettled = item.status === 'PAID';
            const isPartial = item.status === 'PARTIAL';
            const paid = item.paidAmount || 0;
            const remaining = Math.max(0, item.amount - paid);
            return (
              <div className="loan-row" key={item.id}>
                <div className="row-left">
                  <div
                    className={`loan-avatar ${item.kind}`}
                    title={item.kind.toUpperCase()}
                  >
                    {isSplit ? (
                      <UsersGroupIcon size={20} />
                    ) : (
                      <span>{item.personName.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="row-info">
                    <h4>{item.title}</h4>
                    <p>
                      {isPartial
                        ? `₹${paid} paid • ₹${remaining} remaining`
                        : item.subtext}
                    </p>
                  </div>
                </div>

                <div className="row-right-loan">
                  <span
                    className={
                      isLent || isSplit ? 'amount-positive' : 'amount-negative'
                    }
                    style={{
                      color:
                        isLent || isSplit
                          ? 'var(--text-emerald)'
                          : 'var(--text-primary)',
                      fontWeight: 800,
                    }}
                  >
                    {formatRupee(isPartial ? remaining : item.amount)}
                  </span>

                  <span
                    className={`loan-status-btn ${
                      isSettled
                        ? 'settled'
                        : isPartial
                        ? 'partial'
                        : isLent || isSplit
                        ? 'to-receive'
                        : 'to-pay'
                    }`}
                  >
                    {isSettled
                      ? '✓ Settled'
                      : isPartial
                      ? `Part Paid (₹${paid})`
                      : item.statusLabel ||
                        (isLent
                          ? 'Yet to receive'
                          : isSplit
                          ? "You'll get"
                          : 'Yet to pay')}
                  </span>

                  {onEditLoan && (
                    <button
                      type="button"
                      className="edit-pencil-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditLoan(item);
                      }}
                      title="Edit Loan"
                    >
                      <PencilEditIcon size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};


