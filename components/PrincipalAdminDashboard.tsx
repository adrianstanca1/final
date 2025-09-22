import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, SystemHealth, UsageMetric } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { InviteCompanyModal } from './InviteCompanyModal';
import { useTenant } from '../contexts/TenantContext';

interface PrincipalAdminDashboardProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
}

const KpiCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({
  title,
  value,
  icon,
}) => (
  <Card className="flex items-center gap-4">
    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
      {icon}
    </div>
    <div>
      <h3 className="text-sm font-semibold text-slate-600">{title}</h3>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
    </div>
  </Card>
);

const SystemHealthIndicator: React.FC<{ health: SystemHealth }> = ({ health }) => {
  const statusStyles = {
    OK: {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      ),
      text: 'text-green-700',
      bg: 'bg-green-50',
    },
    DEGRADED: {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      ),
      text: 'text-yellow-700',
      bg: 'bg-yellow-50',
    },
    DOWN: {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      ),
      text: 'text-red-700',
      bg: 'bg-red-50',
    },
  } as const;

  const style = statusStyles[health.status];

  return (
    <div className={`flex items-center gap-4 rounded-lg p-4 ${style.bg}`}>
      {style.icon}
      <div>
        <p className={`font-semibold ${style.text}`}>System {health.status}</p>
        <p className={`text-sm ${style.text}`}>{health.message}</p>
      </div>
    </div>
  );
};

export const PrincipalAdminDashboard: React.FC<PrincipalAdminDashboardProps> = ({ user, addToast }) => {
  const { tenants: tenantSummaries, refreshTenants } = useTenant();
  const [metrics, setMetrics] = useState<UsageMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [systemHealth] = useState<SystemHealth>({ status: 'OK', message: 'All systems are operational.' });
  const abortControllerRef = useRef<AbortController | null>(null);
  const tenantStatusStyles: Record<'OK' | 'DEGRADED' | 'DOWN', string> = {
    OK: 'bg-emerald-100 text-emerald-700',
    DEGRADED: 'bg-amber-100 text-amber-700',
    DOWN: 'bg-rose-100 text-rose-700',
  };

  const fetchData = useCallback(async () => {
    const controller = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      await refreshTenants();
      const metricsData = await api.getPlatformUsageMetrics({ signal: controller.signal });

      if (controller.signal.aborted) return;
      setMetrics(metricsData);
    } catch (error) {
      if (controller.signal.aborted) return;
      addToast('Failed to load platform data.', 'error');
    } finally {
      if (controller.signal.aborted) return;
      setLoading(false);
    }
  }, [addToast, refreshTenants]);

  useEffect(() => {
    fetchData();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchData]);

  const handleInvite = async (companyName: string, adminEmail: string) => {
    addToast(`Invitation sent to ${adminEmail} for ${companyName}.`, 'success');
    await fetchData();
  };

  const totalStorage = tenantSummaries.reduce((acc, tenant) => acc + (tenant.storageUsageGB || 0), 0);
  const totalUsers = tenantSummaries.reduce((acc, tenant) => acc + tenant.userCount, 0);
  const totalActiveProjects = tenantSummaries.reduce((acc, tenant) => acc + tenant.activeProjects, 0);
  const openIncidents = tenantSummaries.reduce((acc, tenant) => acc + tenant.openIncidents, 0);

  if (loading) {
    return (
      <Card>
        <p>Loading Platform Dashboard...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {isInviteModalOpen && (
        <InviteCompanyModal onClose={() => setIsInviteModalOpen(false)} onInvite={handleInvite} />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Platform Administration</h2>
          <p className="text-sm text-slate-600">
            Manage tenant accounts, monitor platform health, and keep an eye on adoption across the ecosystem.
          </p>
        </div>
        <Button onClick={() => setIsInviteModalOpen(true)}>Invite New Company</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total Tenants"
          value={tenantSummaries.length.toString()}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 7l9-4 9 4-9 4-9-4z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 10l-9 4-9-4" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12v7l7 3 7-3v-7" />
            </svg>
          }
        />
        <KpiCard
          title="Users Across Tenants"
          value={totalUsers.toLocaleString()}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
              />
              <circle cx="9" cy="7" r="4" strokeWidth={1.5} />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M23 20v-2a4 4 0 00-3-3.87"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 3.13A4 4 0 0119 7"
              />
            </svg>
          }
        />
        <KpiCard
          title="Active Projects"
          value={totalActiveProjects.toLocaleString()}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7h18M3 12h18M3 17h18" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21v-4M12 21v-4M17 21v-4" />
            </svg>
          }
        />
        <KpiCard
          title="Open Incidents"
          value={openIncidents.toLocaleString()}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-.01 6a9 9 0 110-18 9 9 0 010 18z" />
            </svg>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Tenant roster</h3>
              <p className="text-sm text-slate-600">
                Latest snapshot of every company on the platform. Total storage in use:{' '}
                <span className="font-semibold text-slate-900">{totalStorage.toFixed(1)} GB</span>.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => fetchData()}>
              Refresh
            </Button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Company</th>
                  <th className="px-4 py-3 text-left font-semibold">Plan</th>
                  <th className="px-4 py-3 text-right font-semibold">Users</th>
                  <th className="px-4 py-3 text-right font-semibold">Active projects</th>
                  <th className="px-4 py-3 text-right font-semibold">Storage</th>
                  <th className="px-4 py-3 text-left font-semibold">Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {tenantSummaries.map((tenant) => (
                  <tr key={tenant.companyId} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{tenant.companyName}</div>
                      <p className="text-xs text-slate-500">
                        {tenant.issues.length > 0 ? tenant.issues[0] : 'All systems healthy'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{tenant.plan}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{tenant.userCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{tenant.activeProjects}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{`${tenant.storageUsageGB.toFixed(1)} GB`}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${tenantStatusStyles[tenant.health]}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {tenant.health === 'OK' ? 'Operational' : tenant.health === 'DEGRADED' ? 'Degraded' : 'Attention needed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tenantSummaries.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No tenant companies found. Invite your first partner to get started.
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-semibold text-slate-900">Platform health</h3>
            <p className="text-sm text-slate-600">
              Automated checks running every 5 minutes to spot emerging issues across the stack.
            </p>
            <div className="mt-4">
              <SystemHealthIndicator health={systemHealth} />
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-slate-900">Usage metrics</h3>
            <p className="text-sm text-slate-600">Key activity signals from the last 24 hours.</p>
            <ul className="mt-4 space-y-3 text-sm">
              {metrics.map((metric) => (
                <li key={metric.name} className="flex items-center justify-between border-b border-dashed border-border pb-2">
                  <span className="font-medium text-slate-700">{metric.name}</span>
                  <span className="text-slate-900">{`${metric.value} ${metric.unit}`}</span>
                </li>
              ))}
              {metrics.length === 0 && <li className="text-sm text-muted-foreground">No usage data available.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};
