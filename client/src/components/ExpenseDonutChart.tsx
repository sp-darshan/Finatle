import React, { useState } from 'react';
import { FaChartPie } from 'react-icons/fa6';

export interface CategoryExpense {
  name: string;
  percentage: number;
  color: string;
  amount: number;
}

interface ExpenseDonutChartProps {
  totalExpense: number;
  categories?: CategoryExpense[];
}

const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': '#10B981',
  'Food': '#10B981',
  'Shopping': '#FB923C',
  'Rent & Housing': '#F59E0B',
  'Housing': '#F59E0B',
  'Travel': '#A855F7',
  'Transport': '#A855F7',
  'Utilities': '#06B6D4',
  'Entertainment': '#EC4899',
  'Salary': '#059669',
  'General': '#94A3B8',
  'Others': '#94A3B8',
};

export const ExpenseDonutChart: React.FC<ExpenseDonutChartProps> = ({
  totalExpense = 0,
  categories = [],
}) => {
  const [timeRange, setTimeRange] = useState('This Month');

  const radius = 65;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  const hasData = totalExpense > 0 && categories.length > 0;

  return (
    <div className="dashboard-card">
      <div className="card-header">
        <h3>Expense Breakdown</h3>
        <select
          className="select-pill"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
        >
          <option>This Month</option>
          <option>Last Month</option>
          <option>This Quarter</option>
          <option>This Year</option>
        </select>
      </div>

      {!hasData ? (
        <div className="empty-data-state">
          <div className="empty-icon purple">
            <FaChartPie size={24} />
          </div>
          <h5>No expense records found</h5>
          <p>Add your first expense transaction to view category distribution and breakdown percentages.</p>
        </div>
      ) : (
        <div className="donut-container">
          {/* Donut Graphic */}
          <div className="donut-svg-wrap">
            <svg width="170" height="170" viewBox="0 0 170 170" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="85"
                cy="85"
                r={radius}
                fill="transparent"
                stroke="#f1f5f9"
                strokeWidth="22"
              />
              {categories.map((cat, idx) => {
                const rawLength = (cat.percentage / 100) * circumference;
                const arcLength = cat.percentage > 0 ? Math.max(8, rawLength) : 0;
                const strokeDasharray = `${arcLength} ${circumference}`;
                const strokeDashoffset = -cumulativeOffset;
                cumulativeOffset += rawLength;

                return (
                  <circle
                    key={idx}
                    cx="85"
                    cy="85"
                    r={radius}
                    fill="transparent"
                    stroke={cat.color || CATEGORY_COLORS[cat.name] || '#94A3B8'}
                    strokeWidth="22"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap={categories.length === 1 ? 'round' : 'butt'}
                    style={{ transition: 'stroke-dasharray 0.5s ease' }}
                  />
                );
              })}
            </svg>

            {/* Center text */}
            <div className="donut-center-text">
              <strong>₹{Math.round(totalExpense).toLocaleString('en-IN')}</strong>
              <span>Total Expenses</span>
            </div>
          </div>

          {/* Legend */}
          <div className="donut-legend">
            {categories.map((item, idx) => (
              <div className="donut-legend-item" key={idx}>
                <div className="legend-left">
                  <span
                    className="legend-color-dot"
                    style={{ backgroundColor: item.color || CATEGORY_COLORS[item.name] || '#94A3B8' }}
                  ></span>
                  <span>{item.name}</span>
                </div>
                <span className="legend-pct">
                  {Number.isInteger(item.percentage) ? `${item.percentage}%` : `${item.percentage.toFixed(2)}%`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
