import React, { useState } from 'react';
import { FaChartPie } from 'react-icons/fa6';
import { formatRupee } from '../lib/formatters';
import { CustomDropdown } from './CustomDropdown';

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

export const CATEGORY_COLORS: Record<string, string> = {
  'Dining': '#10B981', // Emerald Green (160°)
  'Food & Dining': '#10B981',
  'Food': '#10B981',
  'Shopping': '#F97316', // Tangerine Orange (25°) - opposite blue/green
  'Rent': '#EC4899', // Hot Pink / Rose (330°)
  'Rent & Housing': '#EC4899',
  'Housing': '#EC4899',
  'Travel': '#8B5CF6', // Electric Purple (260°) - opposite yellow
  'Transport': '#8B5CF6',
  'Utilities': '#06B6D4', // Electric Cyan (190°) - opposite red
  'Entertainment': '#EAB308', // Sun Amber (45°) - opposite purple
  'Health': '#14B8A6', // Teal (175°)
  'Health & Fitness': '#14B8A6',
  'Gym': '#14B8A6',
  'Education': '#3B82F6', // Royal Blue (220°)
  'Medical': '#EF4444', // Crimson Red (0°)
  'Salary': '#059669', // Dark Mint
  'Groceries': '#8B5CF6', // Electric Purple
  'Grocery': '#8B5CF6',
  'General': '#8B5CF6', // Cool Slate / Groceries
  'Other': '#6366F1', // Indigo
  'Others': '#6366F1',
};

// High-contrast alternating opposite color wheel palette
export const OPPOSITE_PALETTE = [
  '#10B981', // Emerald Green
  '#F97316', // Tangerine Orange
  '#8B5CF6', // Vivid Purple
  '#EC4899', // Hot Pink
  '#06B6D4', // Electric Cyan
  '#EAB308', // Sun Amber
  '#3B82F6', // Royal Blue
  '#EF4444', // Crimson Red
  '#14B8A6', // Teal
  '#D946EF', // Fuchsia
  '#84CC16', // Lime Green
  '#6366F1', // Indigo
];

export const getCategoryColor = (name?: string, index = 0): string => {
  if (name) {
    const trimmed = name.trim();
    if (CATEGORY_COLORS[trimmed]) {
      return CATEGORY_COLORS[trimmed];
    }
    const matchKey = Object.keys(CATEGORY_COLORS).find(
      (k) => k.toLowerCase() === trimmed.toLowerCase()
    );
    if (matchKey) {
      return CATEGORY_COLORS[matchKey];
    }
  }
  return OPPOSITE_PALETTE[index % OPPOSITE_PALETTE.length];
};

export const ExpenseDonutChart: React.FC<ExpenseDonutChartProps> = React.memo(({
  totalExpense = 0,
  categories = [],
}) => {
  const [timeRange, setTimeRange] = useState('This Month');

  const radius = 75;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  const hasData = totalExpense > 0 && categories.length > 0;

  // Assign distinct, contrasting opposite colors to every category
  const usedColors = new Set<string>();
  const resolvedCategories = categories.map((cat, idx) => {
    let color = cat.color || getCategoryColor(cat.name, idx);
    if (usedColors.has(color)) {
      const fallback = OPPOSITE_PALETTE.find((c) => !usedColors.has(c)) || OPPOSITE_PALETTE[idx % OPPOSITE_PALETTE.length];
      color = fallback;
    }
    usedColors.add(color);
    return {
      ...cat,
      resolvedColor: color,
    };
  });

  return (
    <div className="dashboard-card expense-breakdown-card">
      <div className="card-header">
        <h3>Expense Breakdown</h3>
        <CustomDropdown
          variant="pill"
          size="sm"
          align="right"
          value={timeRange}
          onChange={setTimeRange}
          options={['This Month', 'Last Month', 'This Quarter', 'This Year']}
          aria-label="Filter expense time range"
        />
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
            <svg width="190" height="190" viewBox="0 0 190 190" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
              <circle
                cx="95"
                cy="95"
                r={radius}
                fill="transparent"
                stroke="#f1f5f9"
                strokeWidth="24"
              />
              {resolvedCategories.map((cat, idx) => {
                const rawLength = (cat.percentage / 100) * circumference;
                const arcLength = cat.percentage > 0 ? Math.max(8, rawLength) : 0;
                const strokeDasharray = `${arcLength} ${circumference}`;
                const strokeDashoffset = -cumulativeOffset;
                cumulativeOffset += rawLength;

                return (
                  <circle
                    key={idx}
                    cx="95"
                    cy="95"
                    r={radius}
                    fill="transparent"
                    stroke={cat.resolvedColor}
                    strokeWidth="24"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap={resolvedCategories.length === 1 ? 'round' : 'butt'}
                    style={{ transition: 'stroke-dasharray 0.5s ease' }}
                  />
                );
              })}
            </svg>

            {/* Center text */}
            <div className="donut-center-text">
              <strong>{formatRupee(totalExpense)}</strong>
              <span>Total Expenses</span>
            </div>
          </div>

          {/* Legend */}
          <div className="donut-legend">
            {resolvedCategories.map((item, idx) => (
              <div className="donut-legend-item" key={idx}>
                <div className="legend-left">
                  <span
                    className="legend-color-dot"
                    style={{ backgroundColor: item.resolvedColor }}
                  ></span>
                  <span className="legend-name" title={item.name}>{item.name}</span>
                </div>
                <div className="legend-right">
                  {item.amount > 0 && (
                    <span className="legend-amount">{formatRupee(item.amount)}</span>
                  )}
                  <span className="legend-pct">
                    {Number.isInteger(item.percentage) ? `${item.percentage}%` : `${item.percentage.toFixed(1)}%`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
