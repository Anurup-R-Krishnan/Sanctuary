import React from 'react';
import ReactDOM from 'react-dom/client';

import { SanctuaryAuthProvider } from '@/auth/SanctuaryAuthProvider';
import { SettingsProvider } from '@/components/ui/SettingsProvider';

import App from './App';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

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
