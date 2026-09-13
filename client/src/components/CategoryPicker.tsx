import React, { useState } from 'react';
import { ChevronDownIcon } from './Icons';
import {
  LuUtensils,
  LuShoppingBag,
  LuPlane,
  LuZap,
  LuFilm,
  LuTrendingUp,
  LuFolder,
  LuPlus,
  LuDumbbell,
  LuGraduationCap,
  LuHeartPulse,
  LuX,
} from 'react-icons/lu';
import { FaHouse } from 'react-icons/fa6';

const CATEGORY_OPTIONS: {
  name: string;
  icon: React.ComponentType<{ size?: number }>;
  tone: string;
}[] = [
  { name: 'Food & Dining', icon: LuUtensils, tone: 'green' },
  { name: 'Shopping', icon: LuShoppingBag, tone: 'blue' },
  { name: 'Rent & Housing', icon: FaHouse, tone: 'teal' },
  { name: 'Travel', icon: LuPlane, tone: 'amber' },
  { name: 'Utilities', icon: LuZap, tone: 'cyan' },
  { name: 'Entertainment', icon: LuFilm, tone: 'coral' },
  { name: 'Salary', icon: LuTrendingUp, tone: 'emerald' },
  { name: 'Health & Fitness', icon: LuDumbbell, tone: 'emerald' },
  { name: 'Education', icon: LuGraduationCap, tone: 'indigo' },
  { name: 'Medical', icon: LuHeartPulse, tone: 'coral' },
  { name: 'General', icon: LuFolder, tone: 'slate' },
  { name: 'Other', icon: LuPlus, tone: 'indigo' },
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
    ? options.map((name) => {
        const found = CATEGORY_OPTIONS.find((c) => c.name.toLowerCase() === name.toLowerCase());
        return found || { name, icon: name === 'Other' ? LuPlus : LuFolder, tone: 'green' };
      })
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
              <button type="button" className="modal-close-btn" onClick={() => setIsOpen(false)} aria-label="Close category picker">
                <LuX size={18} />
              </button>
            </div>
            <div className="category-picker-grid">
              {available.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    type="button"
                    key={category.name}
                    className={`category-picker-option ${value === category.name ? 'selected' : ''}`}
                    onClick={() => {
                      onChange(category.name);
                      if (category.name !== 'Other') setIsOpen(false);
                    }}
                  >
                    <span className={`category-picker-icon ${category.tone}`}>
                      <Icon size={18} />
                    </span>
                    <span>{category.name}</span>
                  </button>
                );
              })}
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
