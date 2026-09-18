import React, { useState } from 'react';
import { CategoryPicker } from './CategoryPicker';
import { LuX, LuUsers, LuPenLine, LuPlus, LuTrash2, LuUser } from 'react-icons/lu';

export type RecordKind = 'expense' | 'income' | 'lent' | 'borrowed' | 'split';

interface CustomPersonEntry {
  id: string;
  name: string;
  amount: string;
}

interface AddRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialKind?: RecordKind;
  token?: string | null;
  onSuccess: (newRecord?: any) => void | Promise<void>;
}

export const AddRecordModal: React.FC<AddRecordModalProps> = React.memo(({
  isOpen,
  onClose,
  initialKind = 'expense',
  onSuccess,
}) => {
  const [kind, setKind] = useState<RecordKind>(initialKind);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(initialKind === 'income' ? 'Salary' : 'Food & Dining');
  const [otherCategory, setOtherCategory] = useState('');
  const [personName, setPersonName] = useState('');
  const [dueAt, setDueAt] = useState('');
  
  // Split mode state
  const [splitType, setSplitType] = useState<'EQUAL' | 'CUSTOM'>('EQUAL');
  const [splitPeopleCount, setSplitPeopleCount] = useState('4');
  const [equalFriendNames, setEqualFriendNames] = useState<string[]>(['', '', '']);
  const [customPeople, setCustomPeople] = useState<CustomPersonEntry[]>([
    { id: '1', name: '', amount: '' },
  ]);
  
  const [error, setError] = useState('');

  // Synchronously reset & align state when modal opens or initialKind changes
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setKind(initialKind);
      setAmount('');
      setTitle('');
      setError('');
      setCategory(initialKind === 'income' ? 'Salary' : 'Food & Dining');
      setOtherCategory('');
      setPersonName('');
      setDueAt('');
    }
  }

  if (!isOpen) return null;

  const handleAddCustomPerson = () => {
    setCustomPeople((prev) => [
      ...prev,
      { id: String(Date.now() + Math.random()), name: '', amount: '' },
    ]);
  };

  const handleRemoveCustomPerson = (id: string) => {
    if (customPeople.length <= 1) {
      setCustomPeople([{ id: '1', name: '', amount: '' }]);
    } else {
      setCustomPeople((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleCustomPersonChange = (id: string, field: 'name' | 'amount', val: string) => {
    setCustomPeople((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: val } : p))
    );
  };

  const handleEqualFriendNameChange = (index: number, val: string) => {
    setEqualFriendNames((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const numericAmount = parseFloat(amount) || 0;
  const count = Math.max(2, parseInt(splitPeopleCount) || 4);
  const equalPerPerson = numericAmount > 0 ? Math.round((numericAmount / count) * 100) / 100 : 0;
  const equalTotalLent = numericAmount > 0 ? Math.round(equalPerPerson * (count - 1) * 100) / 100 : 0;
  const equalUserShare = Math.max(0, Math.round((numericAmount - equalTotalLent) * 100) / 100);

  const customTotalLent = customPeople.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const customUserShare = Math.max(0, Math.round((numericAmount - customTotalLent) * 100) / 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    const selectedCategory = category === 'Other' ? otherCategory.trim() || 'Other' : category;

    if (kind === 'expense' || kind === 'income') {
      const apiPayload = {
        type: kind === 'income' ? 'INCOME' : 'EXPENSE',
        amount: numericAmount,
        description: title.trim() || (kind === 'income' ? 'Income' : selectedCategory),
        category: selectedCategory,
      };

      const optimisticData = {
        id: `temp-t-${Date.now()}`,
        name: title.trim() || (kind === 'income' ? 'Income' : selectedCategory),
        category: selectedCategory,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        amount: numericAmount,
        type: (kind === 'income' ? 'INCOME' : 'EXPENSE') as 'INCOME' | 'EXPENSE',
      };

      onSuccess({
        kind: 'transaction',
        apiPayload,
        optimisticData,
      });
    } else if (kind === 'lent' || kind === 'borrowed') {
      const person = personName.trim() || (kind === 'lent' ? 'Friend' : 'Lender');
      
      const apiPayload = {
        personName: person,
        amount: numericAmount,
        description: title.trim() || undefined,
        dueAt: dueAt || undefined,
      };

      const optimisticData = {
        id: `temp-loan-${Date.now()}`,
        kind,
        personName: person,
        title: kind === 'lent' ? `You lent to ${person}` : `You borrowed from ${person}`,
        subtext: title.trim() || 'Personal loan',
        amount: numericAmount,
        paidAmount: 0,
        status: 'PENDING' as const,
        statusLabel: kind === 'lent' ? 'Yet to receive' : 'Yet to pay',
        date: new Date().toISOString(),
        dueDate: dueAt || undefined,
      };

      onSuccess({
        kind,
        apiPayload,
        optimisticData,
      });
    } else if (kind === 'split') {
      if (splitType === 'EQUAL') {
        const friendsCount = count - 1;
        const lentEntries = [];

        const itemTitle = title.trim() || selectedCategory || 'Expense';
        const lentTitle = title.trim() || selectedCategory || 'Split bill';

        for (let i = 0; i < friendsCount; i++) {
          const friend = equalFriendNames[i]?.trim() || `Friend ${i + 1}`;
          const tempId = `temp-split-${Date.now()}-${i}`;
          lentEntries.push({
            apiPayload: {
              personName: friend,
              amount: equalPerPerson,
              description: lentTitle,
              dueAt: dueAt || undefined,
            },
            optimisticData: {
              id: tempId,
              kind: 'lent' as const,
              personName: friend,
              title: `You lent to ${friend}`,
              subtext: lentTitle,
              amount: equalPerPerson,
              paidAmount: 0,
              status: 'PENDING' as const,
              statusLabel: 'Yet to receive',
              date: new Date().toISOString(),
              dueDate: dueAt || undefined,
            },
          });
        }

        const userShareTransaction = equalUserShare > 0 ? {
          apiPayload: {
            type: 'EXPENSE' as const,
            amount: equalUserShare,
            description: itemTitle,
            category: selectedCategory,
          },
          optimisticData: {
            id: `temp-t-${Date.now()}`,
            name: itemTitle,
            category: selectedCategory,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            amount: equalUserShare,
            type: 'EXPENSE' as const,
          },
        } : undefined;

        onSuccess({
          kind: 'split',
          splitData: {
            userShareTransaction,
            lentEntries,
          },
        });
      } else {
        // Custom Split Mode
        const validPeople = customPeople
          .map((p, idx) => ({
            name: p.name.trim() || `Friend ${idx + 1}`,
            amount: parseFloat(p.amount) || 0,
          }))
          .filter((p) => p.amount > 0);

        if (validPeople.length === 0) {
          setError('Please enter at least one friend with an amount greater than ₹0.');
          return;
        }

        if (customTotalLent > numericAmount) {
          setError(`Total lent amount (₹${customTotalLent.toLocaleString('en-IN')}) cannot exceed total bill amount (₹${numericAmount.toLocaleString('en-IN')}).`);
          return;
        }

        const itemTitle = title.trim() || selectedCategory || 'Expense';
        const lentTitle = title.trim() || selectedCategory || 'Split bill';

        const lentEntries = validPeople.map((p, idx) => {
          const tempId = `temp-split-${Date.now()}-${idx}`;
          return {
            apiPayload: {
              personName: p.name,
              amount: p.amount,
              description: lentTitle,
              dueAt: dueAt || undefined,
            },
            optimisticData: {
              id: tempId,
              kind: 'lent' as const,
              personName: p.name,
              title: `You lent to ${p.name}`,
              subtext: lentTitle,
              amount: p.amount,
              paidAmount: 0,
              status: 'PENDING' as const,
              statusLabel: 'Yet to receive',
              date: new Date().toISOString(),
              dueDate: dueAt || undefined,
            },
          };
        });

        const userShareTransaction = customUserShare > 0 ? {
          apiPayload: {
            type: 'EXPENSE' as const,
            amount: customUserShare,
            description: itemTitle,
            category: selectedCategory,
          },
          optimisticData: {
            id: `temp-t-${Date.now()}`,
            name: itemTitle,
            category: selectedCategory,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            amount: customUserShare,
            type: 'EXPENSE' as const,
          },
        } : undefined;

        onSuccess({
          kind: 'split',
          splitData: {
            userShareTransaction,
            lentEntries,
          },
        });
      }
    }

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: kind === 'split' ? 520 : 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add New Record</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <LuX size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="modal-tabs">
          <button
            type="button"
            className={`modal-tab-btn ${kind === 'expense' ? 'active' : ''}`}
            onClick={() => setKind('expense')}
          >
            Expense
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${kind === 'income' ? 'active' : ''}`}
            onClick={() => setKind('income')}
          >
            Income
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${kind === 'lent' ? 'active' : ''}`}
            onClick={() => setKind('lent')}
          >
            Lent
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${kind === 'borrowed' ? 'active' : ''}`}
            onClick={() => setKind('borrowed')}
          >
            Borrowed
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${kind === 'split' ? 'active' : ''}`}
            onClick={() => setKind('split')}
          >
            Split
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Amount input */}
          <div className="form-group">
            <label>{kind === 'split' ? 'Total Bill Amount (₹)' : 'Amount (₹)'}</label>
            <input
              type="number"
              step="any"
              min="1"
              placeholder="0"
              className="form-control"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Title / Description */}
          <div className="form-group">
            <label>
              {kind === 'expense'
                ? 'Description / Merchant'
                : kind === 'income'
                ? 'Source'
                : kind === 'split'
                ? 'Split Title / Event'
                : 'Reason / Note'}
            </label>
            <input
              type="text"
              placeholder={
                kind === 'expense'
                  ? 'Starbucks, Amazon, Zomato...'
                  : kind === 'income'
                  ? 'Salary, Client Payment...'
                  : kind === 'split'
                  ? 'Goa Trip, Dinner with Friends, Concert Tickets...'
                  : 'For trip expenses, Concert tickets...'
              }
              className="form-control"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Category for Transactions and Split personal expenses */}
          {(kind === 'expense' || kind === 'income' || kind === 'split') && (
            <div className="form-group">
              <label>Category</label>
              <CategoryPicker value={category} onChange={setCategory} otherValue={otherCategory} onOtherChange={setOtherCategory} />
            </div>
          )}

          {/* Person Name for Lent / Borrowed */}
          {(kind === 'lent' || kind === 'borrowed') && (
            <div className="form-group">
              <label>{kind === 'lent' ? 'Who did you lend to?' : 'Who did you borrow from?'}</label>
              <input
                type="text"
                placeholder={kind === 'lent' ? 'e.g. Rohan' : 'e.g. Priya'}
                className="form-control"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                required
              />
            </div>
          )}

          {/* Due date for loans */}
          {(kind === 'lent' || kind === 'borrowed') && (
            <div className="form-group">
              <label>Due Date (Optional)</label>
              <input
                type="date"
                className="form-control"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
          )}

          {/* SPLIT CONFIGURATION SECTION */}
          {kind === 'split' && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1.5px solid #a7f3d0',
                borderRadius: 'var(--radius-lg)',
                padding: '0.9rem',
                marginBottom: '1rem',
              }}
            >
              {/* Split Mode Toggle */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <button
                  type="button"
                  className="select-pill"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    background: splitType === 'EQUAL' ? '#10b981' : '#ffffff',
                    color: splitType === 'EQUAL' ? '#ffffff' : '#334155',
                    borderColor: splitType === 'EQUAL' ? '#10b981' : '#cbd5e1',
                    fontWeight: 700,
                  }}
                  onClick={() => setSplitType('EQUAL')}
                >
                  <LuUsers size={14} style={{ display: 'inline', marginRight: '0.35rem' }} /> Equal Split
                </button>
                <button
                  type="button"
                  className="select-pill"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    background: splitType === 'CUSTOM' ? '#10b981' : '#ffffff',
                    color: splitType === 'CUSTOM' ? '#ffffff' : '#334155',
                    borderColor: splitType === 'CUSTOM' ? '#10b981' : '#cbd5e1',
                    fontWeight: 700,
                  }}
                  onClick={() => setSplitType('CUSTOM')}
                >
                  <LuPenLine size={14} style={{ display: 'inline', marginRight: '0.35rem' }} /> Custom Split
                </button>
              </div>

              {/* Split Due Date */}
              <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065f46' }}>
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  className="form-control"
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem', margin: 0 }}
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                />
              </div>

              {splitType === 'EQUAL' ? (
                <>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065f46' }}>
                      Total People Sharing (Including You)
                    </label>
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                      {[2, 3, 4, 5, 6].map((num) => (
                        <button
                          key={num}
                          type="button"
                          className="select-pill"
                          style={{
                            flex: 1,
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                            background: parseInt(splitPeopleCount) === num ? '#047857' : '#ffffff',
                            color: parseInt(splitPeopleCount) === num ? '#ffffff' : '#065f46',
                            borderColor: parseInt(splitPeopleCount) === num ? '#047857' : '#6ee7b7',
                            fontWeight: 700,
                          }}
                          onClick={() => setSplitPeopleCount(String(num))}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Individual names for equal split */}
                  <div style={{ marginBottom: '0.85rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065f46', display: 'block', marginBottom: '0.4rem' }}>
                      Friends' Names:
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '160px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                      {equalFriendNames.map((name, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', background: '#ffffff', padding: '0.45rem 0.55rem', borderRadius: 'var(--radius-md)', border: '1px solid #cbd5e1' }}>
                          <LuUser size={14} style={{ color: '#64748b' }} />
                          <input
                            type="text"
                            placeholder={`Friend ${idx + 1} Name`}
                            className="form-control"
                            style={{ flex: 1, fontSize: '0.82rem', padding: '0.3rem 0.5rem', margin: 0 }}
                            value={name}
                            onChange={(e) => handleEqualFriendNameChange(idx, e.target.value)}
                          />
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#047857' }}>
                            ₹{equalPerPerson.toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* Custom Split Section */
                <div style={{ marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065f46', margin: 0 }}>
                      Friends & Custom Amounts:
                    </label>
                    <button
                      type="button"
                      onClick={handleAddCustomPerson}
                      style={{
                        background: '#dcfce7',
                        border: '1px solid #86efac',
                        color: '#15803d',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <LuPlus size={13} /> Add Person
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                    {customPeople.map((person, index) => (
                      <div
                        key={person.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          background: '#ffffff',
                          padding: '0.45rem 0.55rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        <LuUser size={14} style={{ color: '#64748b' }} />
                        <input
                          type="text"
                          placeholder={`Friend ${index + 1} Name`}
                          className="form-control"
                          style={{ flex: 1.4, fontSize: '0.82rem', padding: '0.35rem 0.5rem', margin: 0 }}
                          value={person.name}
                          onChange={(e) => handleCustomPersonChange(person.id, 'name', e.target.value)}
                        />
                        <div style={{ position: 'relative', flex: 1 }}>
                          <span style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>
                            ₹
                          </span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Amount"
                            className="form-control"
                            style={{ paddingLeft: '1.25rem', paddingRight: '0.4rem', fontSize: '0.82rem', paddingBlock: '0.35rem', margin: 0, fontWeight: 700 }}
                            value={person.amount}
                            onChange={(e) => handleCustomPersonChange(person.id, 'amount', e.target.value)}
                          />
                        </div>
                        {customPeople.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomPerson(person.id)}
                            style={{
                              background: '#fee2e2',
                              border: 'none',
                              color: '#dc2626',
                              borderRadius: 'var(--radius-sm)',
                              width: '26px',
                              height: '26px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                            title="Remove person"
                          >
                            <LuTrash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Calculation Card */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #6ee7b7',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.65rem 0.85rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Your Personal Expense</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#dc2626' }}>
                    ₹{(splitType === 'EQUAL' ? equalUserShare : customUserShare).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Recorded to Transactions</div>
                </div>

                <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '0.5rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Total Lent to Friends</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#059669' }}>
                    ₹{(splitType === 'EQUAL' ? equalTotalLent : customTotalLent).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 600 }}>
                    {splitType === 'EQUAL'
                      ? `${equalFriendNames.length} individual entries`
                      : `${customPeople.filter(p => (parseFloat(p.amount) || 0) > 0).length} individual entries`}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p style={{ color: 'var(--expense)', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-submit-primary"
          >
            {kind === 'split'
              ? `Save Split (${splitType === 'EQUAL' ? count : customPeople.length + 1} People)`
              : `Save ${kind.charAt(0).toUpperCase() + kind.slice(1)}`}
          </button>
        </form>
      </div>
    </div>
  );
});

