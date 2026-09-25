import React, { useState } from 'react';
import { FaChartSimple } from 'react-icons/fa6';
import type { TransactionItem } from './RecentTransactions';

interface IncomeExpenseBarChartProps {
  transactions?: TransactionItem[];
}

export const IncomeExpenseBarChart: React.FC<IncomeExpenseBarChartProps> = React.memo(({
  transactions = [],
}) => {
  const [range, setRange] = useState('Last 6 Months');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Group transactions by month
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();

  // Determine number of months to display based on range
  const monthsCount = range === 'Last 3 Months' ? 3 : range === 'This Year' ? (now.getMonth() + 1) : 6;

  // Generate months list
  const monthlyData: { month: string; year: number; income: number; expenses: number }[] = [];
  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mName = monthNames[d.getMonth()];
    monthlyData.push({ month: mName, year: d.getFullYear(), income: 0, expenses: 0 });
  }

  // Aggregate user transactions into months
  let totalActivity = 0;
  transactions.forEach((t) => {
    const d = new Date(t.date);
    if (!isNaN(d.getTime())) {
      const mName = monthNames[d.getMonth()];
      const y = d.getFullYear();
      const entry = monthlyData.find((m) => m.month === mName && m.year === y);
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

  const activeItem = hoveredIdx !== null ? monthlyData[hoveredIdx] : null;

  return (
    <div className="dashboard-card income-expense-card">
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
          {/* Main Bar Chart Canvas */}
          <div className="bar-chart-canvas">
            {/* Background horizontal gridlines spanning 100% width */}
            <div className="bar-gridlines" aria-hidden="true">
              <div className="bar-gridline"><span className="gridline-val">₹{Math.round(maxVal).toLocaleString('en-IN')}</span></div>
              <div className="bar-gridline"><span className="gridline-val">₹{Math.round(maxVal / 2).toLocaleString('en-IN')}</span></div>
              <div className="bar-gridline"><span className="gridline-val">₹0</span></div>
            </div>

            {/* Bars container spanning 100% width */}
            <div className="bar-groups-container">
              {monthlyData.map((item, idx) => {
                const incomePct = item.income > 0 ? Math.min(100, (item.income / maxVal) * 100) : 0;
                const expensePct = item.expenses > 0 ? Math.min(100, (item.expenses / maxVal) * 100) : 0;
                const isHovered = hoveredIdx === idx;

                return (
                  <div
                    className={`bar-group ${isHovered ? 'hovered' : ''}`}
                    key={idx}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    <div className="bars-pair">
                      {/* Income bar */}
                      <div className="bar-track">
                        <div
                          className="bar-column bar-income"
                          style={{
                            height: `${incomePct > 0 ? Math.max(4, incomePct) : 0}%`,
                            opacity: item.income === 0 ? 0.15 : 1,
                          }}
                          title={`${item.month} Income: ₹${item.income.toLocaleString('en-IN')}`}
                        />
                      </div>
                      {/* Expense bar */}
                      <div className="bar-track">
                        <div
                          className="bar-column bar-expense"
                          style={{
                            height: `${expensePct > 0 ? Math.max(4, expensePct) : 0}%`,
                            opacity: item.expenses === 0 ? 0.15 : 1,
                          }}
                          title={`${item.month} Expenses: ₹${item.expenses.toLocaleString('en-IN')}`}
                        />
                      </div>
                    </div>
                    <span className="bar-month-label">{item.month}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hover info or chart legend */}
          <div className="bar-chart-legend">
            {activeItem ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{activeItem.month}:</span>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                  Income ₹{activeItem.income.toLocaleString('en-IN')}
                </span>
                <span style={{ color: '#ef4444', fontWeight: 700 }}>
                  Expense ₹{activeItem.expenses.toLocaleString('en-IN')}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  Net: {(activeItem.income - activeItem.expenses >= 0 ? '+' : '')}₹{(activeItem.income - activeItem.expenses).toLocaleString('en-IN')}
                </span>
              </div>
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
});
