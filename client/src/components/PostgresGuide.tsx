import React from 'react';
import { LuZap } from 'react-icons/lu';

interface PostgresGuideProps {
  dbConnected: boolean;
}

export const PostgresGuide: React.FC<PostgresGuideProps> = ({ dbConnected }) => {
  if (dbConnected) return null;

  return (
    <div className="callout-box">
      <h4 style={{ color: '#f59e0b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <LuZap size={16} />
        <span>Data Storage Configuration Guide</span>
      </h4>
      <p style={{ marginBottom: '0.75rem' }}>
        The service is active, but the persistent data storage connection is pending configuration. Follow these quick steps to connect your secure database:
      </p>
      <ol style={{ paddingLeft: '1.25rem', lineHeight: '1.7' }}>
        <li>
          Update <span className="code-snippet">server/.env</span> with your storage connection string:
          <br />
          <span className="code-snippet">DATABASE_URL="postgresql://user:password@localhost:5432/finatle_db"</span>
        </li>
        <li>
          Initialize the data storage schema:
          <br />
          <span className="code-snippet">npm run db:push</span>
        </li>
        <li>
          (Optional) Open the database management studio:
          <br />
          <span className="code-snippet">npm run db:studio</span>
        </li>
      </ol>
    </div>
  );
};
