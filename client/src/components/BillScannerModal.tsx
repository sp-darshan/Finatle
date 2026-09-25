import React, { useState, useRef, useEffect } from 'react';
import { ScanBillIcon, CategoryBadge, UsersGroupIcon, MinusIcon, PlusIcon } from './Icons';
import { LuUpload, LuCamera, LuCheck, LuPlus, LuTrash2, LuUser, LuX, LuUsers, LuPenLine, LuWallet } from 'react-icons/lu';
import { CategoryPicker } from './CategoryPicker';
import { CustomDropdown } from './CustomDropdown';
import { formatRupee } from '../lib/formatters';
import { apiFetch } from '../lib/api';
import type { AccountItem } from '../types/account.types';

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
  accountId?: string;
  items?: Array<{ id?: string; name: string; price: number; quantity?: number }>;
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
  accounts?: AccountItem[];
  selectedAccountId?: string | 'ALL';
  onConfirmBill: (payload: ScannedBillPayload) => Promise<void> | void;
}

export const BillScannerModal: React.FC<BillScannerModalProps> = ({
  isOpen,
  onClose,
  token,
  accounts = [],
  selectedAccountId = 'ALL',
  onConfirmBill,
}) => {
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSpecificAccount = Boolean(selectedAccountId && selectedAccountId !== 'ALL');
  const [modalAccountId, setModalAccountId] = useState<string>(() => {
    if (isSpecificAccount) return selectedAccountId as string;
    const defaultAcc = accounts.find((a) => a.isDefault) || accounts[0];
    return defaultAcc ? (defaultAcc.aid || defaultAcc.id || '') : '';
  });

  useEffect(() => {
    if (!isOpen) return;
    if (isSpecificAccount) {
      setModalAccountId(selectedAccountId as string);
    } else if (accounts.length > 0) {
      setModalAccountId((prev) => {
        if (prev && accounts.some((a) => (a.aid || a.id) === prev)) return prev;
        const defaultAcc = accounts.find((a) => a.isDefault) || accounts[0];
        return defaultAcc ? (defaultAcc.aid || defaultAcc.id || '') : '';
      });
    }
  }, [isOpen, selectedAccountId, isSpecificAccount, accounts]);

  // Scanned result state
  const [scannedResult, setScannedResult] = useState<{
    merchant: string;
    amount: number;
    category: string;
    date: string;
    items: Array<{ name: string; price: number; quantity?: number }>;
  } | null>(null);

  // Editable line items breakdown
  const [items, setItems] = useState<Array<{ name: string; price: number; quantity?: number }>>([]);
  const [isEditingItems, setIsEditingItems] = useState(false);

  // Editable bill fields
  const [merchantName, setMerchantName] = useState('');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [category, setCategory] = useState('Dining');
  const [otherCategory, setOtherCategory] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);

  // Mode: EXPENSE | INCOME | SPLIT
  const [recordMode, setRecordMode] = useState<'EXPENSE' | 'INCOME' | 'SPLIT'>('EXPENSE');

  // Split configurations
  const [splitType, setSplitType] = useState<'EQUAL' | 'CUSTOM'>('EQUAL');
  const [peopleCount, setPeopleCount] = useState<number>(4);
  const [equalFriendNames, setEqualFriendNames] = useState<string[]>(['', '', '']);
  const [customPeople, setCustomPeople] = useState<CustomLentPerson[]>([
    { id: '1', name: '', amount: '' },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');
    return () => {
      if (!document.querySelector('.modal-overlay')) {
        document.body.classList.remove('modal-open');
        document.documentElement.classList.remove('modal-open');
      }
    };
  }, [isOpen]);

  const resetForm = () => {
    setScannedResult(null);
    setItems([]);
    setIsEditingItems(false);
    setMerchantName('');
    setTotalAmount('');
    setCategory('Dining');
    setOtherCategory('');
    setBillDate(new Date().toISOString().split('T')[0]);
    setRecordMode('EXPENSE');
    setSplitType('EQUAL');
    setPeopleCount(4);
    setEqualFriendNames(['', '', '']);
    setCustomPeople([{ id: '1', name: '', amount: '' }]);
    setError(null);
    setScanStatus('');
    setScanning(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const handleSetPeopleCount = (newCount: number) => {
    const count = Math.max(2, newCount);
    setPeopleCount(count);
    setEqualFriendNames((prev) => {
      const targetCount = count - 1;
      const updated = [...prev];
      while (updated.length < targetCount) {
        updated.push('');
      }
      return updated.slice(0, targetCount);
    });
  };

  const handleAddEqualFriend = () => {
    setPeopleCount((prev) => prev + 1);
    setEqualFriendNames((prev) => [...prev, '']);
  };

  const handleRemoveEqualFriend = (idx: number) => {
    if (peopleCount <= 2) return;
    setPeopleCount((prev) => prev - 1);
    setEqualFriendNames((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleEqualFriendNameChange = (idx: number, name: string) => {
    setEqualFriendNames((prev) => prev.map((n, i) => (i === idx ? name : n)));
  };

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

  const handleUpdateItem = (idx: number, field: 'name' | 'price' | 'quantity', val: any) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        if (field === 'price') {
          const p = parseFloat(val);
          return { ...item, price: isNaN(p) ? 0 : p };
        }
        if (field === 'quantity') {
          const q = parseInt(val, 10);
          return { ...item, quantity: isNaN(q) || q < 1 ? 1 : q };
        }
        return { ...item, [field]: val };
      })
    );
  };

  const handleRemoveItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { name: '', price: 0, quantity: 1 }]);
    setIsEditingItems(true);
  };



  const handleSetScanData = (data: {
    merchant: string;
    amount: number;
    category: string;
    date?: string;
    items?: Array<{ name: string; price: number; quantity?: number }>;
  }) => {
    const today = new Date().toISOString().split('T')[0];
    const initialItems = data.items || [];
    setScannedResult({
      merchant: data.merchant || 'Store Bill',
      amount: data.amount || 0,
      category: data.category || 'Dining',
      date: today,
      items: initialItems,
    });
    setItems(initialItems);
    setIsEditingItems(false);
    setMerchantName(data.merchant || 'Store Bill');
    setTotalAmount(String(data.amount || ''));
    setCategory(data.category || 'Dining');
    setBillDate(today);
    setRecordMode('EXPENSE');
    setCustomPeople([
      { id: '1', name: '', amount: String(Math.round((data.amount || 0) * 0.5 * 100) / 100) },
    ]);
  };

  // Fast client-side image compression & downsampling (prevents multi-MB payload latency)
  const compressReceiptImage = (file: File, maxDimension = 1600, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(event.target?.result as string);
        img.src = event.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Scan via Uploaded Image / Camera Photo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setScanStatus('Optimizing & analyzing receipt...');
    setError(null);

    try {
      if (!token) {
        throw new Error('Please sign in to scan bills.');
      }

      const base64 = await compressReceiptImage(file);

      const res = await apiFetch('/api/finance/scan-bill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: 'image/jpeg',
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || json.error || 'Receipt extraction failed.');
      }

      const resultData = json.data || json;
      handleSetScanData(resultData);
    } catch (err: any) {
      setError(err.message || 'Failed to extract bill details.');
    } finally {
      setScanning(false);
      setScanStatus('');
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  // Calculations for Split Mode
  const parsedTotal = parseFloat(totalAmount) || 0;
  let computedUserShare = parsedTotal;
  let computedLentAmount = 0;
  let perPersonOwed = 0;

  if (recordMode === 'SPLIT') {
    if (splitType === 'EQUAL') {
      const validPeopleCount = Math.max(2, peopleCount);
      computedUserShare = Math.round((parsedTotal / validPeopleCount) * 100) / 100;
      computedLentAmount = Math.round((parsedTotal - computedUserShare) * 100) / 100;
      perPersonOwed = Math.round((computedLentAmount / (validPeopleCount - 1)) * 100) / 100;
    } else {
      computedLentAmount = customPeople.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      computedUserShare = Math.max(0, Math.round((parsedTotal - computedLentAmount) * 100) / 100);
    }
  }

  // Submit Handler
  const handleConfirm = async () => {
    if (!merchantName.trim()) {
      setError('Please provide a merchant or expense description.');
      return;
    }

    if (isNaN(parsedTotal) || parsedTotal <= 0) {
      setError('Please provide a valid bill amount greater than ₹0.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const finalCategory = category === 'Other' && otherCategory.trim() ? otherCategory.trim() : category;

      const effectiveAccountId = isSpecificAccount ? (selectedAccountId as string) : modalAccountId;

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

          const validItems = items
            .filter((it) => it.name.trim() || Number(it.price) > 0)
            .map((it) => ({
              name: it.name.trim() || 'Item',
              price: Number(it.price) || 0,
              quantity: Number(it.quantity) || 1,
            }));

          await onConfirmBill({
            mode: 'SPLIT',
            name: merchantName.trim(),
            category: finalCategory,
            amount: parsedTotal,
            date: billDate,
            accountId: effectiveAccountId || undefined,
            items: validItems,
            splitDetails: {
              peopleCount: validPeople.length + 1,
              userShare: computedUserShare,
              lentAmount: computedLentAmount,
              personName: validPeople.map((p) => p.personName).join(', '),
              description: merchantName.trim(),
              lentEntries: validPeople,
            },
          });
        } else {
          const validFriends = equalFriendNames.map((name, idx) => ({
            personName: name.trim() || `Friend ${idx + 1}`,
            amount: perPersonOwed,
            description: `${merchantName.trim()} split`,
          }));

          const validItems = items
            .filter((it) => it.name.trim() || Number(it.price) > 0)
            .map((it) => ({
              name: it.name.trim() || 'Item',
              price: Number(it.price) || 0,
              quantity: Number(it.quantity) || 1,
            }));

          await onConfirmBill({
            mode: 'SPLIT',
            name: merchantName.trim(),
            category: finalCategory,
            amount: parsedTotal,
            date: billDate,
            accountId: effectiveAccountId || undefined,
            items: validItems,
            splitDetails: {
              peopleCount: peopleCount,
              userShare: computedUserShare,
              lentAmount: computedLentAmount,
              personName: validFriends.map((f) => f.personName).join(', '),
              description: merchantName.trim(),
              lentEntries: validFriends,
            },
          });
        }
      } else {
        const validItems = items
          .filter((it) => it.name.trim() || Number(it.price) > 0)
          .map((it) => ({
            name: it.name.trim() || 'Item',
            price: Number(it.price) || 0,
            quantity: Number(it.quantity) || 1,
          }));

        await onConfirmBill({
          mode: recordMode,
          name: merchantName.trim(),
          category: finalCategory,
          amount: parsedTotal,
          date: billDate,
          accountId: effectiveAccountId || undefined,
          items: validItems,
        });
      }
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save scanned bill.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-card" style={{ maxWidth: 540, width: '100%', boxSizing: 'border-box', overflowX: 'hidden' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <ScanBillIcon size={24} />
            <div>
              <h3>Bill & Receipt Scanner</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Smart receipt extraction & instant record creation
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={handleClose} aria-label="Close modal">
            <LuX size={18} />
          </button>
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
              {/* Gallery / File Picker */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              {/* Direct Camera Capture */}
              <input
                ref={cameraInputRef}
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
                  padding: '1.75rem 1.25rem',
                  background: '#f0fdf4',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ color: '#10b981', marginBottom: '0.5rem', display: 'flex', justifyContent: 'center', gap: '0.65rem' }}>
                  <LuCamera size={32} />
                  <LuUpload size={32} />
                </div>
                <h4 style={{ color: '#065f46', fontWeight: 800, fontSize: '1.05rem' }}>
                  {scanning ? (scanStatus || 'Processing Image...') : 'Scan Bill or Receipt'}
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#047857', marginTop: '0.25rem', marginBottom: '1.15rem' }}>
                  {scanning
                    ? 'Extracting merchant, line items, taxes & total amount'
                    : 'Capture a live photo with your camera or upload an existing receipt from your gallery'}
                </p>

                {!scanning && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', maxWidth: '380px', margin: '0 auto' }}>
                    <button
                      type="button"
                      className="btn-submit-primary"
                      style={{
                        padding: '0.65rem 0.85rem',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        background: '#059669',
                        boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                      }}
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <LuCamera size={16} /> Take Photo
                    </button>

                    <button
                      type="button"
                      className="btn-submit-primary"
                      style={{
                        padding: '0.65rem 0.85rem',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        background: '#ffffff',
                        color: '#065f46',
                        border: '1.5px solid #10b981',
                        boxShadow: '0 2px 6px rgba(16, 185, 129, 0.12)',
                      }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <LuUpload size={16} /> Upload Photo
                    </button>
                  </div>
                )}

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                    <CategoryBadge name={merchantName} category={category} size={40} />
                    <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <LuCheck size={13} /> Extracted Details
                      </div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }} title={merchantName}>
                        {merchantName || 'Store Bill'}
                      </h4>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Amount</div>
                    <strong style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                      {formatRupee(parsedTotal)}
                    </strong>
                  </div>
                </div>

                {/* Itemized Line Items Breakdown */}
                <div style={{ marginTop: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.6rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                      Itemized Breakdown ({items.length} {items.length === 1 ? 'item' : 'items'})
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        type="button"
                        style={{
                          background: isEditingItems ? '#ecfdf5' : '#f1f5f9',
                          border: isEditingItems ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                          color: isEditingItems ? '#047857' : 'var(--text-secondary, #475569)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '9999px',
                          transition: 'all 0.15s ease',
                        }}
                        onClick={() => setIsEditingItems((prev) => !prev)}
                      >
                        <LuPenLine size={12} /> {isEditingItems ? 'Done' : 'Edit Items'}
                      </button>
                    </div>
                  </div>

                  {isEditingItems ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingRight: '0.2rem' }}>
                        {items.map((item, idx) => (
                          <div key={idx} className="receipt-item-row">
                            <input
                              type="text"
                              placeholder={`Item ${idx + 1} name`}
                              className="receipt-item-input"
                              value={item.name}
                              onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                            />
                            <input
                              type="number"
                              min="1"
                              placeholder="Qty"
                              className="receipt-item-input"
                              style={{ textAlign: 'center', padding: '0.38rem 0.25rem' }}
                              value={item.quantity || 1}
                              onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                              title="Quantity"
                            />
                            <div style={{ position: 'relative' }}>
                              <span style={{ position: 'absolute', left: '0.45rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>
                                ₹
                              </span>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                placeholder="Price"
                                className="receipt-item-input"
                                style={{ paddingLeft: '1.15rem', paddingRight: '0.3rem', fontWeight: 700 }}
                                value={item.price || ''}
                                onChange={(e) => handleUpdateItem(idx, 'price', e.target.value)}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="receipt-delete-item-btn"
                              title="Remove item"
                            >
                              <LuTrash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px dashed #e2e8f0' }}>
                        <button
                          type="button"
                          className="btn-add-item-pill"
                          onClick={handleAddItem}
                        >
                          <LuPlus size={13} /> Add Item
                        </button>
                      </div>
                    </div>
                  ) : (
                    items.length > 0 ? (
                      <div style={{ maxHeight: '130px', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {items.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#475569', gap: '0.5rem', minWidth: 0 }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }} title={item.name}>
                              • {item.name} {item.quantity && item.quantity > 1 ? `(x${item.quantity})` : ''}
                            </span>
                            <span style={{ fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>{formatRupee((Number(item.price) || 0) * (item.quantity || 1))}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                        <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 0.5rem 0' }}>
                          No itemized items detected in receipt.
                        </p>
                        <button
                          type="button"
                          className="btn-add-item-premium"
                          style={{ maxWidth: '200px', margin: '0 auto', padding: '0.45rem 0.8rem', fontSize: '0.76rem' }}
                          onClick={handleAddItem}
                        >
                          <LuPlus size={14} /> Add Item Breakdown
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Account Selector (Only shown in 'All Accounts' mode; in specific account mode, it is automatically assigned without asking) */}
              {accounts.length > 0 && !isSpecificAccount && (
                <div className="form-group" style={{ marginBottom: '0.85rem', width: '100%', boxSizing: 'border-box' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    <LuWallet size={14} color="var(--primary)" />
                    <span>Account</span>
                  </label>
                  <CustomDropdown
                    variant="form"
                    value={modalAccountId}
                    onChange={setModalAccountId}
                    options={accounts.map((acc) => ({
                      value: acc.aid || acc.id || '',
                      label: acc.name,
                      badge: acc.type,
                      sublabel: `${acc.accountNumber ? `•••• ${acc.accountNumber} • ` : ''}Balance: ${formatRupee(Number(acc.balance ?? acc.initialBalance ?? 0))}`,
                    }))}
                    icon={<LuWallet size={16} />}
                    placeholder="Select an account"
                    aria-label="Select account"
                  />
                </div>
              )}

              {/* Editable Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '0.65rem', marginBottom: '0.85rem', width: '100%', boxSizing: 'border-box' }}>
                <div className="form-group" style={{ margin: 0, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.75rem' }}>Merchant / Place Name</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.65rem', width: '100%', maxWidth: '100%', boxSizing: 'border-box', minWidth: 0 }}
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.75rem' }}>Total Amount (₹)</label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    className="form-control"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.65rem', fontWeight: 700, width: '100%', maxWidth: '100%', boxSizing: 'border-box', minWidth: 0 }}
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.75rem' }}>Category</label>
                  <CategoryPicker
                    value={category}
                    onChange={setCategory}
                    otherValue={otherCategory}
                    onOtherChange={setOtherCategory}
                  />
                </div>

                <div className="form-group" style={{ margin: 0, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.75rem' }}>Bill Date</label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.65rem', width: '100%', maxWidth: '100%', boxSizing: 'border-box', minWidth: 0 }}
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                  />
                </div>
              </div>

              {/* RECORD TYPE SELECTION TABS */}
              <div style={{ marginBottom: '1rem', width: '100%', boxSizing: 'border-box' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem', display: 'block' }}>
                  Record this bill as:
                </label>
                <div className="modal-tabs" style={{ marginBottom: '0.65rem', width: '100%', boxSizing: 'border-box' }}>
                  <button
                    type="button"
                    className={`modal-tab-btn ${recordMode === 'EXPENSE' ? 'active' : ''}`}
                    onClick={() => setRecordMode('EXPENSE')}
                  >
                    <MinusIcon size={13} />
                    <span>Expense</span>
                  </button>
                  <button
                    type="button"
                    className={`modal-tab-btn ${recordMode === 'INCOME' ? 'active' : ''}`}
                    onClick={() => setRecordMode('INCOME')}
                  >
                    <PlusIcon size={13} />
                    <span>Income</span>
                  </button>
                  <button
                    type="button"
                    className={`modal-tab-btn ${recordMode === 'SPLIT' ? 'active' : ''}`}
                    onClick={() => setRecordMode('SPLIT')}
                  >
                    <UsersGroupIcon size={13} />
                    <span>Split / Lent</span>
                  </button>
                </div>
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
                      <LuUsers size={14} style={{ display: 'inline', marginRight: '0.35rem' }} /> Equal Split
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
                      <LuPenLine size={14} style={{ display: 'inline', marginRight: '0.35rem' }} /> Custom Split
                    </button>
                  </div>

                  {splitType === 'EQUAL' ? (
                    <>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065f46', margin: 0 }}>
                            Total people sharing bill (including you):
                          </label>
                          <span style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 700 }}>
                            You + {peopleCount - 1} {peopleCount - 1 === 1 ? 'Friend' : 'Friends'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {[2, 3, 4, 5, 6].map((num) => (
                            <button
                              key={num}
                              type="button"
                              className="select-pill"
                              style={{
                                flex: 1,
                                justifyContent: 'center',
                                fontSize: '0.8rem',
                                padding: '0.35rem 0.2rem',
                                background: peopleCount === num ? '#047857' : '#ffffff',
                                color: peopleCount === num ? '#ffffff' : '#065f46',
                                borderColor: peopleCount === num ? '#047857' : '#6ee7b7',
                                fontWeight: 700,
                                minWidth: 0,
                              }}
                              onClick={() => handleSetPeopleCount(num)}
                            >
                              {num}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => handleSetPeopleCount(peopleCount - 1)}
                            disabled={peopleCount <= 2}
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid #6ee7b7',
                              background: '#ffffff',
                              color: '#065f46',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: peopleCount <= 2 ? 'not-allowed' : 'pointer',
                              opacity: peopleCount <= 2 ? 0.5 : 1,
                              flexShrink: 0,
                            }}
                            title="Decrease people"
                          >
                            <MinusIcon size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetPeopleCount(peopleCount + 1)}
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid #6ee7b7',
                              background: '#ffffff',
                              color: '#065f46',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                            title="Increase people"
                          >
                            <PlusIcon size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Friends' Names Input List */}
                      <div style={{ marginBottom: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065f46', margin: 0 }}>
                            Friends' Names ({equalFriendNames.length} {equalFriendNames.length === 1 ? 'Friend' : 'Friends'}):
                          </label>
                          <button
                            type="button"
                            onClick={handleAddEqualFriend}
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
                            <LuPlus size={13} /> Add Friend
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '170px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                          {equalFriendNames.map((name, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                background: '#ffffff',
                                padding: '0.45rem 0.55rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid #cbd5e1',
                                boxSizing: 'border-box',
                                width: '100%',
                              }}
                            >
                              <LuUser size={14} style={{ color: '#64748b', flexShrink: 0 }} />
                              <input
                                type="text"
                                placeholder={`Friend ${idx + 1} Name (e.g. Rahul)`}
                                className="form-control"
                                style={{ flex: 1, fontSize: '0.82rem', padding: '0.35rem 0.5rem', margin: 0, minWidth: 0 }}
                                value={name}
                                onChange={(e) => handleEqualFriendNameChange(idx, e.target.value)}
                              />
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#047857', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                {formatRupee(perPersonOwed)}
                              </span>
                              {peopleCount > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEqualFriend(idx)}
                                  style={{
                                    background: '#fee2e2',
                                    border: 'none',
                                    color: '#dc2626',
                                    borderRadius: 'var(--radius-sm)',
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                  }}
                                  title={`Remove Friend ${idx + 1}`}
                                >
                                  <LuTrash2 size={12} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
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
                        {formatRupee(computedUserShare)}
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
                        {formatRupee(computedLentAmount)}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 600 }}>
                        {splitType === 'EQUAL'
                          ? `(${formatRupee(perPersonOwed)}/person) → Loans`
                          : `Added as ${customPeople.length} individual ${customPeople.length === 1 ? 'loan' : 'loans'}`}
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                  onClick={resetForm}
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
                        ? `Save (${formatRupee(computedUserShare)} Expense + ${formatRupee(computedLentAmount)} Lent)`
                        : recordMode === 'INCOME'
                          ? `Confirm Income (${formatRupee(parsedTotal)})`
                          : `Confirm Expense (${formatRupee(parsedTotal)})`}
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
