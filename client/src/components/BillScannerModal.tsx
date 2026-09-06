import React, { useState } from 'react';
import { ScanBillIcon } from './Icons';

interface BillScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddScannedExpense: (record: { name: string; amount: number; category: string }) => void;
}

export const BillScannerModal: React.FC<BillScannerModalProps> = ({
  isOpen,
  onClose,
  onAddScannedExpense,
}) => {
  const [scanning, setScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<{
    merchant: string;
    amount: number;
    category: string;
    items: string[];
  } | null>(null);

  if (!isOpen) return null;

  const handleSimulateScan = (preset?: 'cafe' | 'supermarket' | 'fuel') => {
    setScanning(true);
    setScannedResult(null);

    setTimeout(() => {
      setScanning(false);
      if (preset === 'cafe' || !preset) {
        setScannedResult({
          merchant: 'Starbucks Coffee',
          amount: 320,
          category: 'Food & Dining',
          items: ['1x Caffe Latte (₹240)', '1x Butter Croissant (₹80)'],
        });
      } else if (preset === 'supermarket') {
        setScannedResult({
          merchant: 'Nature Basket Supermarket',
          amount: 1450,
          category: 'Shopping',
          items: ['Organic Milk & Eggs (₹350)', 'Fruits & Veggies (₹620)', 'Snacks (₹480)'],
        });
      } else {
        setScannedResult({
          merchant: 'Shell Petrol Pump',
          amount: 2000,
          category: 'Travel',
          items: ['Petrol 18.5 Litres (₹2,000)'],
        });
      }
    }, 1200);
  };

  const handleConfirm = () => {
    if (scannedResult) {
      onAddScannedExpense({
        name: scannedResult.merchant,
        amount: scannedResult.amount,
        category: scannedResult.category,
      });
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <ScanBillIcon size={24} />
            <h3>AI Bill & Receipt Scanner</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '0.5rem 0' }}>
          {!scannedResult && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div
                style={{
                  border: '2px dashed var(--primary)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '2rem 1rem',
                  background: '#f0fdf4',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onClick={() => handleSimulateScan('cafe')}
              >
                <div style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>
                  <ScanBillIcon size={44} />
                </div>
                <h4 style={{ color: 'var(--primary-deep)', fontWeight: 800 }}>
                  {scanning ? 'Scanning Receipt...' : 'Tap to Scan or Upload Bill'}
                </h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {scanning
                    ? 'AI is parsing merchant, items & total amounts'
                    : 'Take a photo or upload receipt (JPEG, PNG, PDF)'}
                </p>

                {scanning && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: 'var(--primary)',
                      boxShadow: '0 0 10px var(--primary)',
                      animation: 'scanBar 1.2s infinite alternate',
                    }}
                  />
                )}
              </div>

              <div style={{ marginTop: '1.25rem' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Or try with sample receipts:
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <button
                    className="select-pill"
                    onClick={() => handleSimulateScan('cafe')}
                    disabled={scanning}
                  >
                    ☕ Cafe Receipt (₹320)
                  </button>
                  <button
                    className="select-pill"
                    onClick={() => handleSimulateScan('supermarket')}
                    disabled={scanning}
                  >
                    🛒 Grocery (₹1,450)
                  </button>
                  <button
                    className="select-pill"
                    onClick={() => handleSimulateScan('fuel')}
                    disabled={scanning}
                  >
                    ⛽ Fuel (₹2,000)
                  </button>
                </div>
              </div>
            </div>
          )}

          {scannedResult && (
            <div style={{ background: '#f8fafc', borderRadius: 'var(--radius-lg)', padding: '1.25rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800 }}>{scannedResult.merchant}</h4>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-emerald)', fontWeight: 700 }}>
                    {scannedResult.category}
                  </span>
                </div>
                <strong style={{ fontSize: '1.35rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                  ₹{scannedResult.amount.toLocaleString('en-IN')}
                </strong>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Extracted Bill Items:
                </p>
                {scannedResult.items.map((item, idx) => (
                  <div key={idx} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', padding: '0.15rem 0' }}>
                    • {item}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    background: '#e2e8f0',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  onClick={() => setScannedResult(null)}
                >
                  Scan Again
                </button>
                <button
                  type="button"
                  className="btn-submit-primary"
                  style={{ flex: 1.5, margin: 0 }}
                  onClick={handleConfirm}
                >
                  Add to Expenses
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
