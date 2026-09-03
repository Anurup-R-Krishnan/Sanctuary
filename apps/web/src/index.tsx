import React from 'react';
import ReactDOM from 'react-dom/client';

import { SanctuaryAuthProvider } from '@/auth/SanctuaryAuthProvider';
import { SettingsProvider } from '@/components/ui/SettingsProvider';

import App from './App';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Suppress benign iframe sandboxing warnings from epub.js
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.includes('escape its sandboxing') || msg.includes('about:srcdoc') || msg.includes('Blocked script execution')) {
    return;
  }
  originalWarn.apply(console, args);
};

const originalError = console.error;
console.error = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.includes('Blocked script execution in \'about:srcdoc\'') || msg.includes('allow-scripts')) {
    return;
  }
  originalError.apply(console, args);
};

window.addEventListener('error', (event) => {
  if (event.message?.includes('Blocked script execution') || event.filename?.includes('about:srcdoc')) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <SanctuaryAuthProvider>
      <ErrorBoundary>
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </ErrorBoundary>
    </SanctuaryAuthProvider>
  </React.StrictMode>
);
