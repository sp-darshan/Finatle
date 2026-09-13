import React from 'react';
import { CategoryBadge, PencilEditIcon } from './Icons';
import { LuReceipt } from 'react-icons/lu';

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
  onViewAll?: () => void;
  onAddTransaction?: () => void;
  onEditTransaction?: (transaction: TransactionItem) => void;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactions,
  onViewAll,
  onAddTransaction,
  onEditTransaction,
}) => {
  const formatRupee = (amount: number) => {
    return `₹${Math.abs(amount).toLocaleString('en-IN')}`;
  };

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
          transactions.map((t) => {
            const isIncome = t.type === 'INCOME';
            return (
              <div className="transaction-row" key={t.id}>
                <div className="row-left">
                  <CategoryBadge name={t.name} category={t.category} size={38} />
                  <div className="row-info">
                    <h4>{t.name}</h4>
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
          })
        )}
      </div>
    </div>
  );
};
