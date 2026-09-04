import React from 'react';

interface HeaderProps {
  serverOnline: boolean;
  dbStatus: {
    connected: boolean;
    message: string;
    details?: any;
  } | null;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({ serverOnline, dbStatus, onRefresh }) => {
  return (
    <header className="app-header">
      <div className="logo-group">
        <div className="logo-badge">Fn</div>
        <div>
          <h2>
            Finatle <span className="gradient-text">Stack</span>
          </h2>
          <p className="title-desc">React 18 + Node.js/Express + PostgreSQL</p>
        </div>
      </div>

      <div className="status-bar">
        <div className="badge">
          <span className={`badge-dot ${serverOnline ? 'active' : 'error'}`}></span>
          <span>Express API: {serverOnline ? 'Online (5000)' : 'Offline'}</span>
        </div>

        <div className="badge">
          <span className={`badge-dot ${dbStatus?.connected ? 'active' : 'warning'}`}></span>
          <span>
            PostgreSQL:{' '}
            {dbStatus?.connected
              ? `Connected (${dbStatus.details?.database || 'DB'})`
              : 'Pending Config'}
          </span>
        </div>

        <button className="badge" onClick={onRefresh} style={{ cursor: 'pointer' }}>
          🔄 Refresh
        </button>
      </div>
    </header>
  );
};
