import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { getGoogleClientId } from './utils/env';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    <TenantProvider>
      {children}
    </TenantProvider>
  </AuthProvider>
);

const googleClientId = getGoogleClientId();

const AppTree = () => {
  if (!googleClientId) {
    return (
      <Providers>
        <App />
      </Providers>
    );
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <Providers>
        <App />
      </Providers>
    </GoogleOAuthProvider>
  );
};

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppTree />
  </React.StrictMode>
);
