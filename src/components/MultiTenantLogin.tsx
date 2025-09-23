import React, { useState } from 'react';
import { identity } from '../services/identityProvider';
import { BackendStatus } from './BackendStatus';
import type { LoginCredentials } from '../types';

export const MultiTenantLogin: React.FC<{ onSwitchToRegister: () => void; onSwitchToForgotPassword: () => void; onLocalLogin: (credentials: LoginCredentials) => Promise<void>; addToast?: (m: string, t?: 'success' | 'error') => void; showAdminShortcut?: boolean }>
    = ({ onSwitchToRegister, onSwitchToForgotPassword, onLocalLogin, addToast, showAdminShortcut = true }) => {
        const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');
        const [tenantCode, setTenantCode] = useState('');
        const [loading, setLoading] = useState(false);

        const handleGoogle = async () => {
            setLoading(true);
            try {
                const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
                await identity.loginWithGoogle(redirectTo);
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
                try { localStorage.setItem('tenantCode', tenantCode || ''); } catch { }
                await onLocalLogin({ email, password });
            } catch (e: any) {
                addToast?.(e?.message || 'Login failed', 'error');
            } finally {
                setLoading(false);
            }
        };

        const handlePrincipalAdmin = async () => {
            setLoading(true);
            try {
                try { localStorage.removeItem('tenantCode'); } catch { }
                await onLocalLogin({ email: 'adrian.stanca1@gmail.com', password: 'Cumparavinde1' });
                addToast?.('Signed in as Platform Admin', 'success');
            } catch (e: any) {
                addToast?.(e?.message || 'Admin login failed', 'error');
            } finally {
                setLoading(false);
            }
        };

        return (
            <div className="mx-auto mt-16 w-full max-w-md rounded-lg bg-card p-6 shadow-md">
                <h1 className="mb-6 text-center text-2xl font-bold">Welcome back</h1>
                <div className="mb-4 flex justify-center"><BackendStatus /></div>
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
                {showAdminShortcut && (
                    <button disabled={loading} onClick={handlePrincipalAdmin} className="mt-2 w-full rounded-md bg-rose-600 p-2 text-white">Sign in as Platform Admin</button>
                )}
                <div className="my-4 text-center text-xs text-muted-foreground">or</div>
                <button disabled={loading} onClick={handleGoogle} className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-border p-2 hover:bg-accent">
                    <span className="inline-flex h-4 w-4 items-center justify-center" aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4">
                            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.582 31.91 29.197 35 24 35c-7.18 0-13-5.82-13-13s5.82-13 13-13c3.314 0 6.329 1.243 8.606 3.269l5.657-5.657C34.833 3.014 29.671 1 24 1 10.745 1 0 11.745 0 25s10.745 24 24 24c12.683 0 23.172-9.236 23.172-24 0-1.613-.172-3.182-.561-4.917z" />
                            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.816C14.707 16.396 18.994 13 24 13c3.314 0 6.329 1.243 8.606 3.269l5.657-5.657C34.833 3.014 29.671 1 24 1 15.325 1 7.75 5.566 3.686 12.301l2.62 2.39z" />
                            <path fill="#4CAF50" d="M24 49c5.058 0 9.673-1.717 13.283-4.657l-6.103-5.158C29.304 40.487 26.774 41 24 41c-5.152 0-9.523-3.117-11.335-7.539l-6.48 5.004C9.08 44.909 16.054 49 24 49z" />
                            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.638 4.073-6.005 7-11.303 7-5.152 0-9.523-3.117-11.335-7.539l-6.48 5.004C9.08 44.909 16.054 49 24 49c12.683 0 23.172-9.236 23.172-24 0-1.613-.172-3.182-.561-4.917z" />
                        </svg>
                    </span>
                    Continue with Google
                </button>
                <div className="mt-4 flex items-center justify-between text-sm">
                    <button className="text-primary" onClick={onSwitchToForgotPassword}>Forgot password?</button>
                    <button className="text-primary" onClick={onSwitchToRegister}>Create account</button>
                </div>
            </div>
        );
    };
