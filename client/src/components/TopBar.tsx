import React, { useState, useRef, useEffect } from 'react';
import { SearchIcon, BellIcon, ChevronDownIcon, ScanBillIcon } from './Icons';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  user: { name?: string | null; email?: string } | null;
  onOpenAuth: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  onOpenScanner?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  searchQuery,
  onSearchChange,
  user,
  onOpenAuth,
  onOpenSettings,
  onLogout,
  onOpenScanner,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const getInitials = () => {
    if (!user) return 'US';
    const name = user.name || user.email || 'User';
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const displayName = user?.name ? `Hi, ${user.name.split(' ')[0]}` : user?.email ? `Hi, ${user.email.split('@')[0]}` : 'Sign In';

  return (
    <header className="top-bar">
      <div className="search-container">
        <SearchIcon size={18} />
        <input
          type="text"
          placeholder="Search transactions, categories, or people..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="top-actions">
        {/* Scan Bill Quick Action */}
        {onOpenScanner && (
          <button
            className="topbar-scan-btn"
            onClick={onOpenScanner}
            title="Scan Receipt"
          >
            <ScanBillIcon size={16} />
            <span>Scan Bill</span>
          </button>
        )}

        {/* Notification Bell */}
        <button className="icon-button" title="Notifications">
          <BellIcon size={18} />
          <span className="icon-badge-dot"></span>
        </button>

        {/* User profile dropdown */}
        <div ref={dropdownRef} className="topbar-profile-container" style={{ position: 'relative' }}>
          <button
            type="button"
            className={`user-profile-pill ${showDropdown ? 'active' : ''}`}
            onClick={() => {
              if (user) {
                setShowDropdown(!showDropdown);
              } else {
                onOpenAuth();
              }
            }}
          >
            <div className="user-avatar">{getInitials()}</div>
            <span className="user-name">{displayName}</span>
            <span
              className="user-profile-chevron"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            >
              <ChevronDownIcon size={14} />
            </span>
          </button>

          {showDropdown && user && (
            <div className="topbar-profile-dropdown">
              <div className="topbar-profile-header">
                <div className="topbar-profile-name">{user.name || user.email?.split('@')[0] || 'User Profile'}</div>
                <div className="topbar-profile-email">{user.email}</div>
              </div>
              <button
                type="button"
                className="topbar-dropdown-item"
                onClick={() => {
                  setShowDropdown(false);
                  onOpenSettings();
                }}
              >
                Settings
              </button>
              <button
                type="button"
                className="topbar-dropdown-item logout"
                onClick={() => {
                  setShowDropdown(false);
                  onLogout();
                }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
