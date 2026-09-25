import React, { useState } from 'react';
import { CategoryPicker } from './CategoryPicker';
import { CategoryBadge, TrashIcon, PencilEditIcon } from './Icons';
import { LuTarget, LuCircleAlert } from 'react-icons/lu';
import { formatRupee } from '../lib/formatters';

export interface BudgetLimit {
  category: string;
  limit: number;
  period?: string;
}

interface BudgetManagerProps {
  categories?: string[];
  spending: Record<string, number>;
  budgets: BudgetLimit[];
  onSave: (budget: BudgetLimit) => void;
  onDelete: (category: string) => void;
}

const STANDARD_CATEGORIES = [
  'Dining',
  'Shopping',
  'Rent',
  'Travel',
  'Utilities',
  'Entertainment',
  'Health',
  'Salary',
  'Groceries',
];

export const BudgetManager: React.FC<BudgetManagerProps> = ({
  spending,
  budgets,
  onSave,
  onDelete,
}) => {
  const [category, setCategory] = useState('Dining');
  const [otherCategory, setOtherCategory] = useState('');
  const [limit, setLimit] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  const handleStartEdit = (budget: BudgetLimit) => {
    setEditingCategory(budget.category);
    if (STANDARD_CATEGORIES.includes(budget.category)) {
      setCategory(budget.category);
      setOtherCategory('');
    } else {
      setCategory('Other');
      setOtherCategory(budget.category === 'Other' ? '' : budget.category);
    }
    setLimit(String(budget.limit));

    // Smooth scroll to top of budget manager if needed
    const formEl = document.querySelector('.budget-form');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setCategory('Dining');
    setOtherCategory('');
    setLimit('');
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const numericLimit = parseFloat(limit);
    if (!category || isNaN(numericLimit) || numericLimit <= 0) return;
    const finalCategory = category === 'Other' ? otherCategory.trim() || 'Other' : category;

    // If editing and the category was renamed, delete old category first
    if (editingCategory && editingCategory.toLowerCase() !== finalCategory.toLowerCase()) {
      onDelete(editingCategory);
    }

    onSave({ category: finalCategory, limit: numericLimit });

    // Automatically advance to the next category that doesn't have a budget yet
    const existingCats = new Set([...budgets.map((b) => b.category.toLowerCase()), finalCategory.toLowerCase()]);
    if (editingCategory) {
      existingCats.delete(editingCategory.toLowerCase());
    }
    const nextUnset = STANDARD_CATEGORIES.find((c) => !existingCats.has(c.toLowerCase())) || 'Dining';

    setEditingCategory(null);
    setCategory(nextUnset);
    setOtherCategory('');
    setLimit('');
  };

  return (
    <div className="budget-manager">
      <form className="budget-form" onSubmit={submit}>
        <div className="budget-form-field">
          <label className="form-label">
            {editingCategory ? `Edit Category (${editingCategory})` : 'Category'}
          </label>
          <CategoryPicker
            value={category}
            onChange={setCategory}
            otherValue={otherCategory}
            onOtherChange={setOtherCategory}
          />
        </div>

        <div className="budget-form-field">
          <label className="form-label">Monthly Budget Limit (₹)</label>
          <input
            className="form-control budget-money-input"
            type="number"
            step="any"
            min="0.01"
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            placeholder="e.g. 5,000"
            required
            autoFocus={!!editingCategory}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {editingCategory && (
            <button
              type="button"
              className="budget-cancel-btn"
              onClick={handleCancelEdit}
            >
              Cancel
            </button>
          )}
          <button className="btn-submit-primary budget-save-btn" type="submit">
            {editingCategory ? 'Update Budget' : 'Set Limit'}
          </button>
        </div>
      </form>

      {!budgets.length ? (
        <div className="empty-data-state" style={{ padding: '2rem 1rem' }}>
          <div className="empty-icon amber">
            <LuTarget size={24} />
          </div>
          <h5>No category budgets set</h5>
          <p>Choose a category above and set a monthly spending cap to stay on track.</p>
        </div>
      ) : (
        <div className="budget-list">
          {budgets.map((budget) => {
            const spent = spending[budget.category] || 0;
            const percentage = Math.min(100, Math.round((spent / budget.limit) * 100));
            const exceeded = spent > budget.limit;
            const remaining = Math.max(0, budget.limit - spent);
            const isCurrentlyEditing = editingCategory === budget.category;

            return (
              <div
                className={`budget-item ${isCurrentlyEditing ? 'is-editing' : ''}`}
                key={budget.category}
              >
                <div className="budget-item-heading">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <CategoryBadge category={budget.category} size={34} />
                    <div>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {budget.category}
                      </strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {percentage}% spent
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '0.92rem',
                        color: exceeded ? 'var(--expense)' : 'var(--text-primary)',
                      }}
                    >
                      {formatRupee(spent)} / {formatRupee(budget.limit)}
                    </span>
                  </div>
                </div>

                <div className="budget-progress">
                  <div
                    className={`budget-progress-fill ${exceeded ? 'exceeded' : ''}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="budget-item-footer">
                  <small style={{ fontWeight: 600, color: exceeded ? '#dc2626' : 'var(--text-secondary)' }}>
                    {exceeded ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <LuCircleAlert size={14} /> Monthly limit exceeded
                      </span>
                    ) : (
                      `${formatRupee(remaining)} remaining`
                    )}
                  </small>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="budget-edit-btn"
                      onClick={() => handleStartEdit(budget)}
                      title="Edit Budget Limit"
                    >
                      <PencilEditIcon size={12} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      className="budget-remove-btn"
                      onClick={() => onDelete(budget.category)}
                      title="Remove Budget"
                    >
                      <TrashIcon size={12} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
