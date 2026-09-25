import React, { useState, useRef, useEffect } from 'react';
import { SearchIcon, BellIcon, ChevronDownIcon, ScanBillIcon } from './Icons';
import { LuWallet, LuPlus } from 'react-icons/lu';
import { formatRupee } from '../lib/formatters';
import type { AccountItem } from '../types/account.types';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  user: { name?: string | null; email?: string } | null;
  onOpenAuth: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  onOpenScanner?: () => void;
  accounts?: AccountItem[];
  selectedAccountId?: string | 'ALL';
  onSelectAccount?: (id: string | 'ALL') => void;
  onOpenAddAccount?: () => void;
}

export const TopBar: React.FC<TopBarProps> = React.memo(({
  searchQuery,
  onSearchChange,
  user,
  onOpenAuth,
  onOpenSettings,
  onLogout,
  onOpenScanner,
  accounts = [],
  selectedAccountId = 'ALL',
  onSelectAccount,
  onOpenAddAccount,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setShowAccountMenu(false);
      }
    };
    if (showDropdown || showAccountMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown, showAccountMenu]);

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
        {/* Active Account Switcher Chip in TopBar */}
        {accounts.length > 0 && onSelectAccount && (
          <div ref={accountMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="mobile-account-selector-pill"
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              style={{ cursor: 'pointer' }}
            >
              <LuWallet size={14} color="var(--primary)" />
              <span>
                {selectedAccountId === 'ALL'
                  ? 'All Accounts'
                  : accounts.find((a) => (a.aid || a.id) === selectedAccountId)?.name || 'Account'}
              </span>
              <ChevronDownIcon size={13} />
            </button>

            {showAccountMenu && (
              <div
                className="topbar-profile-dropdown"
                style={{ width: 220, right: 0, left: 'auto', padding: '0.4rem' }}
              >
                <div
                  className={`sidebar-account-row ${selectedAccountId === 'ALL' ? 'active' : ''}`}
                  onClick={() => {
                    onSelectAccount('ALL');
                    setShowAccountMenu(false);
                  }}
                  style={{ padding: '0.45rem 0.6rem', borderRadius: 6 }}
                >
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>All Accounts</span>
                </div>
                {accounts.map((a) => (
                  <div
                    key={a.aid || a.id}
                    className={`sidebar-account-row ${selectedAccountId === (a.aid || a.id) ? 'active' : ''}`}
                    onClick={() => {
                      onSelectAccount(a.aid || a.id);
                      setShowAccountMenu(false);
                    }}
                    style={{ padding: '0.45rem 0.6rem', borderRadius: 6 }}
                  >
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{a.name}</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{formatRupee(Number(a.balance ?? a.initialBalance ?? 0))}</span>
                  </div>
                ))}
                {onOpenAddAccount && (
                  <div
                    className="topbar-add-account-item"
                    onClick={() => {
                      setShowAccountMenu(false);
                      onOpenAddAccount();
                    }}
                  >
                    <LuPlus size={14} />
                    <span>Add New Account</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
});
