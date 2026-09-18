import React from 'react';
import { PencilEditIcon, UsersGroupIcon } from './Icons';
import { LuHandshake, LuArrowRight } from 'react-icons/lu';

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
  dueDate?: string | null;
}

interface LoansSettlementsProps {
  loans: LoanItem[];
  limit?: number;
  onViewAll?: () => void;
  onSettle?: (id: string, currentStatus: LoanItem['status']) => void;
  canSettle?: (loan: LoanItem) => boolean;
  onAddNew?: () => void;
  onEditLoan?: (loan: LoanItem) => void;
}

export const LoansSettlements: React.FC<LoansSettlementsProps> = React.memo(({
  loans,
  limit,
  onViewAll,
  onAddNew,
  onEditLoan,
}) => {
  const formatRupee = (val: number) => `₹${Math.round(val).toLocaleString('en-IN')}`;
  const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set';

  const maxItems = limit !== undefined ? limit : (onViewAll ? 5 : undefined);
  const displayedLoans = maxItems ? loans.slice(0, maxItems) : loans;
  const remainingCount = maxItems ? Math.max(0, loans.length - maxItems) : 0;

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
            <div className="empty-icon indigo">
              <LuHandshake size={24} />
            </div>
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
          <>
            {displayedLoans.map((item) => {
              const isLent = item.kind === 'lent';
              const isSplit = item.kind === 'split';
              const isSettled = item.status === 'PAID';
              const isPartial = item.status === 'PARTIAL';
              const paid = item.paidAmount || 0;
              const remaining = Math.max(0, item.amount - paid);
              const compactTitle = isSplit
                ? (item.personName || item.title || 'Group Split')
                : isLent
                ? (item.personName ? `To ${item.personName}` : item.title.replace(/^You lent to /i, 'To '))
                : (item.personName ? `From ${item.personName}` : item.title.replace(/^You borrowed from /i, 'From '));

              const cleanText = (val?: string) =>
                val ? val.replace(/\s*\((?:my share|custom split(?:\s+with\s+[^)]+)?|\d+\s+people split(?:\s*•\s*[^)]*)?|split bill)\)/gi, '').trim() : '';
              const cleanedSubtext = cleanText(item.subtext);

              return (
                <div
                  className="loan-row"
                  key={item.id}
                >
                  <div className="row-left">
                    <div
                      className={`loan-avatar ${item.kind}`}
                      title={item.kind.toUpperCase()}
                    >
                      {isSplit ? (
                        <UsersGroupIcon size={18} />
                      ) : (
                        <span>{item.personName.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="row-info">
                      <h4>{cleanText(compactTitle)}</h4>
                      {cleanedSubtext && <p className="loan-description">{cleanedSubtext}</p>}
                      <div className="loan-meta">
                        <span>{isLent ? 'Lent' : 'Borrowed'}: {formatDate(item.date)}</span>
                        <span>Due: {formatDate(item.dueDate || undefined)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="row-right-loan">
                    <span
                      className={
                        isLent || isSplit ? 'amount-positive' : 'amount-negative'
                      }
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
                        ? 'Settled'
                        : isPartial
                        ? `Part (₹${paid})`
                        : isLent
                        ? 'To get'
                        : isSplit
                        ? 'Split'
                        : 'To pay'}
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
            })}

            {remainingCount > 0 && onViewAll && (
              <button
                type="button"
                className="view-all-btn"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '0.65rem 1rem',
                  marginTop: '0.5rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--settle-text)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onClick={onViewAll}
              >
                <span>View More ({remainingCount} more)</span>
                <LuArrowRight size={14} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
});
