import React, { useState, useRef } from 'react';
import { ScanBillIcon, CategoryBadge, UsersGroupIcon, MinusIcon, PlusIcon } from './Icons';
import { LuUpload, LuCamera, LuCheck, LuPlus, LuTrash2, LuUser } from 'react-icons/lu';
import { CategoryPicker } from './CategoryPicker';
import { apiFetch } from '../lib/api';

export interface CustomLentPerson {
  id: string;
  name: string;
  amount: string;
}

export interface ScannedBillPayload {
  mode: 'EXPENSE' | 'INCOME' | 'SPLIT';
  name: string;
  category: string;
  amount: number;
  date?: string;
  splitDetails?: {
    peopleCount: number;
    userShare: number;
    lentAmount: number;
    personName: string;
    description: string;
    lentEntries?: Array<{
      personName: string;
      amount: number;
      description?: string;
    }>;
  };
}

interface BillScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string | null;
  onConfirmBill: (payload: ScannedBillPayload) => Promise<void> | void;
}

export const BillScannerModal: React.FC<BillScannerModalProps> = ({
  isOpen,
  onClose,
  token,
  onConfirmBill,
}) => {
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Scanned result state
  const [scannedResult, setScannedResult] = useState<{
    merchant: string;
    amount: number;
    category: string;
    date: string;
    items: Array<{ name: string; price: number; quantity?: number }>;
  } | null>(null);

  // Editable bill fields
  const [merchantName, setMerchantName] = useState('');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [category, setCategory] = useState('Food & Dining');
  const [otherCategory, setOtherCategory] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);

  // Mode: EXPENSE | INCOME | SPLIT
  const [recordMode, setRecordMode] = useState<'EXPENSE' | 'INCOME' | 'SPLIT'>('EXPENSE');

  // Split configurations
  const [splitType, setSplitType] = useState<'EQUAL' | 'CUSTOM'>('EQUAL');
  const [peopleCount, setPeopleCount] = useState<number>(4);
  const [groupOrPersonName, setGroupOrPersonName] = useState('Friends');
  const [customPeople, setCustomPeople] = useState<CustomLentPerson[]>([
    { id: '1', name: '', amount: '' },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAddPerson = () => {
    setCustomPeople((prev) => [
      ...prev,
      { id: String(Date.now() + Math.random()), name: '', amount: '' },
    ]);
  };

  const handleRemovePerson = (id: string) => {
    if (customPeople.length <= 1) {
      setCustomPeople([{ id: '1', name: '', amount: '' }]);
    } else {
      setCustomPeople((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handlePersonChange = (id: string, field: 'name' | 'amount', value: string) => {
    setCustomPeople((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleSetScanData = (data: {
    merchant: string;
    amount: number;
    category: string;
    date?: string;
    items?: Array<{ name: string; price: number; quantity?: number }>;
  }) => {
    setScannedResult({
      merchant: data.merchant || 'Store Bill',
      amount: data.amount || 0,
      category: data.category || 'Food & Dining',
      date: data.date || new Date().toISOString().split('T')[0],
      items: data.items || [],
    });
    setMerchantName(data.merchant || 'Store Bill');
    setTotalAmount(String(data.amount || ''));
    setCategory(data.category || 'Food & Dining');
    setBillDate(data.date || new Date().toISOString().split('T')[0]);
    setRecordMode('EXPENSE');
    setCustomPeople([
      { id: '1', name: '', amount: String(Math.round((data.amount || 0) * 0.5)) },
    ]);
  };

  // Scan via Uploaded Image / Camera Photo using Google Gemini LLM Vision
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setScanStatus('AI analyzing receipt with vision...');
    setError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;

      try {
        if (!token) {
          throw new Error('Please sign in to scan bills.');
        }

        const res = await apiFetch('/api/finance/scan-bill', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            imageBase64: base64,
            mimeType: file.type || 'image/jpeg',
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.message || json.error || 'Gemini extraction failed.');
        }

        const resultData = json.data || json;
        handleSetScanData(resultData);
      } catch (err: any) {
        setError(err.message || 'Failed to extract bill details.');
      } finally {
        setScanning(false);
        setScanStatus('');
      }
    };

    reader.onerror = () => {
      setError('Unable to read the image file.');
      setScanning(false);
      setScanStatus('');
    };

    reader.readAsDataURL(file);
  };

  // Calculations for Split Mode
  const parsedTotal = parseFloat(totalAmount) || 0;
  let computedUserShare = parsedTotal;
  let computedLentAmount = 0;
  let perPersonOwed = 0;

  if (recordMode === 'SPLIT') {
    if (splitType === 'EQUAL') {
      const people = Math.max(2, peopleCount || 2);
      computedUserShare = Math.round((parsedTotal / people) * 100) / 100;
      computedLentAmount = Math.max(0, Math.round((parsedTotal - computedUserShare) * 100) / 100);
      perPersonOwed = Math.round((computedLentAmount / (people - 1)) * 100) / 100;
    } else {
      const totalCustomLent = customPeople.reduce(
        (acc, curr) => acc + (parseFloat(curr.amount) || 0),
        0
      );
      computedLentAmount = Math.round(totalCustomLent * 100) / 100;
      computedUserShare = Math.max(0, Math.round((parsedTotal - computedLentAmount) * 100) / 100);
    }
  }

  // Submit Handler
  const handleConfirm = async () => {
    if (parsedTotal <= 0) {
      setError('Please enter a valid amount greater than ₹0.');
      return;
    }
    if (!merchantName.trim()) {
      setError('Please enter a merchant or bill description.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const finalCategory = category === 'Other' && otherCategory.trim() ? otherCategory.trim() : category;

      if (recordMode === 'SPLIT') {
        if (splitType === 'CUSTOM') {
          const validPeople = customPeople
            .filter((p) => (parseFloat(p.amount) || 0) > 0)
            .map((p, idx) => ({
              personName: p.name.trim() || `Friend ${idx + 1}`,
              amount: parseFloat(p.amount) || 0,
              description: `${merchantName.trim()} split`,
            }));

          if (validPeople.length === 0) {
            setError('Please enter at least one person with an amount greater than ₹0.');
            setSubmitting(false);
            return;
          }

          if (computedLentAmount > parsedTotal) {
            setError(`Total lent amount (₹${computedLentAmount}) cannot exceed total bill amount (₹${parsedTotal}).`);
            setSubmitting(false);
            return;
          }

          await onConfirmBill({
            mode: 'SPLIT',
            name: merchantName.trim(),
            category: finalCategory,
            amount: parsedTotal,
            date: billDate,
            splitDetails: {
              peopleCount: validPeople.length + 1,
              userShare: computedUserShare,
              lentAmount: computedLentAmount,
              personName: validPeople.map((p) => p.personName).join(', '),
              description: `${merchantName.trim()} (Custom split with ${validPeople.length} friends)`,
              lentEntries: validPeople,
            },
          });
        } else {
          await onConfirmBill({
            mode: 'SPLIT',
            name: merchantName.trim(),
            category: finalCategory,
            amount: parsedTotal,
            date: billDate,
            splitDetails: {
              peopleCount: peopleCount,
              userShare: computedUserShare,
              lentAmount: computedLentAmount,
              personName: groupOrPersonName.trim() || 'Friends',
              description: `${merchantName.trim()} (${peopleCount} people split • ₹${perPersonOwed}/person)`,
            },
          });
        }
      } else {
        await onConfirmBill({
          mode: recordMode,
          name: merchantName.trim(),
          category: finalCategory,
          amount: parsedTotal,
          date: billDate,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save scanned bill.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <ScanBillIcon size={24} />
            <div>
              <h3>AI Bill & Receipt Scanner</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Powered by AI Multimodal Vision
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {error && (
          <div
            style={{
              padding: '0.65rem 0.85rem',
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: 'var(--radius-md)',
              color: '#dc2626',
              fontSize: '0.82rem',
              marginBottom: '0.75rem',
              lineHeight: 1.4,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ padding: '0.25rem 0' }}>
          {/* STEP 1: SCAN / UPLOAD AREA */}
          {!scannedResult && (
            <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />

              <div
                style={{
                  border: '2px dashed #10b981',
                  borderRadius: 'var(--radius-lg)',
                  padding: '2.25rem 1.25rem',
                  background: '#f0fdf4',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div style={{ color: '#10b981', marginBottom: '0.6rem', display: 'flex', justifyContent: 'center', gap: '0.65rem' }}>
                  <LuCamera size={36} />
                  <LuUpload size={36} />
                </div>
                <h4 style={{ color: '#065f46', fontWeight: 800, fontSize: '1.1rem' }}>
                  {scanning ? (scanStatus || 'AI Processing Image...') : 'Upload Receipt or Take Photo'}
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#047857', marginTop: '0.35rem' }}>
                  {scanning
                    ? 'AI is extracting merchant, line items, taxes & total amount'
                    : 'Works with restaurant bills, supermarket receipts, fuel & invoices'}
                </p>

                {scanning && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: '#10b981',
                      boxShadow: '0 0 12px #10b981',
                      animation: 'scanBar 1.2s infinite alternate',
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* STEP 2: REVIEW EXTRACTED DETAILS & CHOOSE ACTION */}
          {scannedResult && (
            <div>
              {/* Top Extracted Summary Banner */}
              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1rem',
                  border: '1px solid var(--border-color)',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <CategoryBadge name={merchantName} category={category} size={40} />
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        ✓ AI Extracted
                      </div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800 }}>{merchantName || 'Store Bill'}</h4>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Amount</div>
                    <strong style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                      ₹{parsedTotal.toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>

                {/* Line Items List (if available) */}
                {scannedResult.items && scannedResult.items.length > 0 && (
                  <div style={{ marginTop: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.6rem' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.3rem' }}>
                      ITEMIZED BREAKDOWN ({scannedResult.items.length} items):
                    </div>
                    <div style={{ maxHeight: '90px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {scannedResult.items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#475569' }}>
                          <span>• {item.name}</span>
                          <span style={{ fontWeight: 600 }}>₹{item.price.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Editable Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.85rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.75rem' }}>Merchant / Place Name</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.75rem' }}>Total Amount (₹)</label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    className="form-control"
                    style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem', fontWeight: 700 }}
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.75rem' }}>Category</label>
                  <CategoryPicker
                    value={category}
                    onChange={setCategory}
                    otherValue={otherCategory}
                    onOtherChange={setOtherCategory}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.75rem' }}>Bill Date</label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                  />
                </div>
              </div>

              {/* RECORD TYPE SELECTION TABS */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem', display: 'block' }}>
                  Record this bill as:
                </label>
                <div className="modal-tabs" style={{ marginBottom: '0.65rem' }}>
                  <button
                    type="button"
                    className={`modal-tab-btn ${recordMode === 'EXPENSE' ? 'active' : ''}`}
                    onClick={() => setRecordMode('EXPENSE')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                  >
                    <MinusIcon size={14} /> Personal Expense
                  </button>
                  <button
                    type="button"
                    className={`modal-tab-btn ${recordMode === 'INCOME' ? 'active' : ''}`}
                    onClick={() => setRecordMode('INCOME')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                  >
                    <PlusIcon size={14} /> Income
                  </button>
                  <button
                    type="button"
                    className={`modal-tab-btn ${recordMode === 'SPLIT' ? 'active' : ''}`}
                    onClick={() => setRecordMode('SPLIT')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                  >
                    <UsersGroupIcon size={14} /> Split / Lent
                  </button>
                </div>

                {/* SPLIT / LENT CONFIGURATION PANEL */}
                {recordMode === 'SPLIT' && (
                  <div
                    style={{
                      background: '#f0fdf4',
                      border: '1.5px solid #a7f3d0',
                      borderRadius: 'var(--radius-lg)',
                      padding: '0.9rem',
                      marginTop: '0.5rem',
                    }}
                  >
                    {/* Split Type Toggle */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <button
                        type="button"
                        className="select-pill"
                        style={{
                          flex: 1,
                          justifyContent: 'center',
                          fontSize: '0.78rem',
                          background: splitType === 'EQUAL' ? '#10b981' : '#ffffff',
                          color: splitType === 'EQUAL' ? '#ffffff' : '#334155',
                          borderColor: splitType === 'EQUAL' ? '#10b981' : '#cbd5e1',
                          fontWeight: 700,
                        }}
                        onClick={() => setSplitType('EQUAL')}
                      >
                        👥 Equal Split (Ate Together)
                      </button>
                      <button
                        type="button"
                        className="select-pill"
                        style={{
                          flex: 1,
                          justifyContent: 'center',
                          fontSize: '0.78rem',
                          background: splitType === 'CUSTOM' ? '#10b981' : '#ffffff',
                          color: splitType === 'CUSTOM' ? '#ffffff' : '#334155',
                          borderColor: splitType === 'CUSTOM' ? '#10b981' : '#cbd5e1',
                          fontWeight: 700,
                        }}
                        onClick={() => setSplitType('CUSTOM')}
                      >
                        ✏️ Custom Lent Amount
                      </button>
                    </div>

                    {splitType === 'EQUAL' ? (
                      <>
                        <div style={{ marginBottom: '0.65rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#065f46', display: 'block', marginBottom: '0.3rem' }}>
                            Total people who ate together / shared this bill (including you):
                          </label>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            {[2, 3, 4, 5, 6].map((num) => (
                              <button
                                key={num}
                                type="button"
                                className="select-pill"
                                style={{
                                  flex: 1,
                                  justifyContent: 'center',
                                  fontSize: '0.8rem',
                                  background: peopleCount === num ? '#047857' : '#ffffff',
                                  color: peopleCount === num ? '#ffffff' : '#065f46',
                                  borderColor: peopleCount === num ? '#047857' : '#6ee7b7',
                                  fontWeight: 700,
                                }}
                                onClick={() => setPeopleCount(num)}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '0.65rem' }}>
                          <label style={{ fontSize: '0.75rem', color: '#065f46' }}>Group or Friends Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Friends, Office Team, Goa Trip"
                            className="form-control"
                            style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                            value={groupOrPersonName}
                            onChange={(e) => setGroupOrPersonName(e.target.value)}
                          />
                        </div>
                      </>
                    ) : (
                      <div style={{ marginBottom: '0.65rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065f46', margin: 0 }}>
                            People who owe you (Individual entries):
                          </label>
                          <button
                            type="button"
                            onClick={handleAddPerson}
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

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '160px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                          {customPeople.map((person, index) => (
                            <div
                              key={person.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                background: '#ffffff',
                                padding: '0.4rem 0.55rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid #cbd5e1',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', color: '#64748b' }}>
                                <LuUser size={15} />
                              </div>
                              <input
                                type="text"
                                placeholder={`Friend ${index + 1} Name (e.g. Rahul)`}
                                className="form-control"
                                style={{ flex: 1.4, fontSize: '0.82rem', padding: '0.35rem 0.5rem', margin: 0 }}
                                value={person.name}
                                onChange={(e) => handlePersonChange(person.id, 'name', e.target.value)}
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
                                  onChange={(e) => handlePersonChange(person.id, 'amount', e.target.value)}
                                />
                              </div>
                              {customPeople.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemovePerson(person.id)}
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

                    {/* Live Split Calculation Breakdown */}
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
                          ₹{computedUserShare.toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Recorded to Transactions</div>
                      </div>

                      <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '0.5rem' }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {splitType === 'EQUAL'
                            ? `Lent to ${peopleCount - 1} Friends`
                            : `Lent to ${customPeople.length} ${customPeople.length === 1 ? 'Person' : 'People'}`}
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#059669' }}>
                          ₹{computedLentAmount.toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 600 }}>
                          {splitType === 'EQUAL'
                            ? `(₹${perPersonOwed}/person) → Loans`
                            : `Added as ${customPeople.length} individual ${customPeople.length === 1 ? 'loan' : 'loans'}`}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                  onClick={() => setScannedResult(null)}
                  disabled={submitting}
                >
                  Scan Another
                </button>

                <button
                  type="button"
                  className="btn-submit-primary"
                  style={{ flex: 2, margin: 0, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  onClick={handleConfirm}
                  disabled={submitting}
                >
                  <LuCheck size={16} />
                  <span>
                    {submitting
                      ? 'Saving...'
                      : recordMode === 'SPLIT'
                      ? `Save (₹${computedUserShare} Expense + ₹${computedLentAmount} Lent)`
                      : recordMode === 'INCOME'
                      ? `Confirm Income (₹${parsedTotal.toLocaleString('en-IN')})`
                      : `Confirm Expense (₹${parsedTotal.toLocaleString('en-IN')})`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
