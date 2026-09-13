import React from 'react';
import { FinatleLogo, NavIcons } from './Icons';

export type TabType = 'dashboard' | 'transactions' | 'budgets' | 'analytics' | 'loans' | 'settings';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  currentTab,
  onSelectTab,
}) => {
  const navItems: { id: TabType; label: string; icon: React.FC<{ active?: boolean }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: NavIcons.Dashboard },
    { id: 'transactions', label: 'Transactions', icon: NavIcons.Transactions },
    { id: 'budgets', label: 'Budgets', icon: NavIcons.Budgets },
    { id: 'analytics', label: 'Analytics', icon: NavIcons.Analytics },
    { id: 'loans', label: 'Loans & Split', icon: NavIcons.Loans },
    { id: 'settings', label: 'Settings', icon: NavIcons.Settings },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <FinatleLogo size={36} />
        <div className="sidebar-logo-text">
          <h1>Finatle</h1>
          <p>Money in sync with you.</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab(item.id)}
            >
              <Icon active={isActive} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem 0' }}>
          Finatle v1.0 • Connected
        </div>
      </div>
    </aside>
  );
});
