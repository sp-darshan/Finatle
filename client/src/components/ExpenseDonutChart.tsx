import React, { useState, useMemo } from 'react';
import { FaChartPie } from 'react-icons/fa6';
import { formatRupee } from '../lib/formatters';
import { CustomDropdown } from './CustomDropdown';
import type { TransactionItem } from './RecentTransactions';

export interface CategoryExpense {
  name: string;
  percentage: number;
  color: string;
  amount: number;
}

interface ExpenseDonutChartProps {
  totalExpense?: number;
  categories?: CategoryExpense[];
  transactions?: TransactionItem[];
  defaultRange?: string;
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
  'Investments': '#10B981', // Emerald Mint
  'Investment': '#10B981',
  'Stocks': '#10B981',
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
  transactions,
  defaultRange = 'This Month',
}) => {
  const [timeRange, setTimeRange] = useState(defaultRange);

  const now = new Date();
  const currentMonthName = now.toLocaleDateString('en-US', { month: 'short' });
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthName = lastMonthDate.toLocaleDateString('en-US', { month: 'short' });
  const currentQ = Math.floor(now.getMonth() / 3) + 1;
  const currentYear = now.getFullYear();

  const timeRangeOptions = [
    { value: 'This Month', label: `This Month (${currentMonthName})` },
    { value: 'Last Month', label: `Last Month (${lastMonthName})` },
    { value: 'This Quarter', label: `This Quarter (Q${currentQ})` },
    { value: 'This Year', label: `This Year (${currentYear})` },
    { value: 'All Time', label: 'All Time' },
  ];

  const { resolvedTotal, resolvedCategories, periodLabel } = useMemo(() => {
    // If no transactions array is provided, fall back to props
    if (!transactions) {
      return {
        resolvedTotal: totalExpense,
        resolvedCategories: categories,
        periodLabel: 'Total Expenses',
      };
    }

    const currentDate = new Date();
    let start: Date | null = null;
    let end: Date | null = null;
    let label = 'Total Expenses';

    if (timeRange === 'This Month') {
      start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);
      label = `This Month (${currentMonthName})`;
    } else if (timeRange === 'Last Month') {
      start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0, 23, 59, 59, 999);
      label = `Last Month (${lastMonthName})`;
    } else if (timeRange === 'This Quarter') {
      const q = Math.floor(currentDate.getMonth() / 3);
      start = new Date(currentDate.getFullYear(), q * 3, 1, 0, 0, 0, 0);
      end = new Date(currentDate.getFullYear(), (q + 1) * 3, 0, 23, 59, 59, 999);
      label = `Q${q + 1} ${currentDate.getFullYear()}`;
    } else if (timeRange === 'This Year') {
      start = new Date(currentDate.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = new Date(currentDate.getFullYear(), 11, 31, 23, 59, 59, 999);
      label = `${currentDate.getFullYear()} Expenses`;
    } else {
      label = 'All Time Expenses';
    }

    const catMap: Record<string, number> = {};
    let periodTotal = 0;

    transactions.forEach((t) => {
      if (t.type !== 'EXPENSE') return;

      let txDate: Date | null = null;
      if ((t as any).occurredAt) {
        const d = new Date((t as any).occurredAt);
        if (!isNaN(d.getTime())) txDate = d;
      }
      if (!txDate && t.date) {
        const d = new Date(t.date);
        if (!isNaN(d.getTime())) txDate = d;
      }

      if (txDate) {
        if (start && txDate < start) return;
        if (end && txDate > end) return;
      }

      const rawCat = t.category;
      const cat = (!rawCat || rawCat === 'General') ? 'Groceries' : rawCat;
      const amt = Number(t.amount || 0);
      catMap[cat] = (catMap[cat] || 0) + amt;
      periodTotal += amt;
    });

    const computedCats: CategoryExpense[] = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: periodTotal > 0 ? Math.round((amount / periodTotal) * 1000) / 10 : 0,
        color: '',
      }));

    return {
      resolvedTotal: periodTotal,
      resolvedCategories: computedCats,
      periodLabel: label,
    };
  }, [transactions, timeRange, totalExpense, categories, currentMonthName, lastMonthName]);

  const radius = 75;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  const hasData = resolvedTotal > 0 && resolvedCategories.length > 0;

  // Assign distinct, contrasting opposite colors to every category
  const usedColors = new Set<string>();
  const categoriesWithColors = resolvedCategories.map((cat, idx) => {
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
          options={timeRangeOptions}
          aria-label="Filter expense time range"
        />
      </div>

      {!hasData ? (
        <div className="empty-data-state">
          <div className="empty-icon purple">
            <FaChartPie size={24} />
          </div>
          <h5>No expense records for {timeRange}</h5>
          <p>
            No expense transactions were recorded in {timeRange.toLowerCase()}.
            {timeRange !== 'All Time' ? ' Try selecting another period from the dropdown.' : ''}
          </p>
          {timeRange !== 'All Time' && (
            <button
              type="button"
              className="select-pill"
              style={{
                marginTop: '0.65rem',
                background: 'var(--primary-50, #f0fdf4)',
                color: 'var(--primary-dark, #047857)',
                borderColor: 'var(--primary, #047857)',
                cursor: 'pointer',
              }}
              onClick={() => setTimeRange('All Time')}
            >
              View All Time Expenses
            </button>
          )}
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
              {categoriesWithColors.map((cat, idx) => {
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
                    strokeLinecap={categoriesWithColors.length === 1 ? 'round' : 'butt'}
                    style={{ transition: 'stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease' }}
                  />
                );
              })}
            </svg>

            {/* Center text */}
            <div className="donut-center-text">
              <strong>{formatRupee(resolvedTotal)}</strong>
              <span>{periodLabel}</span>
            </div>
          </div>

          {/* Legend */}
          <div className="donut-legend">
            {categoriesWithColors.map((item, idx) => (
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
