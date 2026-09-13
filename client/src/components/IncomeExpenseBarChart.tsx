import React, { useState } from 'react';
import { FaChartSimple } from 'react-icons/fa6';
import type { TransactionItem } from './RecentTransactions';

interface IncomeExpenseBarChartProps {
  transactions?: TransactionItem[];
}

export const IncomeExpenseBarChart: React.FC<IncomeExpenseBarChartProps> = ({
  transactions = [],
}) => {
  const [range, setRange] = useState('Last 6 Months');
  const [hoveredBar, setHoveredBar] = useState<{ month: string; type: string; val: number } | null>(null);

  // Group transactions by month (last 6 months)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();

  // Generate last 6 months list
  const monthlyData: { month: string; income: number; expenses: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mName = monthNames[d.getMonth()];
    monthlyData.push({ month: mName, income: 0, expenses: 0 });
  }

  // Aggregate user transactions into months
  let totalActivity = 0;
  transactions.forEach((t) => {
    const d = new Date(t.date);
    if (!isNaN(d.getTime())) {
      const mName = monthNames[d.getMonth()];
      const entry = monthlyData.find((m) => m.month === mName);
      if (entry) {
        if (t.type === 'INCOME') entry.income += Number(t.amount);
        else entry.expenses += Number(t.amount);
        totalActivity += Number(t.amount);
      }
    }
  });

  const maxVal = Math.max(
    ...monthlyData.map((m) => Math.max(m.income, m.expenses)),
    1000
  );

  return (
    <div className="dashboard-card">
      <div className="card-header">
        <h3>Income vs Expenses</h3>
        <select className="select-pill" value={range} onChange={(e) => setRange(e.target.value)}>
          <option>Last 6 Months</option>
          <option>Last 3 Months</option>
          <option>This Year</option>
        </select>
      </div>

      {totalActivity === 0 ? (
        <div className="empty-data-state">
          <div className="empty-icon green">
            <FaChartSimple size={24} />
          </div>
          <h5>No monthly activity recorded</h5>
          <p>As you log incoming salary and daily expenses, your monthly cash flow comparison will appear here.</p>
        </div>
      ) : (
        <div className="bar-chart-wrap">
          <div className="bar-chart-canvas">
            {monthlyData.map((item, idx) => {
              const incomeHeight = item.income > 0 ? Math.max(6, (item.income / maxVal) * 125) : 0;
              const expenseHeight = item.expenses > 0 ? Math.max(6, (item.expenses / maxVal) * 125) : 0;

              return (
                <div className="bar-group" key={idx}>
                  <div className="bars-pair">
                    {/* Income bar */}
                    <div
                      className="bar-column bar-income"
                      style={{ height: `${incomeHeight}px`, opacity: incomeHeight === 0 ? 0.2 : 1 }}
                      onMouseEnter={() => setHoveredBar({ month: item.month, type: 'Income', val: item.income })}
                      onMouseLeave={() => setHoveredBar(null)}
                      title={`${item.month} Income: ₹${item.income.toLocaleString('en-IN')}`}
                    />
                    {/* Expense bar */}
                    <div
                      className="bar-column bar-expense"
                      style={{ height: `${expenseHeight}px`, opacity: expenseHeight === 0 ? 0.2 : 1 }}
                      onMouseEnter={() => setHoveredBar({ month: item.month, type: 'Expense', val: item.expenses })}
                      onMouseLeave={() => setHoveredBar(null)}
                      title={`${item.month} Expenses: ₹${item.expenses.toLocaleString('en-IN')}`}
                    />
                  </div>
                  <span className="bar-month-label">{item.month}</span>
                </div>
              );
            })}
          </div>

          {/* Hover info or chart legend */}
          <div className="bar-chart-legend">
            {hoveredBar ? (
              <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                {hoveredBar.month} {hoveredBar.type}: ₹{hoveredBar.val.toLocaleString('en-IN')}
              </span>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: 'var(--primary)' }}></span>
                  <span>Income</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#f87171' }}></span>
                  <span>Expenses</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
