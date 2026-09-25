import React, { useState, useEffect } from 'react';
import {
  UserIcon,
  PhoneIcon,
  MailIcon,
  LockIcon,
  ShieldIcon,
  KeyIcon,
  CheckCircleIcon,
  TrashIcon,
} from './Icons';
import { LuCircleAlert, LuInfo, LuFileSpreadsheet, LuFileJson, LuX, LuCheck } from 'react-icons/lu';
import { apiFetch } from '../lib/api';
import type { TransactionItem } from './RecentTransactions';
import { CustomDropdown } from './CustomDropdown';

interface SettingsUser {
  uid: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  age?: number | null;
}

interface SettingsViewProps {
  user: SettingsUser | null;
  token: string | null;
  transactions?: TransactionItem[];
  onUpdateUser: (updatedUser: SettingsUser) => void;
  onLogout: () => void;
  onDeleteAccount?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  token,
  transactions = [],
  onUpdateUser,
  onLogout,
  onDeleteAccount,
}) => {
  // Profile State
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [age, setAge] = useState(user?.age ? String(user.age) : '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Security & Password Change with OTP State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [securityMessage, setSecurityMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Preferences State
  const [currency, setCurrency] = useState(localStorage.getItem('finatle_pref_currency') || 'INR (₹)');
  const [budgetAlerts, setBudgetAlerts] = useState(localStorage.getItem('finatle_pref_budget_alerts') !== 'false');
  const [weeklyReports, setWeeklyReports] = useState(localStorage.getItem('finatle_pref_weekly_reports') === 'true');

  // Danger Zone
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Sync user state when props change
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAge(user.age ? String(user.age) : '');
    }
  }, [user]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval: any;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  // Save Profile Details (Name, Phone, Age)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setProfileSaving(true);

    try {
      if (token) {
        const res = await apiFetch('/api/auth/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim(),
            age: age ? parseInt(age, 10) : null,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || data.error || 'Failed to update profile');
        }

        if (data.user) {
          setName(data.user.name || '');
          setPhone(data.user.phone || '');
          setAge(data.user.age ? String(data.user.age) : '');
          onUpdateUser({
            ...user,
            ...data.user,
          });
        }
      } else {
        // Guest mode fallback
        const updatedLocal = {
          ...user,
          name: name.trim() || null,
          phone: phone.trim() || null,
          age: age ? parseInt(age, 10) : null,
        } as SettingsUser;
        setName(updatedLocal.name || '');
        setPhone(updatedLocal.phone || '');
        setAge(updatedLocal.age ? String(updatedLocal.age) : '');
        onUpdateUser(updatedLocal);
      }

      setProfileMessage({ text: 'Profile details saved successfully!', type: 'success' });
      setTimeout(() => setProfileMessage(null), 4000);
    } catch (err: any) {
      setProfileMessage({ text: err.message || 'Error updating profile', type: 'error' });
    } finally {
      setProfileSaving(false);
    }
  };

  // Step 1: Send OTP to email for password change
  const handleRequestOtp = async () => {
    setSecurityMessage(null);
    setDevOtpHint(null);

    if (!newPassword) {
      setSecurityMessage({ text: 'Please enter a new password first.', type: 'error' });
      return;
    }

    if (newPassword.length < 6) {
      setSecurityMessage({ text: 'New password must be at least 6 characters long.', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityMessage({ text: 'Passwords do not match. Please recheck.', type: 'error' });
      return;
    }

    setOtpSending(true);

    try {
      if (token) {
        const res = await apiFetch('/api/auth/send-otp', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || data.error || 'Failed to send OTP code');
        }

        setOtpSent(true);
        setOtpTimer(60); // 60s cooldown
        if (data.devOtp) {
          setDevOtpHint(data.devOtp);
        }
        setSecurityMessage({
          text: `Verification code sent to ${user?.email || 'your email address'}.`,
          type: 'success',
        });
      } else {
        setOtpSent(true);
        setDevOtpHint('123456');
        setSecurityMessage({
          text: 'Demo verification code generated: 123456 (Guest mode).',
          type: 'success',
        });
      }
    } catch (err: any) {
      setSecurityMessage({ text: err.message || 'Error sending verification code', type: 'error' });
    } finally {
      setOtpSending(false);
    }
  };

  // Step 2: Verify OTP and update password
  const handleVerifyOtpAndChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityMessage(null);

    if (!otp.trim()) {
      setSecurityMessage({ text: 'Please enter the 6-digit OTP sent to your email.', type: 'error' });
      return;
    }

    setPasswordSaving(true);

    try {
      if (token) {
        const res = await apiFetch('/api/auth/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            otp: otp.trim(),
            newPassword,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || data.error || 'Failed to update password');
        }

        setSecurityMessage({ text: 'Password successfully changed and verified!', type: 'success' });
      } else {
        setSecurityMessage({ text: 'Password updated successfully (Guest mode).', type: 'success' });
      }

      // Reset form
      setNewPassword('');
      setConfirmPassword('');
      setOtp('');
      setOtpSent(false);
      setDevOtpHint(null);
      setTimeout(() => setSecurityMessage(null), 5000);
    } catch (err: any) {
      setSecurityMessage({ text: err.message || 'Error updating password', type: 'error' });
    } finally {
      setPasswordSaving(false);
    }
  };

  // Export transactions as CSV
  const handleExportCSV = () => {
    if (!transactions.length) {
      alert('No transactions to export.');
      return;
    }

    const headers = ['ID', 'Date', 'Description', 'Category', 'Type', 'Amount (INR)'];
    const rows = transactions.map((t) => [
      t.id,
      `"${t.date}"`,
      `"${t.name.replace(/"/g, '""')}"`,
      `"${t.category}"`,
      t.type,
      t.amount,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Finatle_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON backup
  const handleExportJSON = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      user: {
        email: user?.email,
        name: user?.name,
        phone: user?.phone,
      },
      transactions,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Finatle_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  };

  // Delete account confirmation
  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      if (token) {
        await apiFetch('/api/auth/me', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
      setShowDeleteModal(false);
      if (onDeleteAccount) {
        onDeleteAccount();
      } else {
        onLogout();
      }
    } catch {
      alert('Failed to delete account. Please try again.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email ? user.email.slice(0, 2).toUpperCase() : 'US';

  return (
    <div className="settings-page-container">
      {/* Header Banner */}
      <div className="settings-hero-card">
        <div className="settings-hero-left">
          <div className="settings-avatar-big">{userInitials}</div>
          <div>
            <h2>{user?.name || user?.email?.split('@')[0] || 'User Profile'}</h2>
            <p className="settings-hero-email">
              <MailIcon size={14} />
              <span>{user?.email || 'Not signed in'}</span>
              <span className="settings-verified-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <LuCheck size={12} /> Verified
              </span>
            </p>
          </div>
        </div>
        <div className="settings-hero-right">
          <button className="settings-quick-logout-btn" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </div>

      <div className="settings-sections-grid">
        {/* SECTION 1: Personal Profile Details */}
        <section className="settings-section-card">
          <div className="settings-card-header">
            <div className="settings-header-icon green">
              <UserIcon size={20} />
            </div>
            <div>
              <h3>Personal Information</h3>
              <p>Update your personal identity, contact number, and profile details</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="settings-form">
            <div className="form-group">
              <label>Full Name</label>
              <div className="settings-input-with-icon">
                <UserIcon size={16} className="input-prefix-icon" />
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. John Doe, Alex Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row-2col">
              <div className="form-group">
                <label>Phone Number</label>
                <div className="settings-input-with-icon">
                  <PhoneIcon size={16} className="input-prefix-icon" />
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Age (Years)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  className="form-control"
                  placeholder="e.g. 25"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Registered Email Address</label>
              <div className="settings-input-with-icon">
                <MailIcon size={16} className="input-prefix-icon" />
                <input
                  type="email"
                  className="form-control"
                  value={user?.email || ''}
                  disabled
                  style={{ background: '#f8fafc', color: 'var(--text-secondary)', cursor: 'not-allowed' }}
                />
              </div>
              <small style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Email address is linked to your account credentials and cannot be modified.
              </small>
            </div>

            {profileMessage && (
              <div className={`settings-alert-banner ${profileMessage.type}`}>
                {profileMessage.type === 'success' ? <CheckCircleIcon size={16} /> : <LuCircleAlert size={16} />}
                <span>{profileMessage.text}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn-submit-primary"
              style={{ width: 'auto', alignSelf: 'flex-start', minWidth: '150px' }}
              disabled={profileSaving}
            >
              {profileSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </section>

        {/* SECTION 2: Security & Password Change with Email OTP Verification */}
        <section className="settings-section-card">
          <div className="settings-card-header">
            <div className="settings-header-icon blue">
              <ShieldIcon size={20} />
            </div>
            <div>
              <h3>Security & Password Verification</h3>
              <p>Change your account password securely using a 6-digit OTP sent to your email</p>
            </div>
          </div>

          <form onSubmit={handleVerifyOtpAndChangePassword} className="settings-form">
            <div className="form-row-2col">
              <div className="form-group">
                <label>New Password</label>
                <div className="settings-input-with-icon">
                  <LockIcon size={16} className="input-prefix-icon" />
                  <input
                    type="password"
                    className="form-control"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <div className="settings-input-with-icon">
                  <KeyIcon size={16} className="input-prefix-icon" />
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* OTP Section */}
            <div className="settings-otp-box">
              <div className="settings-otp-header">
                <div>
                  <strong>Email Verification (OTP)</strong>
                  <p>A 6-digit security code will be sent to <strong>{user?.email}</strong></p>
                </div>
                <button
                  type="button"
                  className="settings-send-otp-btn"
                  onClick={handleRequestOtp}
                  disabled={otpSending || otpTimer > 0}
                >
                  {otpSending
                    ? 'Sending OTP...'
                    : otpTimer > 0
                    ? `Resend in ${otpTimer}s`
                    : otpSent
                    ? 'Resend OTP'
                    : 'Send Verification OTP'}
                </button>
              </div>

              {otpSent && (
                <div className="settings-otp-input-wrap">
                  <label>Enter 6-Digit Email OTP</label>
                  <input
                    type="text"
                    maxLength={6}
                    className="form-control settings-otp-input"
                    placeholder="• • • • • •"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                  />
                  {devOtpHint && (
                    <div className="settings-dev-otp-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <LuInfo size={13} />
                      <span>Dev OTP Code: <strong>{devOtpHint}</strong></span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {securityMessage && (
              <div className={`settings-alert-banner ${securityMessage.type}`}>
                {securityMessage.type === 'success' ? <CheckCircleIcon size={16} /> : <LuCircleAlert size={16} />}
                <span>{securityMessage.text}</span>
              </div>
            )}

            {otpSent && (
              <button
                type="submit"
                className="btn-submit-primary"
                style={{ width: 'auto', alignSelf: 'flex-start', minWidth: '180px', background: '#2563eb' }}
                disabled={passwordSaving || !otp}
              >
                {passwordSaving ? 'Verifying & Updating...' : 'Verify OTP & Change Password'}
              </button>
            )}
          </form>
        </section>

        {/* SECTION 3: Preferences & Data Export */}
        <section className="settings-section-card">
          <div className="settings-card-header">
            <div className="settings-header-icon amber">
              <KeyIcon size={20} />
            </div>
            <div>
              <h3>Preferences & Data Export</h3>
              <p>Manage currency localization, notifications, and export full reports</p>
            </div>
          </div>

          <div className="settings-preferences-grid">
            <div className="settings-pref-row">
              <div>
                <strong>Primary Display Currency</strong>
                <p>Default currency symbol used across transactions, budgets, and charts</p>
              </div>
              <CustomDropdown
                variant="pill"
                size="sm"
                align="right"
                value={currency}
                onChange={(val) => {
                  setCurrency(val);
                  localStorage.setItem('finatle_pref_currency', val);
                }}
                options={[
                  { value: 'INR (₹)', label: '₹ INR (Indian Rupee)' },
                  { value: 'USD ($)', label: '$ USD (US Dollar)' },
                  { value: 'EUR (€)', label: '€ EUR (Euro)' },
                  { value: 'GBP (£)', label: '£ GBP (British Pound)' },
                ]}
                aria-label="Primary Display Currency"
              />
            </div>

            <div className="settings-pref-row settings-pref-row-switch">
              <div>
                <strong>Monthly Budget Alert Notifications</strong>
                <p>Receive visual warning banners when spending reaches 90% of category budget</p>
              </div>
              <label className="settings-switch">
                <input
                  type="checkbox"
                  checked={budgetAlerts}
                  onChange={(e) => {
                    setBudgetAlerts(e.target.checked);
                    localStorage.setItem('finatle_pref_budget_alerts', String(e.target.checked));
                  }}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="settings-pref-row settings-pref-row-switch">
              <div>
                <strong>Weekly Financial Summary</strong>
                <p>Summarize weekly cash flow trends and loan settlements</p>
              </div>
              <label className="settings-switch">
                <input
                  type="checkbox"
                  checked={weeklyReports}
                  onChange={(e) => {
                    setWeeklyReports(e.target.checked);
                    localStorage.setItem('finatle_pref_weekly_reports', String(e.target.checked));
                  }}
                />
                <span className="slider"></span>
              </label>
            </div>

            {/* Export data buttons */}
            <div className="settings-export-row">
              <div>
                <strong>Download & Backup Financial Records</strong>
                <p>Export all recorded transactions, incomes, and loan settlements in standard formats</p>
              </div>
              <div className="settings-export-actions">
                <button type="button" className="settings-export-btn" onClick={handleExportCSV} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <LuFileSpreadsheet size={15} />
                  <span>Export CSV</span>
                </button>
                <button type="button" className="settings-export-btn" onClick={handleExportJSON} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <LuFileJson size={15} />
                  <span>Backup JSON</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: Danger Zone */}
        <section className="settings-section-card danger-zone">
          <div className="settings-card-header">
            <div className="settings-header-icon red">
              <TrashIcon size={20} />
            </div>
            <div>
              <h3 style={{ color: '#dc2626' }}>Danger Zone</h3>
              <p>Irreversible actions related to your account and stored records</p>
            </div>
          </div>

          <div className="settings-danger-row">
            <div>
              <strong>Delete Account & Clear All Data</strong>
              <p>Permanently remove your account profile, all logged transactions, budgets, and loans.</p>
            </div>
            <button
              type="button"
              className="settings-delete-account-btn"
              onClick={() => setShowDeleteModal(true)}
            >
              Delete Account
            </button>
          </div>
        </section>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626' }}>
                <TrashIcon size={22} />
                <h3 style={{ color: '#dc2626' }}>Delete Account?</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowDeleteModal(false)}>
                <LuX size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0.5rem 0 1.25rem' }}>
              Are you sure you want to permanently delete your account for <strong>{user?.email}</strong>? All your transactions, category budgets, loans, and settings will be permanently wiped.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="modal-tab-btn"
                style={{ background: '#f1f5f9', padding: '0.65rem' }}
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-submit-primary"
                style={{ background: '#dc2626', margin: 0, padding: '0.65rem' }}
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? 'Deleting...' : 'Yes, Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
