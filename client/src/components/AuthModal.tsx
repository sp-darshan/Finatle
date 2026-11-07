import React, { useState, useEffect, useRef } from 'react';
import { FinatleLogo } from './Icons';
import { LuX, LuEye, LuEyeOff, LuArrowLeft, LuMail, LuSmartphone } from 'react-icons/lu';
import { apiFetch } from '../lib/api';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'signin' | 'signup';
  onClose: () => void;
  onAuthSuccess: (user: any, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'signup',
  onClose,
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot_password'>('signup');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');

  // Password Visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset state on open or initialMode change
  useEffect(() => {
    setMode(initialMode === 'signin' ? 'signin' : 'signup');
    setIsOtpSent(false);
    setError(null);
    setSuccessMessage(null);
    setOtp('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [initialMode, isOpen]);

  // Countdown timer handler
  useEffect(() => {
    if (resendCountdown > 0) {
      countdownTimerRef.current = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [resendCountdown]);

  // Lock body scroll while modal is active
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

  if (!isOpen) return null;

  const validateEmailFormat = (emailStr: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return emailRegex.test(emailStr.trim().toLowerCase());
  };

  // 1. Send OTP for Sign Up
  const handleRequestSignUpOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!name || !name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!validateEmailFormat(email)) {
      setError('Please enter a valid email address (e.g. name@example.com).');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/signup/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to send verification code.');
      }

      setIsOtpSent(true);
      setResendCountdown(30);
      setSuccessMessage(data.message || `A 6-digit verification code has been sent to ${email}.`);
    } catch (err: any) {
      setError(err.message || 'Unable to send verification email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Complete Sign Up with OTP
  const handleCompleteSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!name || !name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    const cleanOtp = otp.trim().replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        name: name.trim(),
        phone: phone.replace(/\D/g, ''),
        email: email.trim().toLowerCase(),
        password,
        otp: cleanOtp,
      };
      if (age) payload.age = parseInt(age, 10);

      const res = await apiFetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Sign up failed.');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onAuthSuccess(data.user, data.token);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to complete registration.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Regular Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!validateEmailFormat(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Invalid email or password.');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onAuthSuccess(data.user, data.token);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Request Forgot Password OTP
  const handleRequestForgotPasswordOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!validateEmailFormat(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/forgot-password/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to send reset code.');
      }

      setIsOtpSent(true);
      setResendCountdown(30);
      setSuccessMessage(data.message || `Password reset code sent to ${email}.`);
    } catch (err: any) {
      setError(err.message || 'Unable to send password reset code.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Reset Password with OTP
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanOtp = otp.trim().replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (!password || password.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: cleanOtp,
          newPassword: password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to reset password.');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onAuthSuccess(data.user, data.token);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Unable to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP helper
  const handleResendOtp = async () => {
    if (resendCountdown > 0 || loading) return;
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const endpoint = mode === 'signup' ? '/api/auth/signup/send-otp' : '/api/auth/forgot-password/send-otp';
      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to resend code.');

      setResendCountdown(30);
      setSuccessMessage('A fresh verification code has been dispatched to your email.');
    } catch (err: any) {
      setError(err.message || 'Could not resend code. Please wait a moment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <FinatleLogo size={32} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>
                {mode === 'signup'
                  ? isOtpSent
                    ? 'Verify Your Email'
                    : 'Create your Account'
                  : mode === 'forgot_password'
                  ? isOtpSent
                    ? 'Set New Password'
                    : 'Reset Password'
                  : 'Welcome Back'}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                {mode === 'signup'
                  ? isOtpSent
                    ? `Enter code sent to ${email}`
                    : 'Access your private personal dashboard'
                  : mode === 'forgot_password'
                  ? isOtpSent
                    ? `Verification code sent to ${email}`
                    : "We'll send an OTP to your email to verify"
                  : 'Sign in with your email & password'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <LuX size={18} />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div
            style={{
              padding: '0.65rem 0.85rem',
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: 'var(--radius-md)',
              color: '#dc2626',
              fontSize: '0.82rem',
              marginBottom: '1rem',
              lineHeight: 1.4,
            }}
          >
            {error}
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div
            style={{
              padding: '0.65rem 0.85rem',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 'var(--radius-md)',
              color: '#065f46',
              fontSize: '0.82rem',
              marginBottom: '1rem',
              lineHeight: 1.4,
            }}
          >
            {successMessage}
          </div>
        )}

        {/* ----------------- 1. SIGN UP STEP 1 (Details Entry) ----------------- */}
        {mode === 'signup' && !isOtpSent && (
          <form onSubmit={handleRequestSignUpOtp}>
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>Your Name</span>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500 }}>(required)</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Darshan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>Mobile Number</span>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500 }}>(required)</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span
                  style={{
                    padding: '0.55rem 0.65rem',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    color: '#475569',
                    userSelect: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                  }}
                >
                  <LuSmartphone size={14} /> +91
                </span>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>Email Address</span>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500 }}>(required)</span>
              </label>
              <input
                type="email"
                className="form-control"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>Age</span>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500 }}>(optional)</span>
              </label>
              <input
                type="number"
                className="form-control"
                placeholder="e.g. 26"
                min="1"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.15rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>Password</span>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500 }}>(required)</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: '2.5rem', width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-submit-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Sending verification code...' : 'Verify Email & Continue →'}
            </button>
          </form>
        )}

        {/* ----------------- 2. SIGN UP STEP 2 (OTP Verification) ----------------- */}
        {mode === 'signup' && isOtpSent && (
          <form onSubmit={handleCompleteSignUp}>
            <div style={{ textAlign: 'center', padding: '0.75rem 0 1.25rem' }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem',
                }}
              >
                <LuMail size={24} />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                Please enter the 6-digit code sent to
              </p>
              <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.2rem 0 0' }}>
                {email}
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ textAlign: 'center', display: 'block' }}>6-Digit Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className="form-control"
                placeholder="• • • • • •"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                autoFocus
                required
                style={{
                  textAlign: 'center',
                  fontSize: '1.75rem',
                  letterSpacing: '0.45rem',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  padding: '0.65rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem', fontSize: '0.82rem' }}>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCountdown > 0 || loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resendCountdown > 0 ? '#94a3b8' : 'var(--primary-dark)',
                  fontWeight: 600,
                  cursor: resendCountdown > 0 ? 'default' : 'pointer',
                  textDecoration: resendCountdown > 0 ? 'none' : 'underline',
                  padding: 0,
                }}
              >
                {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : 'Resend Verification Code'}
              </button>
            </div>

            <button type="submit" className="btn-submit-primary" disabled={loading} style={{ width: '100%', marginBottom: '0.75rem' }}>
              {loading ? 'Creating account...' : 'Complete Registration & Sign In'}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOtpSent(false);
                setError(null);
                setSuccessMessage(null);
              }}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                padding: '0.4rem',
              }}
            >
              <LuArrowLeft size={14} /> Change email or details
            </button>
          </form>
        )}

        {/* ----------------- 3. SIGN IN VIEW ----------------- */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn}>
            <div className="form-group" style={{ marginBottom: '0.9rem' }}>
              <label>Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ margin: 0 }}>Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot_password');
                    setIsOtpSent(false);
                    setError(null);
                    setSuccessMessage(null);
                    setOtp('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-dark)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: '2.5rem', width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-submit-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* ----------------- 4. FORGOT PASSWORD STEP 1 (Email Entry) ----------------- */}
        {mode === 'forgot_password' && !isOtpSent && (
          <form onSubmit={handleRequestForgotPasswordOtp}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label>Your Account Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>

            <button type="submit" className="btn-submit-primary" disabled={loading} style={{ width: '100%', marginBottom: '0.85rem' }}>
              {loading ? 'Sending reset code...' : 'Send Verification Code (OTP)'}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
                setSuccessMessage(null);
              }}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                padding: '0.4rem',
              }}
            >
              <LuArrowLeft size={14} /> Back to Sign In
            </button>
          </form>
        )}

        {/* ----------------- 5. FORGOT PASSWORD STEP 2 (OTP + New Password) ----------------- */}
        {mode === 'forgot_password' && isOtpSent && (
          <form onSubmit={handleResetPassword}>
            <div className="form-group" style={{ marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ margin: 0 }}>6-Digit Verification Code</label>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCountdown > 0 || loading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: resendCountdown > 0 ? '#94a3b8' : 'var(--primary-dark)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: resendCountdown > 0 ? 'default' : 'pointer',
                    padding: 0,
                  }}
                >
                  {resendCountdown > 0 ? `Resend (${resendCountdown}s)` : 'Resend code'}
                </button>
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="form-control"
                placeholder="• • • • • •"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                autoFocus
                required
                style={{
                  textAlign: 'center',
                  fontSize: '1.4rem',
                  letterSpacing: '0.4rem',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '0.85rem' }}>
              <label>New Password (min 6 characters)</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: '2.5rem', width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label>Confirm New Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={{ paddingRight: '2.5rem', width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                  }}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-submit-primary" disabled={loading} style={{ width: '100%', marginBottom: '0.85rem' }}>
              {loading ? 'Updating password...' : 'Reset Password & Sign In'}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setIsOtpSent(false);
                setError(null);
                setSuccessMessage(null);
              }}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                padding: '0.4rem',
              }}
            >
              <LuArrowLeft size={14} /> Back to Sign In
            </button>
          </form>
        )}

        {/* Footer Toggle between Sign In and Sign Up */}
        {mode !== 'forgot_password' && !isOtpSent && (
          <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account yet?"}{' '}
            <button
              onClick={() => {
                setMode(mode === 'signup' ? 'signin' : 'signup');
                setError(null);
                setSuccessMessage(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary-dark)',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              {mode === 'signup' ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
