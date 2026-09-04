import React from 'react';

interface PostgresGuideProps {
  dbConnected: boolean;
}

export const PostgresGuide: React.FC<PostgresGuideProps> = ({ dbConnected }) => {
  if (dbConnected) return null;

  return (
    <div className="callout-box">
      <h4 style={{ color: '#f59e0b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        ⚡ PostgreSQL Setup Guide
      </h4>
      <p style={{ marginBottom: '0.75rem' }}>
        The backend API is online, but PostgreSQL is pending connection. Follow these quick steps to connect your PostgreSQL database:
      </p>
      <ol style={{ paddingLeft: '1.25rem', lineHeight: '1.7' }}>
        <li>
          Update <span className="code-snippet">server/.env</span> with your local or cloud PostgreSQL connection string:
          <br />
          <span className="code-snippet">DATABASE_URL="postgresql://postgres:password@localhost:5432/finatle_db"</span>
        </li>
        <li>
          Push the Prisma database schema:
          <br />
          <span className="code-snippet">npm run db:push</span>
        </li>
        <li>
          (Optional) Open Prisma Studio database GUI:
          <br />
          <span className="code-snippet">npm run db:studio</span>
        </li>
      </ol>
    </div>
  );
};
