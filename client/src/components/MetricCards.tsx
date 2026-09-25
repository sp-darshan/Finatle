import React from 'react';
import {
  IncomeCardIcon,
  ExpenseCardIcon,
  SavingsCardIcon,
  SettlementsCardIcon,
} from './Icons';
import { formatRupee } from '../lib/formatters';

interface MetricCardsProps {
  income: number;
  expenses: number;
  savings: number;
  actualBalance: number;
  pendingSettlements: number;
  settlementDetails?: string;
  onCardClick?: (type: 'income' | 'expenses' | 'savings' | 'settlements') => void;
}

export const MetricCards: React.FC<MetricCardsProps> = React.memo(({
  income,
  expenses,
  savings,
  actualBalance,
  pendingSettlements,
  settlementDetails = '0 pending settlements',
  onCardClick,
}) => {

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

      {/* 3. Net Savings */}
      <div
        className="metric-card"
        onClick={() => onCardClick?.('savings')}
        style={{ cursor: onCardClick ? 'pointer' : 'default' }}
      >
        <div className="metric-card-top">
          <SavingsCardIcon size={24} />
          <span>Net Savings</span>
        </div>
        <div className="metric-card-value">
          {formatRupee(savings)}
        </div>
        <div className={`metric-card-badge ${actualBalance >= 0 ? 'positive' : 'expense'}`}>
          <span>
            Actual balance: {formatRupee(actualBalance)}
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
