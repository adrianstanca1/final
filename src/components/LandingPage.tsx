import React from 'react';
import { BackendStatus } from './BackendStatus';

interface LandingPageProps {
    onCompanyPortal: () => void;
    onAdminPortal: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onCompanyPortal, onAdminPortal }) => {
    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background text-foreground">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-primary/10 dark:from-black/40" />
            <div className="absolute inset-0 -z-10 opacity-40" aria-hidden>
                <div className="absolute left-1/2 top-[-10%] h-[60vh] w-[60vh] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
                <div className="absolute bottom-[-10%] right-[-10%] h-[50vh] w-[50vh] rounded-full bg-fuchsia-500/10 blur-3xl" />
            </div>
            <div className="z-10 mx-auto w-full max-w-4xl p-6">
                <div className="mb-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-primary/80" />
                        <span className="text-sm font-medium tracking-widest text-muted-foreground">A S T R A</span>
                    </div>
                    <BackendStatus />
                </div>
                <div className="mb-10 text-center">
                    <h1 className="mb-3 text-4xl font-black tracking-tight sm:text-5xl">Build. Operate. Evolve.</h1>
                    <p className="mx-auto max-w-2xl text-sm text-muted-foreground">A minimalist control surface for modern construction management. Choose your portal.</p>
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                    <button onClick={onCompanyPortal} className="group relative overflow-hidden rounded-xl border border-border bg-card p-8 text-left transition hover:border-primary/40">
                        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition group-hover:opacity-100" />
                        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M21 10l-9 4-9-4" /><path d="M5 12v7l7 3 7-3v-7" /></svg>
                        </div>
                        <h2 className="mb-2 text-xl font-bold">Company Portal</h2>
                        <p className="text-sm text-muted-foreground">Owners, managers, and operatives — access your workspace.</p>
                    </button>
                    <button onClick={onAdminPortal} className="group relative overflow-hidden rounded-xl border border-border bg-card p-8 text-left transition hover:border-rose-500/40">
                        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 transition group-hover:opacity-100" />
                        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M12 2l3 7h7l-5.5 4 2.5 7-7-4.5L5 20l2.5-7L2 9h7z" /></svg>
                        </div>
                        <h2 className="mb-2 text-xl font-bold">Platform Administration</h2>
                        <p className="text-sm text-muted-foreground">Principal Administrator access only. Global oversight and tenant provisioning.</p>
                    </button>
                </div>
                <div className="mt-10 text-center text-xs text-muted-foreground">
                    <span>Version preview • Private access</span>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
