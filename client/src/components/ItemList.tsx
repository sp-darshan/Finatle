import React from 'react';

export interface Item {
  id: string;
  title: string;
  description?: string;
  amount: number;
  category: string;
  createdAt: string;
}

interface ItemListProps {
  items: Item[];
  dataSource: string;
  onDeleteItem: (id: string) => Promise<void>;
}

export const ItemList: React.FC<ItemListProps> = ({ items, dataSource, onDeleteItem }) => {
  return (
    <div className="glass-panel" style={{ padding: '1.75rem' }}>
      <div className="items-header">
        <div>
          <h3>📊 Active Records ({items.length})</h3>
          <p className="title-desc">
            Data Source:{' '}
            <span style={{ color: dataSource === 'database' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
              {dataSource === 'database' ? '🟢 Live PostgreSQL Database' : '🟡 In-Memory Fallback'}
            </span>
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          <p>No records found. Create your first record using the form!</p>
        </div>
      ) : (
        items.map((item) => (
          <div key={item.id} className="item-card">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
                <span className="item-category-tag">{item.category}</span>
                <strong style={{ fontSize: '1.05rem' }}>{item.title}</strong>
              </div>
              {item.description && (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{item.description}</p>
              )}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {new Date(item.createdAt).toLocaleString()}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <span className="item-amount">
                ${typeof item.amount === 'number' ? item.amount.toFixed(2) : item.amount}
              </span>
              <button
                className="btn btn-icon"
                title="Delete Record"
                onClick={() => onDeleteItem(item.id)}
              >
                🗑️
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
