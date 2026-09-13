import React from 'react';
import { CategoryBadge, PencilEditIcon } from './Icons';
import { LuReceipt, LuArrowRight } from 'react-icons/lu';

export interface TransactionItem {
  id: string;
  name: string;
  category: string;
  date: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
}

interface RecentTransactionsProps {
  transactions: TransactionItem[];
  limit?: number;
  onViewAll?: () => void;
  onAddTransaction?: () => void;
  onEditTransaction?: (transaction: TransactionItem) => void;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = React.memo(({
  transactions,
  limit,
  onViewAll,
  onAddTransaction,
  onEditTransaction,
}) => {
  const formatRupee = (amount: number) => {
    return `₹${Math.abs(amount).toLocaleString('en-IN')}`;
  };

  const maxItems = limit !== undefined ? limit : (onViewAll ? 5 : undefined);
  const displayedTransactions = maxItems ? transactions.slice(0, maxItems) : transactions;
  const remainingCount = maxItems ? Math.max(0, transactions.length - maxItems) : 0;

  return (
    <div className="dashboard-card">
      <div className="card-header">
        <h3>Recent Transactions</h3>
        {transactions.length > 0 && onViewAll && (
          <button className="view-all-btn" onClick={onViewAll}>
            View All
          </button>
        )}
      </div>

      <div className="transactions-list">
        {transactions.length === 0 ? (
          <div className="empty-data-state">
            <div className="empty-icon blue">
              <LuReceipt size={24} />
            </div>
            <h5>No transactions found</h5>
            <p>Your logged transactions from income and expenses will be listed here.</p>
            {onAddTransaction && (
              <button
                className="select-pill"
                style={{ marginTop: '0.5rem', background: 'var(--primary-50)', color: 'var(--primary-dark)', borderColor: 'var(--primary)' }}
                onClick={onAddTransaction}
              >
                + Add Transaction
              </button>
            )}
          </div>
        ) : (
          <>
            {displayedTransactions.map((t) => {
              const isIncome = t.type === 'INCOME';
              const cleanName = t.name ? t.name.replace(/\s*\((?:my share|custom split(?:\s+with\s+[^)]+)?|\d+\s+people split(?:\s*•\s*[^)]*)?|split bill)\)/gi, '').trim() : t.name;
              return (
                <div className="transaction-row" key={t.id}>
                  <div className="row-left">
                    <CategoryBadge name={cleanName} category={t.category} size={38} />
                    <div className="row-info">
                      <h4>{cleanName}</h4>
                      <p>{t.category ? `${t.category} • ` : ''}{t.date}</p>
                    </div>
                  </div>

                  <div className="row-right-transaction">
                    <span className={isIncome ? 'amount-positive' : 'amount-negative'}>
                      {isIncome ? `+ ${formatRupee(t.amount)}` : `- ${formatRupee(t.amount)}`}
                    </span>

                    {onEditTransaction && (
                      <button
                        className="edit-pencil-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTransaction(t);
                        }}
                        title="Edit Transaction"
                      >
                        <PencilEditIcon size={13} />
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
                  color: 'var(--primary-dark)',
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
