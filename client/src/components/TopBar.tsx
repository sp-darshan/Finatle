import React, { useState } from 'react';
import { SearchIcon, BellIcon, ChevronDownIcon } from './Icons';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  user: { name?: string | null; email?: string } | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  searchQuery,
  onSearchChange,
  user,
  onOpenAuth,
  onLogout,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

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
        {/* Notification Bell */}
        <button className="icon-button" title="Notifications">
          <BellIcon size={18} />
          <span className="icon-badge-dot"></span>
        </button>

        {/* User profile dropdown */}
        <div style={{ position: 'relative' }}>
          <div
            className="user-profile-pill"
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
            <ChevronDownIcon size={14} />
          </div>

          {showDropdown && user && (
            <div
              style={{
                position: 'absolute',
                top: '120%',
                right: 0,
                background: '#fff',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-hover)',
                padding: '0.5rem',
                minWidth: '170px',
                zIndex: 60,
              }}
            >
              <div style={{ padding: '0.4rem 0.6rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {user.email}
              </div>
              <button
                onClick={() => {
                  setShowDropdown(false);
                  onLogout();
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.6rem',
                  border: 'none',
                  background: '#fef2f2',
                  color: '#ef4444',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
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
