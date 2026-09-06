import React, { useState } from 'react';
import { ChevronDownIcon } from './Icons';

const CATEGORY_OPTIONS = [
  { name: 'Food & Dining', icon: '🍽', tone: 'green' },
  { name: 'Shopping', icon: '🛍', tone: 'blue' },
  { name: 'Rent & Housing', icon: '⌂', tone: 'teal' },
  { name: 'Travel', icon: '✈', tone: 'amber' },
  { name: 'Utilities', icon: '⚡', tone: 'cyan' },
  { name: 'Entertainment', icon: '▶', tone: 'coral' },
  { name: 'Salary', icon: '₹', tone: 'emerald' },
  { name: 'General', icon: '•', tone: 'slate' },
  { name: 'Other', icon: '+', tone: 'indigo' },
];

interface CategoryPickerProps {
  value: string;
  onChange: (value: string) => void;
  otherValue?: string;
  onOtherChange?: (value: string) => void;
  options?: string[];
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({
  value,
  onChange,
  otherValue = '',
  onOtherChange,
  options,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const available = options?.length
    ? options.map((name) => ({ name, icon: name === 'Other' ? '+' : '•', tone: 'green' }))
    : CATEGORY_OPTIONS;

  const displayLabel = value === 'Other' && otherValue.trim()
    ? `Other (${otherValue.trim()})`
    : value || 'Choose a category';

  const handleConfirmOther = () => {
    if (onOtherChange) {
      if (!otherValue.trim()) {
        onOtherChange('Other');
      }
    }
    onChange('Other');
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className={`category-picker-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(true)}
      >
        <span className="category-picker-current">{displayLabel}</span>
        <span className="category-picker-chevron">
          <ChevronDownIcon size={16} />
        </span>
      </button>

      {isOpen && (
        <div className="category-picker-overlay" onClick={() => setIsOpen(false)}>
          <div className="category-picker-modal" onClick={(event) => event.stopPropagation()}>
            <div className="category-picker-header">
              <div>
                <p className="eyebrow">Organize your money</p>
                <h3>Select a category</h3>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setIsOpen(false)}>✕</button>
            </div>
            <div className="category-picker-grid">
              {available.map((category) => (
                <button
                  type="button"
                  key={category.name}
                  className={`category-picker-option ${value === category.name ? 'selected' : ''}`}
                  onClick={() => {
                    onChange(category.name);
                    if (category.name !== 'Other') setIsOpen(false);
                  }}
                >
                  <span className={`category-picker-icon ${category.tone}`}>{category.icon}</span>
                  <span>{category.name}</span>
                </button>
              ))}
            </div>

            {value === 'Other' && onOtherChange && (
              <div className="category-picker-other">
                <div className="category-other-header">
                  <label className="form-label" htmlFor="custom-category-name">
                    Custom category name
                  </label>
                  <span className="category-other-hint">Stored as Others</span>
                </div>
                <div className="category-other-input-row">
                  <input
                    id="custom-category-name"
                    className="form-control category-other-input"
                    value={otherValue}
                    onChange={(event) => onOtherChange(event.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConfirmOther();
                      }
                    }}
                    placeholder="e.g. Freelance, Gym, Netflix, Pet Care"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn-submit-primary category-other-submit"
                    onClick={handleConfirmOther}
                  >
                    Use Category
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
