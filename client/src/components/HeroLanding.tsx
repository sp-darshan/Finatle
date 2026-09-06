import React from 'react';
import {
  FinapseLogo,
  LeafSproutIcon,
  IncomeCardIcon,
  ExpenseCardIcon,
  SavingsCardIcon,
  SettlementsCardIcon,
  UsersGroupIcon,
  ScanBillIcon,
} from './Icons';

interface HeroLandingProps {
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
  onTryMobilePreview: () => void;
}

export const HeroLanding: React.FC<HeroLandingProps> = ({
  onOpenAuth,
  onTryMobilePreview,
}) => {
  return (
    <div className="landing-page">
      {/* Top Navbar */}
      <header className="landing-header">
        <div className="landing-logo">
          <FinapseLogo size={36} />
          <div className="landing-logo-text">
            <h2>Finatle</h2>
            <p>Money in sync with you.</p>
          </div>
        </div>

        <div className="landing-nav-actions">
          <button className="landing-btn-secondary" onClick={() => onOpenAuth('signin')}>
            Sign In
          </button>
          <button className="landing-btn-primary" onClick={() => onOpenAuth('signup')}>
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="landing-main">
        <section className="hero-hero-section">
          <div className="hero-badge">
            <LeafSproutIcon size={16} />
            <span>A simpler, brighter financial you</span>
          </div>

          <h1 className="hero-title">
            Take complete control of <br />
            <span className="hero-gradient-text">your personal wealth.</span>
          </h1>

          <p className="hero-subtitle">
            Track income & expenses in real-time, effortlessly manage money you lent or borrowed from friends,
            split trip bills, and grow your net savings with zero hassle.
          </p>

          <div className="hero-cta-group">
            <button className="landing-btn-primary large" onClick={() => onOpenAuth('signup')}>
              Create Free Account →
            </button>
            <button className="landing-btn-outline large" onClick={onTryMobilePreview}>
              📱 Preview Mobile Experience
            </button>
          </div>
        </section>

        {/* Feature Cards Grid (Matching the reference design footer) */}
        <section className="features-section">
          <div className="features-heading">
            <h3>More than an expense tracker. <span className="highlight-text">A smarter you.</span></h3>
            <p>Everything you need for full financial transparency in one place.</p>
          </div>

          <div className="features-grid">
            {/* Card 1: Track Income & Expenses */}
            <div className="feature-card">
              <div className="feature-icon-wrap" style={{ background: '#ecfdf5', color: '#059669' }}>
                <IncomeCardIcon size={28} />
              </div>
              <h4>Track Income & Expenses</h4>
              <p>Understand where your money goes with clear breakdown categories and monthly visual trends.</p>
            </div>

            {/* Card 2: Set Budgets */}
            <div className="feature-card">
              <div className="feature-icon-wrap" style={{ background: '#fef2f2', color: '#ef4444' }}>
                <ExpenseCardIcon size={28} />
              </div>
              <h4>Set Budgets & Limits</h4>
              <p>Stay in control of your daily and monthly spendings with smart budget caps and category targets.</p>
            </div>

            {/* Card 3: Lend & Borrow */}
            <div className="feature-card">
              <div className="feature-icon-wrap" style={{ background: '#e0e7ff', color: '#4f46e5' }}>
                <UsersGroupIcon size={28} />
              </div>
              <h4>Lend & Borrow Tracker</h4>
              <p>Keep precise track of money you lent to colleagues, amounts you owe, and shared trip split expenses.</p>
            </div>

            {/* Card 4: Financial Goals */}
            <div className="feature-card">
              <div className="feature-icon-wrap" style={{ background: '#f0fdf4', color: '#10b981' }}>
                <SavingsCardIcon size={28} />
              </div>
              <h4>Financial Goals & Savings</h4>
              <p>Set savings targets for what matters to you and watch your net balance grow steadily month after month.</p>
            </div>

            {/* Card 5: AI Bill Scanner */}
            <div className="feature-card">
              <div className="feature-icon-wrap" style={{ background: '#ecfdf5', color: '#047857' }}>
                <ScanBillIcon size={28} />
              </div>
              <h4>Scan & Import Bills</h4>
              <p>Instantly scan physical receipts and bills to auto-extract merchants, amounts, and item details.</p>
            </div>

            {/* Card 6: Available on Web & Mobile */}
            <div className="feature-card">
              <div className="feature-icon-wrap" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                <SettlementsCardIcon size={28} />
              </div>
              <h4>Available on Web & Mobile</h4>
              <p>Install directly as an app on your smartphone or desktop via PWA with fast offline access.</p>
            </div>
          </div>
        </section>

        {/* Live CTA Section */}
        <section className="cta-banner">
          <div className="cta-banner-content">
            <h2>Ready to bring clarity to your finances?</h2>
            <p>Sign up in under 30 seconds. Powered by PostgreSQL database security.</p>
            <button className="landing-btn-primary large" onClick={() => onOpenAuth('signup')}>
              Get Started Now
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FinapseLogo size={24} />
            <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Finatle</span>
          </div>
          <p>© {new Date().getFullYear()} Finatle. Your money, clearly accounted for.</p>
        </div>
      </footer>
    </div>
  );
};
