import React, { useState, useEffect } from 'react';
import { FinatleLogo, DownloadAppIcon } from './Icons';
import { LuCheck, LuInfo, LuX } from 'react-icons/lu';

interface PWAInstallPromptProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  isOpen,
  onClose,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already running standalone or marked installed
    const isRunningStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      localStorage.getItem('finatle_pwa_installed') === 'true';
    setIsStandalone(isRunningStandalone);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      localStorage.setItem('finatle_pwa_installed', 'true');
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

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

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
        localStorage.setItem('finatle_pwa_installed', 'true');
      }
      setDeferredPrompt(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FinatleLogo size={36} />
            <div>
              <h3>Install Finatle Mobile App</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Get the full standalone mobile experience
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <LuX size={18} />
          </button>
        </div>

        <div style={{ padding: '0.5rem 0 1.25rem 0' }}>
          {isStandalone || installed ? (
            <div
              style={{
                textAlign: 'center',
                padding: '1.5rem',
                background: '#ecfdf5',
                borderRadius: 'var(--radius-md)',
                color: '#047857',
              }}
            >
              <div style={{ display: 'inline-flex', padding: '0.75rem', background: '#d1fae5', borderRadius: '50%', color: '#059669', marginBottom: '0.75rem' }}>
                <LuCheck size={28} />
              </div>
              <h4 style={{ fontWeight: 800 }}>Finatle is Installed!</h4>
              <p style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
                You can launch Finatle anytime directly from your smartphone home screen.
              </p>
            </div>
          ) : isIOS ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                To install <strong>Finatle</strong> on your iPhone or iPad:
              </p>
              <ol
                style={{
                  paddingLeft: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                }}
              >
                <li>
                  Tap the <strong>Share</strong> button in Safari's bottom toolbar.
                </li>
                <li>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong>Add</strong> in the top right corner.
                </li>
              </ol>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                <LuInfo size={14} />
                <span>Once added, Finatle launches full-screen just like a native app.</span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Install Finatle on your Android phone or device for instant access, offline mode, and quick transaction entries.
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem',
                  background: '#f8fafc',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <DownloadAppIcon size={24} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Fast & Lightweight</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Zero store download needed • Instant updates</div>
                </div>
              </div>

              {deferredPrompt ? (
                <button
                  className="btn-submit-primary"
                  onClick={handleInstallClick}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <DownloadAppIcon size={18} />
                  <span>Install to Home Screen</span>
                </button>
              ) : (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Tap your mobile browser menu (<strong>⋮</strong>) and choose <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
