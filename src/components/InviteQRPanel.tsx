import React, { useMemo, useState } from 'react';
import { Role, User } from '../types';
import { api } from '../services/mockApi';
import QRCode from './QRCode';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

type Props = {
    user: User;
    targetRoles: Role[];
    addToast: (message: string, type: 'success' | 'error') => void;
    title?: string;
    description?: string;
};

export const InviteQRPanel: React.FC<Props> = ({ user, targetRoles, addToast, title, description }) => {
    const [selectedRole, setSelectedRole] = useState<Role>(targetRoles[0]);
    const [token, setToken] = useState<string>('');
    const inviteUrl = useMemo(() => (token ? `${window.location.origin}/?invite=${encodeURIComponent(token)}` : ''), [token]);

    const handleCreate = async () => {
        try {
            if (!user.companyId) throw new Error('No company context');
            const res = await api.createUserInvite(user.companyId, user.id, selectedRole);
            setToken(res.inviteToken);
            addToast('Invite created.', 'success');
        } catch (e: any) {
            addToast(e?.message || 'Failed to create invite.', 'error');
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(inviteUrl);
            addToast('Invite link copied.', 'success');
        } catch {
            addToast('Copy failed.', 'error');
        }
    };

    return (
        <Card className="space-y-4 p-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-semibold text-foreground">{title || 'Invite via QR'}</h3>
                    <p className="text-sm text-muted-foreground">{description || 'Generate a single-use invite QR for quick onboarding.'}</p>
                </div>
                <div className="flex items-center gap-2">
                    <select className="rounded-md border border-input bg-background px-2 py-1 text-sm" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as Role)}>
                        {targetRoles.map(r => (
                            <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                        ))}
                    </select>
                    <Button size="sm" onClick={handleCreate}>Create</Button>
                </div>
            </div>
            {inviteUrl ? (
                <div className="flex items-center gap-4">
                    <QRCode value={inviteUrl} />
                    <div className="space-y-2">
                        <p className="text-xs break-all text-muted-foreground">{inviteUrl}</p>
                        <div className="flex items-center gap-2">
                            <Button size="sm" variant="secondary" onClick={handleCopy}>Copy link</Button>
                            <a className="text-sm underline" href={inviteUrl} target="_blank" rel="noreferrer">Open</a>
                        </div>
                    </div>
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">Select role and press Create to generate a QR.</p>
            )}
        </Card>
    );
};

export default InviteQRPanel;
