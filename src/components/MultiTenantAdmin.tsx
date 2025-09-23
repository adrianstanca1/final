import React, { useState, useEffect } from 'react';
import { multiTenantService, Tenant, TenantInvitation, AuditLog } from '../services/multiTenant';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';
import './MultiTenantAdmin.css';

interface MultiTenantAdminProps {
    onClose: () => void;
}

export const MultiTenantAdmin: React.FC<MultiTenantAdminProps> = ({ onClose }) => {
    const { user } = useAuth();
    const { currentTenant } = useTenant();
    const [activeTab, setActiveTab] = useState<'overview' | 'tenants' | 'usage' | 'audit' | 'settings'>('overview');
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    // Only allow super admin access
    const isSuperAdmin = user?.role === Role.ADMIN && user?.email === 'super@admin.com';

    useEffect(() => {
        if (isSuperAdmin) {
            loadData();
        }
    }, [isSuperAdmin]);

    const loadData = async () => {
        try {
            setLoading(true);
            const allTenants = multiTenantService.getAllTenants();
            setTenants(allTenants);

            if (currentTenant) {
                const logs = multiTenantService.getAuditLogs(currentTenant.id, 50);
                setAuditLogs(logs);
            }
        } catch (error) {
            console.error('Error loading multi-tenant data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isSuperAdmin) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <h2 className="text-xl font-bold text-red-600 mb-4">Access Denied</h2>
                    <p className="text-gray-600 mb-6">
                        You don't have permission to access the multi-tenant administration panel.
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    const renderOverview = () => {
        const totalTenants = tenants.length;
        const activeTenants = tenants.filter(t => t.status === 'active').length;
        const trialTenants = tenants.filter(t => t.status === 'trial').length;
        const totalUsers = tenants.reduce((sum, t) => sum + t.billing.usage.users, 0);
        const totalRevenue = tenants.reduce((sum, t) => {
            const planPricing = { basic: 49, professional: 149, enterprise: 499 };
            return sum + (planPricing[t.plan as keyof typeof planPricing] || 0);
        }, 0);

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-blue-600">Total Tenants</h3>
                        <p className="text-2xl font-bold text-blue-900">{totalTenants}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-green-600">Active Tenants</h3>
                        <p className="text-2xl font-bold text-green-900">{activeTenants}</p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-yellow-600">Trial Tenants</h3>
                        <p className="text-2xl font-bold text-yellow-900">{trialTenants}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-purple-600">Monthly Revenue</h3>
                        <p className="text-2xl font-bold text-purple-900">${totalRevenue.toLocaleString()}</p>
                    </div>
                </div>

                <div className="bg-white border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                        {auditLogs.slice(0, 10).map((log) => (
                            <div key={log.id} className="flex items-center justify-between py-2 border-b">
                                <div>
                                    <span className="font-medium">{log.action.replace('_', ' ')}</span>
                                    <span className="text-gray-500 ml-2">by {log.userId}</span>
                                </div>
                                <span className="text-sm text-gray-400">
                                    {log.timestamp.toLocaleTimeString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderTenants = () => (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">All Tenants</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Add Tenant
                </button>
            </div>

            <div className="bg-white border rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Name</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Domain</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Plan</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Users</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Created</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {tenants.map((tenant) => (
                            <tr key={tenant.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium">{tenant.name}</td>
                                <td className="px-4 py-3 text-gray-600">{tenant.domain}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 text-xs rounded-full ${tenant.plan === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                                            tenant.plan === 'professional' ? 'bg-blue-100 text-blue-800' :
                                                'bg-gray-100 text-gray-800'
                                        }`}>
                                        {tenant.plan}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 text-xs rounded-full ${tenant.status === 'active' ? 'bg-green-100 text-green-800' :
                                            tenant.status === 'trial' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                        }`}>
                                        {tenant.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3">{tenant.billing.usage.users}</td>
                                <td className="px-4 py-3 text-gray-600">
                                    {tenant.createdAt.toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3">
                                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                                        Manage
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderUsage = () => {
        const usageData = tenants.map(tenant => ({
            name: tenant.name,
            plan: tenant.plan,
            users: tenant.billing.usage.users,
            projects: tenant.billing.usage.projects,
            storage: tenant.billing.usage.storage,
            aiCredits: tenant.billing.usage.aiCreditsUsed,
            apiCalls: tenant.billing.usage.apiCalls
        }));

        return (
            <div className="space-y-6">
                <h3 className="text-lg font-semibold">Usage Analytics</h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border rounded-lg p-6">
                        <h4 className="font-semibold mb-4">Resource Usage by Plan</h4>
                        <div className="space-y-4">
                            {['basic', 'professional', 'enterprise'].map(plan => {
                                const planTenants = tenants.filter(t => t.plan === plan);
                                const totalUsers = planTenants.reduce((sum, t) => sum + t.billing.usage.users, 0);
                                const totalProjects = planTenants.reduce((sum, t) => sum + t.billing.usage.projects, 0);

                                return (
                                    <div key={plan} className="flex justify-between items-center">
                                        <span className="capitalize font-medium">{plan}</span>
                                        <div className="text-sm text-gray-600">
                                            {planTenants.length} tenants • {totalUsers} users • {totalProjects} projects
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-white border rounded-lg p-6">
                        <h4 className="font-semibold mb-4">AI Credits Usage</h4>
                        <div className="space-y-3">
                            {tenants.slice(0, 5).map(tenant => {
                                const usage = tenant.billing.usage.aiCreditsUsed;
                                const limit = tenant.billing.limits.aiCredits;
                                const percentage = limit > 0 ? (usage / limit) * 100 : 0;

                                return (
                                    <div key={tenant.id}>
                                        <div className="flex justify-between text-sm">
                                            <span>{tenant.name}</span>
                                            <span>{usage} / {limit}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full progress-bar ${percentage > 80 ? 'bg-red-500' :
                                                        percentage > 60 ? 'bg-yellow-500' :
                                                            'bg-green-500'
                                                    }`}
                                                data-width={`${Math.round(Math.min(percentage, 100) / 5) * 5}%`}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="bg-white border rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Tenant</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Users</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Projects</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Storage (MB)</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">AI Credits</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">API Calls</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {usageData.map((data, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium">{data.name}</td>
                                    <td className="px-4 py-3">{data.users}</td>
                                    <td className="px-4 py-3">{data.projects}</td>
                                    <td className="px-4 py-3">{data.storage.toLocaleString()}</td>
                                    <td className="px-4 py-3">{data.aiCredits}</td>
                                    <td className="px-4 py-3">{data.apiCalls.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderAudit = () => (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Audit Logs</h3>
                <div className="flex space-x-2">
                    <select
                        className="px-3 py-2 border rounded"
                        title="Filter by tenant"
                        aria-label="Filter audit logs by tenant"
                    >
                        <option>All Tenants</option>
                        {tenants.map(tenant => (
                            <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                        ))}
                    </select>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        Export
                    </button>
                </div>
            </div>

            <div className="bg-white border rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Timestamp</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">User</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Action</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Resource</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Result</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">IP Address</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {auditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-600">
                                    {log.timestamp.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 font-medium">{log.userId}</td>
                                <td className="px-4 py-3">{log.action.replace('_', ' ')}</td>
                                <td className="px-4 py-3 text-gray-600">
                                    {log.resourceType}:{log.resourceId?.substring(0, 8)}...
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 text-xs rounded-full ${log.result === 'success' ? 'bg-green-100 text-green-800' :
                                            log.result === 'failure' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {log.result}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">{log.ipAddress}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderSettings = () => (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold">Multi-Tenant Settings</h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border rounded-lg p-6">
                    <h4 className="font-semibold mb-4">Default Plan Features</h4>
                    <div className="space-y-4">
                        {['basic', 'professional', 'enterprise'].map(plan => (
                            <div key={plan} className="border rounded p-4">
                                <h5 className="font-medium capitalize mb-2">{plan} Plan</h5>
                                <div className="text-sm space-y-1 text-gray-600">
                                    <div>Max Users: {plan === 'enterprise' ? 'Unlimited' : plan === 'professional' ? '25' : '5'}</div>
                                    <div>Max Projects: {plan === 'enterprise' ? 'Unlimited' : plan === 'professional' ? '50' : '10'}</div>
                                    <div>Storage: {plan === 'enterprise' ? '50GB' : plan === 'professional' ? '5GB' : '1GB'}</div>
                                    <div>AI Credits: {plan === 'enterprise' ? '5000' : plan === 'professional' ? '500' : '100'}/month</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white border rounded-lg p-6">
                    <h4 className="font-semibold mb-4">Security Settings</h4>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span>Data Encryption</span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">Enabled</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>Audit Logging</span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">Enabled</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>GDPR Compliance</span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">Active</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>Data Retention</span>
                            <span className="text-sm text-gray-600">7 years</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>Backup Frequency</span>
                            <span className="text-sm text-gray-600">Daily</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading multi-tenant data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-7xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-bold">Multi-Tenant Administration</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                        title="Close multi-tenant admin panel"
                        aria-label="Close panel"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    <div className="w-64 border-r bg-gray-50 p-4">
                        <nav className="space-y-1">
                            {[
                                { id: 'overview', label: 'Overview', icon: '📊' },
                                { id: 'tenants', label: 'Tenants', icon: '🏢' },
                                { id: 'usage', label: 'Usage Analytics', icon: '📈' },
                                { id: 'audit', label: 'Audit Logs', icon: '🔍' },
                                { id: 'settings', label: 'Settings', icon: '⚙️' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center space-x-2 ${activeTab === tab.id
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    <span>{tab.icon}</span>
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="flex-1 overflow-auto p-6">
                        {activeTab === 'overview' && renderOverview()}
                        {activeTab === 'tenants' && renderTenants()}
                        {activeTab === 'usage' && renderUsage()}
                        {activeTab === 'audit' && renderAudit()}
                        {activeTab === 'settings' && renderSettings()}
                    </div>
                </div>
            </div>
        </div>
    );
};