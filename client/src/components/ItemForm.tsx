import React, { useState } from 'react';

interface ItemFormProps {
  onAddItem: (itemData: { title: string; description: string; amount: number; category: string }) => Promise<void>;
}

export const ItemForm: React.FC<ItemFormProps> = ({ onAddItem }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Development');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await onAddItem({
        title,
        description,
        amount: parseFloat(amount) || 0,
        category,
      });
      setTitle('');
      setDescription('');
      setAmount('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.75rem' }}>
      <h3 style={{ marginBottom: '1.25rem' }}>➕ Add New Record</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Title *</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Database Index Optimization"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Category</label>
          <select
            className="form-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="Development">Development</option>
            <option value="Infrastructure">Infrastructure</option>
            <option value="Analytics">Analytics</option>
            <option value="Security">Security</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Amount ($)</label>
          <input
            type="number"
            step="0.01"
            className="form-input"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="Brief details about this record..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Saving...' : 'Create Record'}
        </button>
      </form>
    </div>
  );
};
