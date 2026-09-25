import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

type Transaction = {
  tid: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number | string;
  description?: string | null;
  category?: string | null;
  occurredAt: string;
};

type Loan = {
  lid?: string;
  bid?: string;
  personName: string;
  amount: number | string;
  lentAt?: string;
  borrowedAt?: string;
  description?: string | null;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  dueAt?: string | null;
};

type Summary = {
  account: { balance: number | string };
  transactions: Transaction[];
  moneyLent: Loan[];
  moneyBorrowed: Loan[];
};

interface FinanceDashboardProps {
  token: string | null;
  onOpenAuth: () => void;
}

const money = (value: number | string) => `$${Number(value).toFixed(2)}`;

export function FinanceDashboard({ token, onOpenAuth }: FinanceDashboardProps) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [kind, setKind] = useState<'transaction' | 'lent' | 'borrowed'>('transaction');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [personName, setPersonName] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSummary = async () => {
    if (!token) {
      setSummary(null);
      return;
    }
    const response = await apiFetch('/api/finance/summary', { headers: { Authorization: `Bearer ${token}` } });
    if (response.ok) setSummary(await response.json());
  };

  useEffect(() => {
    loadSummary().catch(() => setError('Could not load your financial data.'));
  }, [token]);

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setPersonName('');
    setDueAt('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    const endpoint = kind === 'transaction' ? '/api/finance/transactions' : `/api/finance/${kind}`;
    const payload = kind === 'transaction'
      ? { type, amount: Number(amount), description, category }
      : { amount: Number(amount), personName, description, dueAt: dueAt || undefined };

    try {
      const response = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save record.');
      resetForm();
      await loadSummary();
    } catch (submitError: any) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  };

  const updateLoan = async (id: string, status: Loan['status']) => {
    await apiFetch(`/api/finance/loans/${id}/status`, { 
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    await loadSummary();
  };

  if (!token) {
    return (
      <section className="welcome-panel glass-panel">
        <p className="eyebrow">Personal finance, without the fog</p>
        <h1>Know where your money stands.</h1>
        <p>Track cash in and out, money you have lent, and money you owe from one calm dashboard.</p>
        <button className="btn btn-primary" onClick={onOpenAuth}>Create your account</button>
      </section>
    );
  }

  const lentTotal = summary?.moneyLent.filter((loan) => loan.status !== 'PAID').reduce((total, loan) => total + Number(loan.amount), 0) || 0;
  const borrowedTotal = summary?.moneyBorrowed.filter((loan) => loan.status !== 'PAID').reduce((total, loan) => total + Number(loan.amount), 0) || 0;
  const activity = [
    ...(summary?.transactions || []).map((transaction) => ({
      key: `transaction-${transaction.tid}`,
      title: transaction.description || transaction.category || 'Transaction',
      detail: transaction.category || 'Groceries',
      date: transaction.occurredAt,
      amount: Number(transaction.amount),
      prefix: transaction.type === 'INCOME' ? '+' : '-',
      tone: transaction.type === 'INCOME' ? 'income-text' : 'expense-text',
    })),
    ...(summary?.moneyLent || []).map((loan) => ({
      key: `lent-${loan.lid}`,
      title: `Lent to ${loan.personName}`,
      detail: `Money lent · ${loan.status.toLowerCase()}`,
      date: loan.lentAt || '',
      amount: Number(loan.amount),
      prefix: '-',
      tone: 'expense-text',
    })),
    ...(summary?.moneyBorrowed || []).map((loan) => ({
      key: `borrowed-${loan.bid}`,
      title: `Borrowed from ${loan.personName}`,
      detail: `Money borrowed · ${loan.status.toLowerCase()}`,
      date: loan.borrowedAt || '',
      amount: Number(loan.amount),
      prefix: '+',
      tone: 'income-text',
    })),
  ].sort((first, second) => (second.date || '').localeCompare(first.date || ''));

  return (
    <main>
      <section className="balance-grid">
        <div className="balance-card glass-panel">
          <span className="eyebrow">Current balance</span>
          <strong>{money(summary?.account.balance || 0)}</strong>
          <span className="balance-note">Updated from your transactions</span>
        </div>
        <div className="stat-card glass-panel"><span>Owed to you</span><strong>{money(lentTotal)}</strong><small>{summary?.moneyLent.length || 0} records</small></div>
        <div className="stat-card glass-panel"><span>You owe</span><strong>{money(borrowedTotal)}</strong><small>{summary?.moneyBorrowed.length || 0} records</small></div>
      </section>

      <section className="finance-layout">
        <div className="glass-panel finance-form-panel">
          <div className="section-heading"><div><p className="eyebrow">Add to your books</p><h2>New record</h2></div></div>
          <div className="segmented-control">
            {(['transaction', 'lent', 'borrowed'] as const).map((option) => (
              <button key={option} className={kind === option ? 'selected' : ''} onClick={() => setKind(option)} type="button">
                {option === 'transaction' ? 'Transaction' : option === 'lent' ? 'Money lent' : 'Borrowed'}
              </button>
            ))}
          </div>
          <form onSubmit={submit}>
            {kind === 'transaction' && (
              <div className="segmented-control compact">
                <button type="button" className={type === 'EXPENSE' ? 'selected expense' : ''} onClick={() => setType('EXPENSE')}>Expense</button>
                <button type="button" className={type === 'INCOME' ? 'selected income' : ''} onClick={() => setType('INCOME')}>Income</button>
              </div>
            )}
            {kind !== 'transaction' && <label className="form-label">Person<input className="form-input" value={personName} onChange={(event) => setPersonName(event.target.value)} placeholder="Who is involved?" required /></label>}
            <label className="form-label">Amount<input className="form-input" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" required /></label>
            {kind === 'transaction' && <label className="form-label">Category<select className="form-select" value={category} onChange={(event) => setCategory(event.target.value)}><option>Groceries</option><option>Food</option><option>Housing</option><option>Transport</option><option>Salary</option><option>Shopping</option></select></label>}
            {kind !== 'transaction' && <label className="form-label">Due date<input className="form-input" type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label>}
            <label className="form-label">Note<textarea className="form-textarea" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add a note" rows={3} /></label>
            {error && <p className="form-error">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save record'}</button>
          </form>
        </div>

        <div className="glass-panel ledger-panel">
          <div className="section-heading"><div><p className="eyebrow">Your activity</p><h2>Recent transactions</h2></div><button className="refresh-link" onClick={loadSummary}>Refresh</button></div>
          {!activity.length ? <p className="empty-state">Your transaction history will appear here.</p> : activity.map((record) => (
            <div className="ledger-row" key={record.key}>
              <div><strong>{record.title}</strong><small>{record.date ? new Date(record.date).toLocaleDateString() : 'No date'} · {record.detail}</small></div>
              <div className="row-actions"><strong className={record.tone}>{record.prefix}{money(record.amount)}</strong></div>
            </div>
          ))}
        </div>
      </section>

      <section className="loan-grid">
        <LoanList title="Money lent" loans={summary?.moneyLent || []} onStatus={updateLoan} />
        <LoanList title="Borrowed money" loans={summary?.moneyBorrowed || []} onStatus={updateLoan} />
      </section>
    </main>
  );
}

function LoanList({ title, loans, onStatus }: { title: string; loans: Loan[]; onStatus: (id: string, status: Loan['status']) => void }) {
  return <div className="glass-panel ledger-panel"><div className="section-heading"><h2>{title}</h2><span className="count-badge">{loans.length}</span></div>{!loans.length ? <p className="empty-state">Nothing here yet.</p> : loans.map((loan) => { const loanId = loan.lid || loan.bid || ''; return <div className="ledger-row" key={loanId}><div><strong>{loan.personName}</strong><small>{loan.dueAt ? `Due ${new Date(loan.dueAt).toLocaleDateString()}` : 'No due date'} · {loan.status.toLowerCase()}</small></div><div className="row-actions"><strong>{money(loan.amount)}</strong><select className="status-select" value={loan.status} onChange={(event) => onStatus(loanId, event.target.value as Loan['status'])}><option>PENDING</option><option>PAID</option><option>OVERDUE</option></select></div></div>; })}</div>;
}
