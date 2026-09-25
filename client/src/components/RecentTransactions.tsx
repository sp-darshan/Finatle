import React, { useState } from 'react';
import { CategoryBadge, PencilEditIcon } from './Icons';
import { LuReceipt, LuChevronDown, LuChevronUp, LuShoppingBag } from 'react-icons/lu';
import { formatRupee } from '../lib/formatters';

export interface TransactionBreakdownItem {
  id?: string;
  name: string;
  price: number;
  quantity?: number;
}

export interface TransactionItem {
  id: string;
  name: string;
  category: string;
  date: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  accountId?: string | null;
  items?: TransactionBreakdownItem[];
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const maxItems = limit !== undefined ? limit : (onViewAll ? 5 : undefined);
  const displayedTransactions = maxItems ? transactions.slice(0, maxItems) : transactions;

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
              const hasItems = Array.isArray(t.items) && t.items.length > 0;
              const isExpanded = expandedId === t.id;

              return (
                <div
                  className={`transaction-card-wrapper ${isExpanded ? 'expanded' : ''}`}
                  key={t.id}
                >
                  <div
                    className={`transaction-row ${hasItems ? 'clickable' : ''}`}
                    onClick={() => hasItems && toggleExpand(t.id)}
                    title={hasItems ? 'Click to view receipt breakdown' : undefined}
                  >
                    <div className="row-left">
                      <CategoryBadge name={cleanName} category={t.category} size={38} />
                      <div className="row-info">
                        <div className="row-title-wrap">
                          <h4>{cleanName}</h4>
                          {hasItems && (
                            <span className="receipt-pill-badge" title="Scanned receipt items">
                              <LuReceipt size={10} />
                              {t.items!.length} {t.items!.length === 1 ? 'item' : 'items'}
                            </span>
                          )}
                        </div>
                        <p>{t.category ? `${t.category} • ` : ''}{t.date}</p>
                      </div>
                    </div>

                    <div className="row-right-transaction">
                      <span className={isIncome ? 'amount-positive' : 'amount-negative'}>
                        {isIncome ? `+ ${formatRupee(t.amount)}` : `- ${formatRupee(t.amount)}`}
                      </span>

                      {hasItems && (
                        <span
                          style={{
                            color: '#94a3b8',
                            display: 'inline-flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          {isExpanded ? <LuChevronUp size={16} /> : <LuChevronDown size={16} />}
                        </span>
                      )}

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

                  {/* ITEM BREAKDOWN ACCORDION */}
                  {hasItems && isExpanded && (
                    <div className="transaction-breakdown-container">
                      <div className="breakdown-header">
                        <h5>
                          <LuShoppingBag size={13} color="#059669" />
                          Receipt Breakdown
                        </h5>
                        <span>{t.items!.length} {t.items!.length === 1 ? 'Item' : 'Items'}</span>
                      </div>

                      <div className="breakdown-items-list">
                        {t.items!.map((item, idx) => (
                          <div className="breakdown-item-row" key={item.id || idx}>
                            <div className="breakdown-item-name" title={item.name}>
                              <span className="bullet">•</span>
                              <span className="item-name-text">{item.name}</span>
                              {item.quantity && item.quantity > 1 && (
                                <span className="breakdown-item-qty">×{item.quantity}</span>
                              )}
                            </div>
                            <span className="breakdown-item-price">
                              {formatRupee(item.price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
});
