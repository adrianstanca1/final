import React, { useEffect, useMemo, useState } from 'react';
import { authClient, type InvitePreview } from '../services/authClient';
import { useAuth } from '../contexts/AuthContext';
import { Role, type RegistrationPayload } from '../types';

interface AcceptInviteProps {
    token: string;
    onCancel: () => void;
}

export const AcceptInvite: React.FC<AcceptInviteProps> = ({ token, onCancel }) => {
    const { register, loading, error } = useAuth();
    const [preview, setPreview] = useState<InvitePreview | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<Role | ''>('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let mounted = true;
        setPreview(null);
        setLoadError(null);
        authClient
            .lookupInviteToken(token)
            .then((res) => {
                if (!mounted) return;
                setPreview(res);
                if (res.suggestedRole) setRole(res.suggestedRole);
            })
            .catch((e: any) => {
                if (!mounted) return;
                setLoadError(e?.message || 'Invalid or expired invite.');
            });
        return () => {
            mounted = false;
        };
    }, [token]);

    const canSubmit = useMemo(() => {
        return (
            !!preview &&
            firstName.trim().length > 1 &&
            lastName.trim().length > 1 &&
            /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email) &&
            password.length >= 8 &&
            password === confirmPassword &&
            !!role
        );
    }, [preview, firstName, lastName, email, password, confirmPassword, role]);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!preview || !canSubmit) return;
        setSubmitting(true);
        const payload: RegistrationPayload = {
            firstName,
            lastName,
            email,
            password,
            confirmPassword,
            companySelection: 'join',
            inviteToken: token,
            role: role as Role,
        };
        try {
            await register(payload);
            // Auth flow will continue via AuthProvider finalization
        } catch {
            // error handled by context
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
            <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-sm">
                <h1 className="text-2xl font-bold mb-1">Join Company</h1>
                <p className="text-sm text-muted-foreground mb-6">Accept your invitation and create your account.</p>

                {!preview && !loadError && (
                    <div className="text-sm text-muted-foreground">Validating invite…</div>
                )}
                {loadError && (
                    <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{loadError}</div>
                )}
                {error && (
                    <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
                )}

                {preview && (
                    <div className="mb-6 rounded-md border border-border bg-muted p-4">
                        <p className="text-sm">You are joining:</p>
                        <p className="font-semibold">{preview.companyName}</p>
                        {preview.companyType && (
                            <p className="text-xs text-muted-foreground">{preview.companyType.replace(/_/g, ' ')}</p>
                        )}
                    </div>
                )}

                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="firstName">First name</label>
                            <input id="firstName" className="w-full rounded-md border border-border bg-background p-2" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="lastName">Last name</label>
                            <input id="lastName" className="w-full rounded-md border border-border bg-background p-2" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm text-muted-foreground" htmlFor="email">Work email</label>
                        <input id="email" type="email" className="w-full rounded-md border border-border bg-background p-2" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="password">Password</label>
                            <input id="password" type="password" className="w-full rounded-md border border-border bg-background p-2" value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="confirm">Confirm</label>
                            <input id="confirm" type="password" className="w-full rounded-md border border-border bg-background p-2" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm text-muted-foreground" htmlFor="role">Role</label>
                        <select id="role" className="w-full rounded-md border border-border bg-background p-2" value={role} onChange={(e) => setRole(e.target.value as Role)} disabled={!preview}>
                            <option value="">Select a role</option>
                            {preview?.allowedRoles.map((r) => (
                                <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                            ))}
                        </select>
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                        <button type="button" className="rounded-md border border-border px-4 py-2 text-sm" onClick={onCancel}>
                            Cancel
                        </button>
                        <button type="submit" disabled={!canSubmit || submitting || loading} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
                            {submitting || loading ? 'Creating account…' : 'Accept Invite'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AcceptInvite;
