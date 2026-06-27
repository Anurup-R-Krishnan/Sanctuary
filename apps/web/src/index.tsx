import { ClerkProvider } from '@clerk/clerk-react';
import React from 'react';
import ReactDOM from 'react-dom/client';

import { SettingsProvider } from '@/components/ui/SettingsProvider';

import App from './App';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

const DISABLE_AUTH = import.meta.env.VITE_DISABLE_AUTH === "true";
const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";

if (!DISABLE_AUTH && !CLERK_KEY) {
  console.error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const app = (
  <ErrorBoundary>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </ErrorBoundary>
);

root.render(
  <React.StrictMode>
    {DISABLE_AUTH ? (
      app
    ) : (
      <ClerkProvider publishableKey={CLERK_KEY}>
        {app}
      </ClerkProvider>
    )}
  </React.StrictMode>
);
