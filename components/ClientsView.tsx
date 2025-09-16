import React, { useState, useEffect, useCallback, useMemo } from 'react';
// FIX: Corrected import paths to be relative.
import { User, Client } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ViewHeader } from './layout/ViewHeader';
import { Tag } from './ui/Tag';

interface ClientsViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({ user, addToast }) => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (!user.companyId) return;
            const data = await api.getClientsByCompany(user.companyId);
            setClients(data);
        } catch (error) {
            addToast("Failed to load clients.", "error");
        } finally {
            setLoading(false);
        }
    }, [user.companyId, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const summary = useMemo(() => {
        const total = clients.length;
        const active = clients.filter(client => client.isActive).length;
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        const newThisMonth = clients.filter(client => {
            const created = new Date(client.createdAt);
            return !Number.isNaN(created.getTime()) && Date.now() - created.getTime() <= thirtyDays;
        }).length;
        return { total, active, newThisMonth };
    }, [clients]);

    if (loading) {
        return <Card><p>Loading clients...</p></Card>;
    }

    return (
        <div className="space-y-6">
            <ViewHeader
                view="clients"
                actions={
                    <Button>
                        <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add client
                    </Button>
                }
                meta={[
                    {
                        label: 'Total accounts',
                        value: `${summary.total}`,
                        helper: 'Companies you collaborate with',
                    },
                    {
                        label: 'Active',
                        value: `${summary.active}`,
                        helper: `${summary.active} currently engaged`,
                        indicator: summary.active > 0 ? 'positive' : 'neutral',
                    },
                    {
                        label: 'New this month',
                        value: `${summary.newThisMonth}`,
                        helper: summary.newThisMonth > 0 ? 'Recent wins' : 'No new clients yet',
                        indicator: summary.newThisMonth > 0 ? 'positive' : 'neutral',
                    },
                ]}
            />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {clients.map(client => (
                    <Card key={client.id} className="flex h-full flex-col gap-4 animate-card-enter">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="truncate text-xl font-semibold text-foreground">{client.name}</h3>
                                <p className="text-sm text-muted-foreground">Partner since {new Date(client.createdAt).toLocaleDateString()}</p>
                            </div>
                            <Tag label={client.isActive ? 'Active' : 'Dormant'} color={client.isActive ? 'green' : 'gray'} />
                        </div>
                        <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
                            <p className="flex items-center gap-2 text-muted-foreground">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                {client.contactEmail}
                            </p>
                            <p className="flex items-center gap-2 text-muted-foreground">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                {client.contactPhone}
                            </p>
                            <p className="text-muted-foreground">Payment terms: {client.paymentTerms}</p>
                        </div>
                    </Card>
                ))}
            </div>
            {clients.length === 0 && (
                <Card className="py-12 text-center">
                    <h3 className="text-lg font-medium text-foreground">No clients found.</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Get started by adding your first client.</p>
                </Card>
            )}
        </div>
    );
};