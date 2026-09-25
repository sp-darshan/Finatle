import React, { useState, useRef, useEffect, useId } from 'react';
import { LuChevronDown, LuCheck, LuSearch } from 'react-icons/lu';

export interface DropdownOption<T = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  sublabel?: string;
  description?: string;
  color?: string;
  disabled?: boolean;
}

export type RawOption<T = string> = string | DropdownOption<T>;

export interface CustomDropdownProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: RawOption<T>[];
  placeholder?: string;
  variant?: 'pill' | 'form' | 'compact' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
  style?: React.CSSProperties;
  dropdownStyle?: React.CSSProperties;
  align?: 'left' | 'right';
  id?: string;
  'aria-label'?: string;
}

export function CustomDropdown<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  variant = 'pill',
  size = 'md',
  icon,
  disabled = false,
  searchable,
  searchPlaceholder = 'Search...',
  className = '',
  style,
  dropdownStyle,
  align = 'left',
  id,
  'aria-label': ariaLabel,
}: CustomDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const dropdownId = id || generatedId;

  // Normalize options to DropdownOption format
  const normalizedOptions: DropdownOption<T>[] = options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt as unknown as T, label: opt };
    }
    return opt;
  });

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  // Filter options if searchable is enabled
  const isSearchActive = searchable || normalizedOptions.length > 8;
  const filteredOptions = isSearchActive
    ? normalizedOptions.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (opt.badge && opt.badge.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : normalizedOptions;

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && isSearchActive) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    if (isOpen) {
      const idx = filteredOptions.findIndex((o) => o.value === value);
      setFocusedIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, isSearchActive, value]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          const opt = filteredOptions[focusedIndex];
          if (!opt.disabled) {
            onChange(opt.value);
            setIsOpen(false);
            setSearchQuery('');
          }
        }
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchQuery('');
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`custom-dropdown-container variant-${variant} size-${size} ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''} ${className}`}
      style={style}
      id={dropdownId}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        type="button"
        className={`custom-dropdown-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || (selectedOption ? selectedOption.label : placeholder)}
      >
        <div className="custom-dropdown-trigger-content">
          {icon && <span className="custom-dropdown-leading-icon">{icon}</span>}
          {selectedOption?.icon && (
            <span className="custom-dropdown-option-icon">{selectedOption.icon}</span>
          )}
          <span className="custom-dropdown-label">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span
              className="custom-dropdown-badge-pill"
              style={selectedOption.badgeColor ? { background: selectedOption.badgeColor } : undefined}
            >
              {selectedOption.badge}
            </span>
          )}
        </div>
        <span className={`custom-dropdown-chevron ${isOpen ? 'open' : ''}`}>
          <LuChevronDown size={variant === 'compact' ? 13 : 15} />
        </span>
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          className={`custom-dropdown-menu align-${align} animate-dropdown-fade-in`}
          style={dropdownStyle}
          role="listbox"
        >
          {isSearchActive && (
            <div className="custom-dropdown-search-wrap">
              <LuSearch className="custom-dropdown-search-icon" size={14} />
              <input
                ref={searchInputRef}
                type="text"
                className="custom-dropdown-search-input"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          <div className="custom-dropdown-list" ref={listRef}>
            {filteredOptions.length === 0 ? (
              <div className="custom-dropdown-empty">No options found</div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isFocused = idx === focusedIndex;

                return (
                  <div
                    key={String(opt.value)}
                    role="option"
                    aria-selected={isSelected}
                    className={`custom-dropdown-item ${isSelected ? 'selected' : ''} ${isFocused ? 'focused' : ''} ${opt.disabled ? 'disabled' : ''}`}
                    onClick={() => {
                      if (!opt.disabled) {
                        onChange(opt.value);
                        setIsOpen(false);
                        setSearchQuery('');
                      }
                    }}
                    onMouseEnter={() => setFocusedIndex(idx)}
                  >
                    <div className="custom-dropdown-item-left">
                      {opt.icon && (
                        <span className="custom-dropdown-item-icon" style={opt.color ? { color: opt.color } : undefined}>
                          {opt.icon}
                        </span>
                      )}
                      <div className="custom-dropdown-item-text">
                        <div className="custom-dropdown-item-main">
                          <span className="custom-dropdown-item-label">{opt.label}</span>
                          {opt.badge && (
                            <span
                              className="custom-dropdown-item-badge"
                              style={opt.badgeColor ? { background: opt.badgeColor } : undefined}
                            >
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        {opt.sublabel && (
                          <span className="custom-dropdown-item-sublabel">{opt.sublabel}</span>
                        )}
                        {opt.description && (
                          <span className="custom-dropdown-item-desc">{opt.description}</span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <span className="custom-dropdown-check">
                        <LuCheck size={14} />
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
