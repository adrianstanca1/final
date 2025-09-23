import React, { useState } from 'react';
import { identity } from '../services/identityProvider';
import type { LoginCredentials } from '../types';

export const MultiTenantLogin: React.FC<{ onSwitchToRegister: () => void; onSwitchToForgotPassword: () => void; onLocalLogin: (credentials: LoginCredentials) => Promise<void>; addToast?: (m: string, t?: 'success' | 'error') => void; }>
  = ({ onSwitchToRegister, onSwitchToForgotPassword, onLocalLogin, addToast }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await identity.loginWithGoogle();
      addToast?.('Redirecting to Google…', 'success');
    } catch (e: any) {
      addToast?.(e?.message || 'Google login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLocal = async () => {
    setLoading(true);
    try {
      // Optionally use tenantCode in your backend; here we just pass through
      try { localStorage.setItem('tenantCode', tenantCode || ''); } catch {}
      await onLocalLogin({ email, password });
    } catch (e: any) {
      addToast?.(e?.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-16 w-full max-w-md rounded-lg bg-card p-6 shadow-md">
      <h1 className="mb-6 text-center text-2xl font-bold">Welcome back</h1>
      <div className="mb-4">
        <label htmlFor="tenantCode" className="mb-1 block text-sm font-medium text-muted-foreground">Tenant code</label>
        <input id="tenantCode" className="w-full rounded-md border border-border bg-background p-2" placeholder="e.g. ACME-1234" value={tenantCode} onChange={e => setTenantCode(e.target.value)} />
      </div>
      <div className="mb-3">
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-muted-foreground">Email</label>
        <input id="email" className="w-full rounded-md border border-border bg-background p-2" type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div className="mb-3">
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-muted-foreground">Password</label>
        <input id="password" className="w-full rounded-md border border-border bg-background p-2" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
      </div>
      <button disabled={loading} onClick={handleLocal} className="mt-1 w-full rounded-md bg-primary p-2 text-primary-foreground">Sign in</button>
      <div className="my-4 text-center text-xs text-muted-foreground">or</div>
      <button disabled={loading} onClick={handleGoogle} className="w-full rounded-md border border-border p-2">Continue with Google</button>
      <div className="mt-4 flex items-center justify-between text-sm">
        <button className="text-primary" onClick={onSwitchToForgotPassword}>Forgot password?</button>
        <button className="text-primary" onClick={onSwitchToRegister}>Create account</button>
      </div>
    </div>
  );
};
