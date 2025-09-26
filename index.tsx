import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider as MockAuthProvider } from './contexts/AuthContext';
import { AuthProvider as SupabaseAuthProvider } from './contexts/SupabaseAuthContext';
import FirebaseAuthProvider from './contexts/FirebaseAuthContext';

// Determine which authentication provider to use
const useSupabaseAuth = import.meta.env.VITE_USE_SUPABASE_AUTH === 'true';
const useFirebaseAuth = import.meta.env.VITE_USE_FIREBASE_AUTH === 'true';

// Priority: Firebase > Supabase > Mock (default)
let AuthProvider = MockAuthProvider;
if (useFirebaseAuth) {
  AuthProvider = FirebaseAuthProvider;
} else if (useSupabaseAuth) {
  AuthProvider = SupabaseAuthProvider;
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