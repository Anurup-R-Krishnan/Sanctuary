import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/crimson-pro/300.css';
import '@fontsource/crimson-pro/400.css';
import '@fontsource/crimson-pro/500.css';
import '@fontsource/crimson-pro/600.css';
import '@fontsource/crimson-pro/700.css';
import '@fontsource/crimson-pro/400-italic.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';

import { SanctuaryAuthProvider } from '@/auth/SanctuaryAuthProvider';
import { SettingsProvider } from '@/components/ui/SettingsProvider';
import { appRuntime } from '@/platform/runtime';
import { getReaderDiagnostics } from '@/services/readerDiagnostics';

import App from './App';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Prevent iframe sandboxing conflicts in epub.js (which cause about:srcdoc script blocking and escaping warnings)
try {
  const originalSetAttribute = HTMLIFrameElement.prototype.setAttribute;
  HTMLIFrameElement.prototype.setAttribute = function(name: string, value: string) {
    if (name === 'sandbox') return;
    return originalSetAttribute.call(this, name, value);
  };
  Object.defineProperty(HTMLIFrameElement.prototype, 'sandbox', {
    get() {
      return (this as { _sandboxClassList?: DOMTokenList })._sandboxClassList || document.createElement('div').classList;
    },
    set() {
      // Ignore sandbox assignment so epub.js iframes render same-origin cleanly without about:srcdoc blocking
    },
    configurable: true,
  });
} catch {
  // Prototype property was locked
}

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

Object.assign(window, { getReaderDiagnostics });
document.documentElement.dataset.runtime = appRuntime.platform;

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
