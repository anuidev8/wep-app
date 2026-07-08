import './index.css';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './App';
import { AppErrorBoundary } from './components/AppErrorBoundary';

// Capture all errors that might cause white screen
window.addEventListener('error', (event) => {
  console.error('[Global Error]', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', event.reason);
});

/** Wait for Capacitor bridge when loading from dev server (server.url) - avoids "window.Capacitor.triggerEvent" race */
function waitForCapacitorBridge(): Promise<void> {
  if (typeof window.Capacitor !== 'undefined' && window.Capacitor?.triggerEvent) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const timeout = 3000;
    const start = Date.now();
    const check = () => {
      if (typeof window.Capacitor !== 'undefined' && window.Capacitor?.triggerEvent) {
        resolve();
        return;
      }
      if (Date.now() - start >= timeout) {
        resolve(); // Proceed anyway (e.g. web platform)
        return;
      }
      requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

waitForCapacitorBridge().then(() => {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
});