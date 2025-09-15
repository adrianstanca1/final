import React, { useState, useEffect, useCallback } from 'react';
// FIX: Corrected import paths to be relative.
import { User, Company, SystemHealth, UsageMetric } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { InviteCompanyModal } from './InviteCompanyModal';

interface PrincipalAdminDashboardProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
}

const KpiCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <Card className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-slate-100 text-slate-600">
            {icon}
        </div>
        <div>
            <h3 className="font-semibold text-slate-600">{title}</h3>
            <p className="text-3xl font-bold text-slate-800">{value}</p>
        </div>
    </Card>
);

const SystemHealthIndicator: React.FC<{ health: SystemHealth }> = ({ health }) => {
    const statusStyles = {
        OK: {
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>,
            text: 'text-green-700',
            bg: 'bg-green-50',
        },
        DEGRADED: {
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>,
            text: 'text-yellow-700',
            bg: 'bg-yellow-50',
        },
        DOWN: {
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>,
            text: 'text-red-700',
            bg: 'bg-red-50',
        }
    };
    const style = statusStyles[health.status];
    return (
        <div className={`p-4 rounded-lg flex items-center gap-4 ${style.bg}`}>
            {style.icon}
            <div>
                <p className={`font-semibold ${style.text}`}>System {health.status}</p>
                <p className={`text-sm ${style.text}`}>{health.message}</p>
            </div>
        </div>
    );
};

export const PrincipalAdminDashboard: React.FC<PrincipalAdminDashboardProps> = ({ user, addToast }) => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [totalUsers, setTotalUsers] = useState(0);
    const [metrics, setMetrics] = useState<UsageMetric[]>([]);
    const [loading, setLoading] = useState(true);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [systemHealth] = useState<SystemHealth>({ status: 'OK', message: 'All systems are operational.' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // FIX: Refactored logic to correctly fetch all users from all companies.
            const [companiesData, metricsData] = await Promise.all([
                api.getCompanies(),
                api.getPlatformUsageMetrics(),
            ]);
            
            const usersByCompany = await Promise.all(companiesData.map(c => api.getUsersByCompany(c.id)));
            const allUsers = usersByCompany.flat();
            
            // FIX: Changed number comparison to string comparison for IDs.
            const tenantCompanies = companiesData.filter(c => c.id !== '0');
            setCompanies(tenantCompanies as Company[]);
            // FIX: Changed number comparison to string comparison for IDs.
            setTotalUsers(allUsers.filter(u => u.companyId !== '0').length);
            setMetrics(metricsData);

        } catch (error) {
            addToast("Failed to load platform data.", "error");
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleInvite = async (companyName: string, adminEmail: string) => {
        addToast(`Invitation sent to ${adminEmail} for ${companyName}.`, 'success');
        // In a real app, this would trigger a backend process. Here we can just refresh data.
        fetchData();
    };

    const totalStorage = companies.reduce((acc, c) => acc + c.storageUsageGB, 0);

    if (loading) {
        return <Card><p>Loading Platform Dashboard...</p></Card>;
    }

    return (
        <div className="space-y-6">
            {isInviteModalOpen && <InviteCompanyModal onClose={() => setIsInviteModalOpen(false)} onInvite={handleInvite} />}
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-slate-800">Platform Administration</h2>
                <Button onClick={() => setIsInviteModalOpen(true)}>Invite New Company</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Total Companies" value={companies.length} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24"