import React from 'react';

export const FinapseLogo: React.FC<{ size?: number; className?: string }> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
    <rect width="40" height="40" rx="10" fill="#10B981" />
    <path d="M10 30 C10 20 16 10 30 10 C30 20 24 30 10 30 Z" fill="#ffffff" />
    <path d="M10 30 C17 25 22 19 30 10" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
    <path d="M18 23 C20 21.5 23 20 25 17.5" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const LeafSproutIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 21V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 14C8 14 5 11 5 7C9 7 12 10 12 14Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M12 11C16 11 19 8 19 4C15 4 12 7 12 11Z" fill="currentColor" fillOpacity="0.8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

export const IncomeCardIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="4" width="20" height="16" rx="4" fill="#ECFDF5" stroke="#10B981" strokeWidth="1.8" />
    <path d="M7 14L12 9L17 14" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 9V17" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const ExpenseCardIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="4" width="20" height="16" rx="4" fill="#FEF2F2" stroke="#F87171" strokeWidth="1.8" />
    <circle cx="12" cy="12" r="5" fill="#EF4444" fillOpacity="0.15" />
    <path d="M12 9.5V12L13.5 13.5" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SavingsCardIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="4" width="20" height="16" rx="4" fill="#ECFDF5" stroke="#10B981" strokeWidth="1.8" />
    <path d="M12 17C15 17 17 14.5 17 12C14.5 12 12 14.5 12 17Z" fill="#10B981" />
    <path d="M12 12C12 9 9.5 7 7 7C7 9.5 9 12 12 12Z" fill="#059669" />
  </svg>
);

export const SettlementsCardIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="4" width="20" height="16" rx="4" fill="#EEF2FF" stroke="#818CF8" strokeWidth="1.8" />
    <circle cx="9" cy="10" r="2.5" fill="#6366F1" />
    <circle cx="15" cy="10" r="2.5" fill="#818CF8" />
    <path d="M5.5 17C5.5 14.8 7 13.5 9 13.5C10.2 13.5 11.2 14.1 11.8 15" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12.5 15C13.1 14.1 14.1 13.5 15.3 13.5C17.3 13.5 18.8 14.8 18.8 17" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const SearchIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const BellIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export const CalendarIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="3" ry="3" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export const ChevronDownIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const ChevronRightIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export const EyeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOffIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export const PlusIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const MinusIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const PencilEditIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export const TrashIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

export const ScanBillIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" stroke="#10B981" strokeWidth="2.5" />
    <line x1="8" y1="17" x2="12" y2="17" />
  </svg>
);

export const UsersGroupIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const DownloadAppIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="3" />
    <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" />
    <path d="M12 7V13M9 10L12 13L15 10" stroke="#10B981" strokeWidth="2" />
  </svg>
);

// Navigation Icons
export const NavIcons = {
  Dashboard: ({ active = false }: { active?: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#047857' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Transactions: ({ active = false }: { active?: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#047857' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  ),
  Budgets: ({ active = false }: { active?: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#047857' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  ),
  Analytics: ({ active = false }: { active?: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#047857' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  Loans: ({ active = false }: { active?: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#047857' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Goals: ({ active = false }: { active?: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#047857' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  Statements: ({ active = false }: { active?: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#047857' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Settings: ({ active = false }: { active?: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#047857' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
};

// Brand Badges
export const StarbucksBadge: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: '#006241', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
    <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  </div>
);

export const AmazonBadge: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111827', fontWeight: 800, fontSize: `${size * 0.45}px`, fontFamily: 'sans-serif' }}>
    a
  </div>
);

export const SalaryBadge: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
    <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  </div>
);

export const ZomatoBadge: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <div style={{ width: size, height: size, borderRadius: '8px', backgroundColor: '#E23744', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: `${size * 0.28}px`, letterSpacing: '-0.5px' }}>
    zomato
  </div>
);

export const CategoryBadge: React.FC<{ category?: string; size?: number }> = ({ category = '', size = 36 }) => {
  const cat = category.toLowerCase();
  if (cat.includes('starbuck') || cat.includes('coffee')) return <StarbucksBadge size={size} />;
  if (cat.includes('amazon') || cat.includes('shopping')) return <AmazonBadge size={size} />;
  if (cat.includes('salary') || cat.includes('income')) return <SalaryBadge size={size} />;
  if (cat.includes('zomato') || cat.includes('food') || cat.includes('dining')) return <ZomatoBadge size={size} />;
  
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: `${size * 0.4}px`, fontWeight: 600 }}>
      {category ? category.charAt(0).toUpperCase() : '₹'}
    </div>
  );
};
