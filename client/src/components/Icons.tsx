import React, { useState } from 'react';
import {
  LuSearch,
  LuBell,
  LuCalendar,
  LuChevronDown,
  LuChevronRight,
  LuEye,
  LuEyeOff,
  LuPlus,
  LuMinus,
  LuPencil,
  LuTrash2,
  LuScanLine,
  LuUsers,
  LuSmartphone,
  LuUser,
  LuPhone,
  LuMail,
  LuLock,
  LuShield,
  LuKey,
  LuLayoutDashboard,
  LuReceipt,
  LuSettings,
  LuTrendingUp,
  LuTrendingDown,
  LuPiggyBank,
  LuHandshake,
  LuSprout,
  LuUtensils,
  LuShoppingBag,
  LuPlane,
  LuZap,
  LuFilm,
} from 'react-icons/lu';

import {
  FaHouse,
  FaCircleCheck,
  FaChartPie,
  FaChartSimple,
  FaAmazon,
} from 'react-icons/fa6';

import {
  SiStarbucks,
  SiZomato,
} from 'react-icons/si';

import { matchIcon } from '../lib/iconMatcher';

// Brand Logo
export const FinatleLogo: React.FC<{ size?: number; className?: string }> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
    <rect width="40" height="40" rx="10" fill="#10B981" />
    <path d="M10 30 C10 20 16 10 30 10 C30 20 24 30 10 30 Z" fill="#ffffff" />
    <path d="M10 30 C17 25 22 19 30 10" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
    <path d="M18 23 C20 21.5 23 20 25 17.5" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const LeafSproutIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <LuSprout size={size} className={className} />
);

export const IncomeCardIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
    <LuTrendingUp size={size} />
  </div>
);

export const ExpenseCardIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
    <LuTrendingDown size={size} />
  </div>
);

export const SavingsCardIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
    <LuPiggyBank size={size} />
  </div>
);

export const SettlementsCardIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1' }}>
    <LuHandshake size={size} />
  </div>
);

// Basic UI React Icons
export const SearchIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <LuSearch size={size} className={className} />
);

export const BellIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <LuBell size={size} className={className} />
);

export const CalendarIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <LuCalendar size={size} className={className} />
);

export const ChevronDownIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <LuChevronDown size={size} className={className} />
);

export const ChevronRightIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <LuChevronRight size={size} className={className} />
);

export const EyeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <LuEye size={size} className={className} />
);

export const EyeOffIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <LuEyeOff size={size} className={className} />
);

export const PlusIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <LuPlus size={size} className={className} />
);

export const MinusIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <LuMinus size={size} className={className} />
);

export const PencilEditIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <LuPencil size={size} className={className} />
);

export const TrashIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <LuTrash2 size={size} className={className} />
);

export const ScanBillIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <LuScanLine size={size} className={className} />
);

export const UsersGroupIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <LuUsers size={size} className={className} />
);

export const DownloadAppIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <LuSmartphone size={size} className={className} />
);

export const UserIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <LuUser size={size} className={className} />
);

export const PhoneIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <LuPhone size={size} className={className} />
);

export const MailIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <LuMail size={size} className={className} />
);

export const LockIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <LuLock size={size} className={className} />
);

export const ShieldIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <LuShield size={size} className={className} />
);

export const KeyIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <LuKey size={size} className={className} />
);

export const CheckCircleIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <FaCircleCheck size={size} className={className} />
);

// Navigation React Icons
export const NavIcons = {
  Dashboard: ({ active = false }: { active?: boolean }) => (
    <LuLayoutDashboard size={20} color={active ? '#047857' : '#64748b'} />
  ),
  Transactions: ({ active = false }: { active?: boolean }) => (
    <LuReceipt size={20} color={active ? '#047857' : '#64748b'} />
  ),
  Budgets: ({ active = false }: { active?: boolean }) => (
    <FaChartPie size={20} color={active ? '#047857' : '#64748b'} />
  ),
  Analytics: ({ active = false }: { active?: boolean }) => (
    <FaChartSimple size={20} color={active ? '#047857' : '#64748b'} />
  ),
  Loans: ({ active = false }: { active?: boolean }) => (
    <LuUsers size={20} color={active ? '#047857' : '#64748b'} />
  ),
  Settings: ({ active = false }: { active?: boolean }) => (
    <LuSettings size={20} color={active ? '#047857' : '#64748b'} />
  ),
};

// Brand Badges built with React Icons
export const StarbucksBadge: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: '#006241', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
    <SiStarbucks size={size * 0.6} />
  </div>
);

export const AmazonBadge: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF9900' }}>
    <FaAmazon size={size * 0.6} />
  </div>
);

export const SalaryBadge: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
    <LuTrendingUp size={size * 0.55} />
  </div>
);

export const ZomatoBadge: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <div style={{ width: size, height: size, borderRadius: '8px', backgroundColor: '#FFE4E6', border: '1px solid #FECDD3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E23744' }}>
    <SiZomato size={size * 0.65} />
  </div>
);

export const FoodBadge: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: '#D1FAE5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#047857' }}>
    <LuUtensils size={size * 0.55} />
  </div>
);

export const ShoppingBadge: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: '#DBEAFE', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
    <LuShoppingBag size={size * 0.55} />
  </div>
);

export const HousingBadge: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: '#CCFBF1', border: '1px solid #99F6E4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F766E' }}>
    <FaHouse size={size * 0.55} />
  </div>
);

export const TravelBadge: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B45309' }}>
    <LuPlane size={size * 0.55} />
  </div>
);

export const UtilitiesBadge: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: '#CFFAFE', border: '1px solid #A5F3FC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0E7490' }}>
    <LuZap size={size * 0.55} />
  </div>
);

export const EntertainmentBadge: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: '#FFE4E6', border: '1px solid #FECDD3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#BE123C' }}>
    <LuFilm size={size * 0.55} />
  </div>
);

/**
 * Dynamic smart category / brand icon badge that matches keywords in description,
 * attempts web favicon retrieval with automatic fallback to React Icons.
 */
export const CategoryBadge: React.FC<{
  category?: string;
  name?: string;
  size?: number;
  className?: string;
}> = ({ category = '', name = '', size = 36, className = '' }) => {
  const match = matchIcon(name || category, category);
  const [imgFailed, setImgFailed] = useState(false);

  // Web favicon URL from Google Favicons service
  const faviconUrl = match.domain
    ? `https://www.google.com/s2/favicons?domain=${match.domain}&sz=128`
    : null;

  const IconComponent = match.icon;

  return (
    <div
      className={`smart-category-badge ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: size > 32 ? '10px' : '8px',
        backgroundColor: match.badgeBg,
        border: `1px solid ${match.badgeBorder}`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: match.badgeColor,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      title={name || category}
    >
      {faviconUrl && !imgFailed ? (
        <img
          src={faviconUrl}
          alt={name || category}
          style={{
            width: size * 0.58,
            height: size * 0.58,
            objectFit: 'contain',
            borderRadius: '4px',
          }}
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <IconComponent size={size * 0.55} />
      )}
    </div>
  );
};
