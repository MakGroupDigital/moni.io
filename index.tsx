
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      if (window.location.hostname === 'localhost' && 'caches' in window && !sessionStorage.getItem('moni_sw_cache_cleanup')) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
        sessionStorage.setItem('moni_sw_cache_cleanup', '1');
      }

      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    } catch (error) {
      console.warn('Service worker registration failed:', error);
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
