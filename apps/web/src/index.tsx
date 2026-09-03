import React from 'react';
import ReactDOM from 'react-dom/client';

import { SanctuaryAuthProvider } from '@/auth/SanctuaryAuthProvider';
import { SettingsProvider } from '@/components/ui/SettingsProvider';

import App from './App';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Suppress benign iframe sandboxing warnings from epub.js
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && (args[0].includes('escape its sandboxing') || args[0].includes('about:srcdoc'))) {
    return;
  }
  originalWarn.apply(console, args);
};

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
