import React, { useState } from 'react';
import type { LoginCredentials } from '../types';

interface AdminLoginProps {
    onLocalLogin: (credentials: LoginCredentials) => Promise<void>;
    onBack: () => void;
    addToast?: (m: string, t?: 'success' | 'error') => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLocalLogin, onBack, addToast }) => {
    const adminEmail = 'adrian.stanca1@gmail.com';
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const signIn = async () => {
        setLoading(true);
        try {
            await onLocalLogin({ email: adminEmail, password });
            addToast?.('Welcome, Platform Administrator', 'success');
        } catch (e: any) {
            addToast?.(e?.message || 'Admin login failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto mt-24 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow">
            <button onClick={onBack} className="mb-6 text-xs text-muted-foreground hover:text-foreground">← Back</button>
            <h1 className="mb-2 text-center text-2xl font-bold">Platform Administration</h1>
            <p className="mb-6 text-center text-xs text-muted-foreground">Restricted access. Use admin credentials to proceed.</p>
            <div className="mb-3">
                <label className="mb-1 block text-sm font-medium text-muted-foreground">Admin Email</label>
                <input className="w-full cursor-not-allowed rounded-md border border-border bg-muted p-2 text-foreground" value={adminEmail} readOnly />
            </div>
            <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-muted-foreground">Password</label>
                <input className="w-full rounded-md border border-border bg-background p-2" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button disabled={loading || !password} onClick={signIn} className="w-full rounded-md bg-rose-600 p-2 text-white disabled:opacity-50">Sign in as Platform Admin</button>
        </div>
    );
};

export default AdminLogin;
