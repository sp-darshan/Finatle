import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Manage Service Worker registration
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration failed:', err);
      });
    });
  } else {
    // In development mode, unregister old workers & purge cache so changes are 100% instant
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
    if ('caches' in window) {
      caches.keys().then((names) => {
        for (const name of names) caches.delete(name);
      });
    }
  }
}

// Prevent mouse wheel from inadvertently changing values in number/amount inputs
window.addEventListener(
  'wheel',
  () => {
    const active = document.activeElement;
    if (active instanceof HTMLInputElement && active.type === 'number') {
      active.blur();
    }
  },
  { passive: true }
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
