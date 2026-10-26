import React from 'react';
import {
  IncomeCardIcon,
  ExpenseCardIcon,
  BalanceCardIcon,
  SettlementsCardIcon,
} from './Icons';
import { formatRupee } from '../lib/formatters';

interface MetricCardsProps {
  income: number;
  expenses: number;
  availableBalance?: number;
  savings?: number;
  actualBalance?: number;
  accountName?: string;
  pendingSettlements: number;
  settlementDetails?: string;
  onCardClick?: (type: 'income' | 'expenses' | 'savings' | 'balance' | 'settlements') => void;
}

export const MetricCards: React.FC<MetricCardsProps> = React.memo(({
  income,
  expenses,
  availableBalance,
  savings,
  accountName,
  pendingSettlements,
  settlementDetails = '0 pending settlements',
  onCardClick,
}) => {
  const currentBalance = availableBalance !== undefined ? availableBalance : (savings ?? 0);

  return (
    <section className="metrics-grid">
      {/* 1. Total Income */}
      <div
        className="metric-card"
        onClick={() => onCardClick?.('income')}
        style={{ cursor: onCardClick ? 'pointer' : 'default' }}
      >
        <div className="metric-card-top">
          <IncomeCardIcon size={24} />
          <span>Total Income</span>
        </div>
        <div className="metric-card-value">{formatRupee(income)}</div>
        <div className="metric-card-badge positive">
          <span>{income > 0 ? 'Recorded income' : 'No income recorded'}</span>
        </div>
      </div>

      {/* 2. Total Expenses */}
      <div
        className="metric-card"
        onClick={() => onCardClick?.('expenses')}
        style={{ cursor: onCardClick ? 'pointer' : 'default' }}
      >
        <div className="metric-card-top">
          <ExpenseCardIcon size={24} />
          <span>Total Expenses</span>
        </div>
        <div className="metric-card-value">{formatRupee(expenses)}</div>
        <div className="metric-card-badge expense">
          <span>{expenses > 0 ? 'Recorded expenses' : 'No expenses recorded'}</span>
        </div>
      </div>

      {/* 3. Available Balance in Current Account */}
      <div
        className="metric-card"
        onClick={() => {
          onCardClick?.('balance');
          onCardClick?.('savings');
        }}
        style={{ cursor: onCardClick ? 'pointer' : 'default' }}
      >
        <div className="metric-card-top">
          <BalanceCardIcon size={24} />
          <span>Available Balance</span>
        </div>
        <div className="metric-card-value">
          {formatRupee(currentBalance)}
        </div>
        <div className={`metric-card-badge ${currentBalance >= 0 ? 'positive' : 'expense'}`}>
          <span>
            {accountName ? `${accountName} • ` : ''}
            {currentBalance >= 0 ? 'Available funds' : 'Negative balance'}
          </span>
        </div>
      </div>

      {/* 4. Pending Settlements */}
      <div
        className="metric-card"
        onClick={() => onCardClick?.('settlements')}
        style={{ cursor: onCardClick ? 'pointer' : 'default' }}
      >
        <div className="metric-card-top">
          <SettlementsCardIcon size={24} />
          <span>Pending Settlements</span>
        </div>
        <div className="metric-card-value">{formatRupee(pendingSettlements)}</div>
        <div className="metric-card-badge settlement">
          <span>{settlementDetails}</span>
        </div>
      </div>
    </section>
  );
});
