import React, { useMemo, useState } from 'react';
import { User } from '../types';
import { api } from '../services/mockApi';
import QRCode from './QRCode';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

type Props = {
    user: User;
    addToast: (message: string, type: 'success' | 'error') => void;
};

export const CompanyInviteQRPanel: React.FC<Props> = ({ user, addToast }) => {
    const [companyName, setCompanyName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [token, setToken] = useState('');
    const inviteUrl = useMemo(() => (token ? `${window.location.origin}/?invite=${encodeURIComponent(token)}` : ''), [token]);

    const handleCreate = async () => {
        try {
            if (!companyName || !adminEmail) {
                addToast('Enter company name and admin email.', 'error');
                return;
            }
            const res = await api.createCompanyInvite(companyName.trim(), adminEmail.trim(), user.id);
            setToken(res.inviteToken);
            addToast('Company owner invite created.', 'success');
        } catch (e: any) {
            addToast(e?.message || 'Failed to create company invite.', 'error');
        }
    };

    return (
        <Card className="space-y-4 p-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-semibold text-foreground">Invite New Company via QR</h3>
                    <p className="text-sm text-muted-foreground">Generates an Owner invite for onboarding a new tenant.</p>
                </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
                <input
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Company name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                />
                <input
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Owner email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                />
                <Button onClick={handleCreate}>Create</Button>
            </div>
            {inviteUrl ? (
                <div className="flex items-center gap-4">
                    <QRCode value={inviteUrl} />
                    <div className="space-y-2">
                        <p className="text-xs break-all text-muted-foreground">{inviteUrl}</p>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={async () => {
                                    try {
                                        await navigator.clipboard.writeText(inviteUrl);
                                        addToast('Invite link copied.', 'success');
                                    } catch {
                                        addToast('Copy failed.', 'error');
                                    }
                                }}
                            >
                                Copy link
                            </Button>
                            <a className="text-sm underline" href={inviteUrl} target="_blank" rel="noreferrer">Open</a>
                        </div>
                    </div>
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">Fill in details and press Create to generate a QR.</p>
            )}
        </Card>
    );
};

export default CompanyInviteQRPanel;
