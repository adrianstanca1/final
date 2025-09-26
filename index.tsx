import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider as MockAuthProvider } from './contexts/AuthContext';
import { AuthProvider as SupabaseAuthProvider } from './contexts/SupabaseAuthContext';

// Check if we should use Supabase authentication
const useSupabaseAuth = import.meta.env.VITE_USE_SUPABASE_AUTH === 'true';

const AuthProvider = useSupabaseAuth ? SupabaseAuthProvider : MockAuthProvider;

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