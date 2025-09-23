import React from 'react';
import { MultiTenantLogin } from './MultiTenantLogin';
import { AdminLogin } from './AdminLogin';
import type { LoginCredentials } from '../types';

interface DualPortalHomeProps {
    onLocalLogin: (credentials: LoginCredentials) => Promise<void>;
    onAdminLocalLogin: (credentials: LoginCredentials) => Promise<void>;
    onSwitchToRegister: () => void;
    onSwitchToForgotPassword: () => void;
    addToast?: (m: string, t?: 'success' | 'error') => void;
}

export const DualPortalHome: React.FC<DualPortalHomeProps> = ({ onLocalLogin, onAdminLocalLogin, onSwitchToRegister, onSwitchToForgotPassword, addToast }) => {
    return (
        <div className="relative min-h-screen bg-background text-foreground">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-primary/10 dark:from-black/40" />
            <div className="absolute inset-0 -z-10 opacity-40" aria-hidden>
                <div className="absolute left-1/2 top-[-10%] h-[60vh] w-[60vh] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
                <div className="absolute bottom-[-10%] right-[-10%] h-[50vh] w-[50vh] rounded-full bg-fuchsia-500/10 blur-3xl" />
            </div>
            <div className="relative z-10 mx-auto max-w-6xl px-6 py-12">
                <div className="mb-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-primary/80" />
                        <span className="text-sm font-medium tracking-widest text-muted-foreground">A S T R A</span>
                    </div>
                    <div className="text-xs text-muted-foreground">Private preview</div>
                </div>
                <div className="mb-10 text-center">
                    <h1 className="mb-3 text-4xl font-black tracking-tight sm:text-5xl">Minimal. Mysterious. Mighty.</h1>
                    <p className="mx-auto max-w-2xl text-sm text-muted-foreground">A unified control surface for multi-tenant construction ops. Pick your portal and step in.</p>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-xl border border-border bg-card p-6 shadow">
                        <h2 className="mb-1 text-lg font-bold">Company Portal</h2>
                        <p className="mb-4 text-xs text-muted-foreground">Owners, managers, supervisors and operatives — access your workspace.</p>
                        <MultiTenantLogin
                            onSwitchToRegister={onSwitchToRegister}
                            onSwitchToForgotPassword={onSwitchToForgotPassword}
                            onLocalLogin={onLocalLogin}
                            addToast={addToast}
                            showAdminShortcut={false}
                        />
                    </div>

                    <div className="rounded-xl border border-border bg-card p-6 shadow">
                        <h2 className="mb-1 text-lg font-bold">Platform Administration</h2>
                        <p className="mb-4 text-xs text-muted-foreground">Principal administrator only. Global oversight and tenant provisioning.</p>
                        <AdminLogin onLocalLogin={onAdminLocalLogin} onBack={() => { }} addToast={addToast} hideBackButton />
                    </div>
                </div>
                <div className="mt-10 text-center text-xs text-muted-foreground">Version preview • Role-based access • Offline-first</div>
            </div>
        </div>
    );
};

export default DualPortalHome;
