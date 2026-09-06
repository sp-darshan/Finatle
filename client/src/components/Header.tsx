import React from 'react';

interface HeaderProps {
  serverOnline: boolean;
  dbStatus: {
    connected: boolean;
    message: string;
    details?: any;
  } | null;
  user: {
    uid: string;
    email: string;
    name?: string | null;
    age?: number | null;
  } | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  serverOnline,
  dbStatus,
  user,
  onOpenAuth,
  onLogout,
  onRefresh,
}) => {
  return (
    <header className="app-header">
      <div className="logo-group">
        <div className="logo-badge">Fn</div>
        <div>
          <h2>
            Finatle <span className="gradient-text">Stack</span>
          </h2>
          <p className="title-desc">React 18 + Node.js/Express + Supabase (PostgreSQL)</p>
        </div>
      </div>

      <div className="status-bar">
        <div className="badge">
          <span className={`badge-dot ${serverOnline ? 'active' : 'error'}`}></span>
          <span>Express API: {serverOnline ? 'Online (:5000)' : 'Offline'}</span>
        </div>

        <div className="badge">
          <span className={`badge-dot ${dbStatus?.connected ? 'active' : 'warning'}`}></span>
          <span>
            PostgreSQL / Supabase:{' '}
            {dbStatus?.connected
              ? `Connected (${dbStatus.details?.database || 'DB'})`
              : 'Pending Config'}
          </span>
        </div>

        {user ? (
          <div className="badge" style={{ borderColor: 'rgba(139, 92, 246, 0.4)' }}>
            <span>👤 {user.name || user.email} {user.age ? `(Age: ${user.age})` : ''}</span>
            <button
              onClick={onLogout}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-rose)',
                cursor: 'pointer',
                marginLeft: '0.25rem',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            className="btn btn-primary"
            onClick={onOpenAuth}
            style={{ padding: '0.4rem 1rem', fontSize: '0.825rem' }}
          >
            🔐 Sign In / Sign Up
          </button>
        )}

        <button className="badge" onClick={onRefresh} style={{ cursor: 'pointer' }}>
          🔄 Refresh
        </button>
      </div>
    </header>
  );
};
