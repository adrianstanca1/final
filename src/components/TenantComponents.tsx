import React, { ReactNode } from 'react';
import { useTenant, WithTenantFeature } from '../contexts/TenantContext';
import { TenantFeatures } from '../services/multiTenant';

interface TenantDataBoundaryProps {
    children: ReactNode;
    requiredFeature?: keyof TenantFeatures;
    fallback?: ReactNode;
    showUpgrade?: boolean;
}

export const TenantDataBoundary: React.FC<TenantDataBoundaryProps> = ({
    children,
    requiredFeature,
    fallback = null,
    showUpgrade = true
}) => {
    const { currentTenant, hasFeature } = useTenant();

    // Check if tenant is active
    if (!currentTenant || (currentTenant.status !== 'active' && currentTenant.status !== 'trial')) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <h3 className="text-lg font-semibold text-red-800 mb-2">Account Suspended</h3>
                <p className="text-red-600 mb-4">
                    Your account is currently {currentTenant?.status || 'inactive'}.
                    Please contact support to reactivate your account.
                </p>
                <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                    Contact Support
                </button>
            </div>
        );
    }

    // Check feature access if required
    if (requiredFeature && !hasFeature(requiredFeature)) {
        if (showUpgrade) {
            return (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">Feature Upgrade Required</h3>
                    <p className="text-blue-600 mb-4">
                        This feature requires a {currentTenant.plan === 'basic' ? 'Professional or Enterprise' : 'Enterprise'} plan.
                    </p>
                    <div className="space-y-2">
                        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-3">
                            Upgrade Plan
                        </button>
                        <button className="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50">
                            Learn More
                        </button>
                    </div>
                </div>
            );
        }
        return <>{fallback}</>;
    }

    return <>{children}</>;
};

interface TenantUsageBadgeProps {
    resourceType: keyof TenantFeatures;
    current: number;
    className?: string;
}

export const TenantUsageBadge: React.FC<TenantUsageBadgeProps> = ({
    resourceType,
    current,
    className = ""
}) => {
    const { getFeatureLimit } = useTenant();
    const limit = getFeatureLimit(resourceType);

    if (limit === -1) {
        return (
            <span className={`px-2 py-1 text-xs bg-green-100 text-green-800 rounded ${className}`}>
                Unlimited
            </span>
        );
    }

    const percentage = limit > 0 ? (current / limit) * 100 : 0;
    const isNearLimit = percentage > 80;
    const isOverLimit = percentage >= 100;

    return (
        <span className={`px-2 py-1 text-xs rounded ${isOverLimit ? 'bg-red-100 text-red-800' :
                isNearLimit ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
            } ${className}`}>
            {current} / {limit}
        </span>
    );
};

interface TenantResourceGuardProps {
    resourceType: string;
    children: ReactNode;
    fallback?: ReactNode;
    onLimitReached?: () => void;
}

export const TenantResourceGuard: React.FC<TenantResourceGuardProps> = ({
    resourceType,
    children,
    fallback,
    onLimitReached
}) => {
    const { currentTenant } = useTenant();
    const [hasCapacity, setHasCapacity] = React.useState(true);

    React.useEffect(() => {
        if (currentTenant) {
            const usage = currentTenant.billing.usage as any;
            const limits = currentTenant.billing.limits as any;
            const current = usage[resourceType] || 0;
            const limit = limits[resourceType] || 0;

            const canProceed = limit === -1 || current < limit;
            setHasCapacity(canProceed);

            if (!canProceed && onLimitReached) {
                onLimitReached();
            }
        }
    }, [currentTenant, resourceType, onLimitReached]);

    if (!hasCapacity) {
        return (
            <>{fallback || (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <h4 className="font-semibold text-yellow-800 mb-2">Resource Limit Reached</h4>
                    <p className="text-yellow-600 text-sm mb-3">
                        You've reached your {resourceType} limit for your current plan.
                    </p>
                    <button className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700">
                        Upgrade Plan
                    </button>
                </div>
            )}</>
        );
    }

    return <>{children}</>;
};

interface TenantStatsCardProps {
    title: string;
    current: number;
    limit: number;
    unit?: string;
    className?: string;
}

export const TenantStatsCard: React.FC<TenantStatsCardProps> = ({
    title,
    current,
    limit,
    unit = "",
    className = ""
}) => {
    const percentage = limit === -1 ? 0 : limit > 0 ? (current / limit) * 100 : 0;
    const isUnlimited = limit === -1;

    return (
        <div className={`bg-white border rounded-lg p-4 ${className}`}>
            <h4 className="font-medium text-gray-700 mb-2">{title}</h4>
            <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold">
                    {current.toLocaleString()}{unit}
                </span>
                {!isUnlimited && (
                    <span className="text-sm text-gray-500">
                        / {limit.toLocaleString()}{unit}
                    </span>
                )}
            </div>
            {!isUnlimited && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                        className={`h-2 rounded-full progress-bar ${percentage > 80 ? 'bg-red-500' :
                                percentage > 60 ? 'bg-yellow-500' :
                                    'bg-green-500'
                            }`}
                        data-width={`${Math.round(Math.min(percentage, 100) / 5) * 5}%`}
                    />
                </div>
            )}
            {isUnlimited && (
                <span className="text-sm text-green-600 font-medium">Unlimited</span>
            )}
        </div>
    );
};

interface TenantPlanBadgeProps {
    plan: string;
    status: string;
    className?: string;
}

export const TenantPlanBadge: React.FC<TenantPlanBadgeProps> = ({
    plan,
    status,
    className = ""
}) => {
    const planColors = {
        basic: 'bg-gray-100 text-gray-800',
        professional: 'bg-blue-100 text-blue-800',
        enterprise: 'bg-purple-100 text-purple-800'
    };

    const statusColors = {
        active: 'bg-green-100 text-green-800',
        trial: 'bg-yellow-100 text-yellow-800',
        suspended: 'bg-red-100 text-red-800',
        expired: 'bg-red-100 text-red-800'
    };

    return (
        <div className={`flex items-center space-x-2 ${className}`}>
            <span className={`px-2 py-1 text-xs rounded-full font-medium capitalize ${planColors[plan as keyof typeof planColors] || planColors.basic
                }`}>
                {plan}
            </span>
            <span className={`px-2 py-1 text-xs rounded-full font-medium capitalize ${statusColors[status as keyof typeof statusColors] || statusColors.active
                }`}>
                {status}
            </span>
        </div>
    );
};

// Tenant feature gate component wrapper
export const TenantFeatureGate: React.FC<{
    feature: keyof TenantFeatures;
    children: ReactNode;
    fallback?: ReactNode;
}> = ({ feature, children, fallback }) => {
    return (
        <WithTenantFeature feature={feature} fallback={fallback}>
            {children}
        </WithTenantFeature>
    );
};

// Tenant audit trail component
interface TenantAuditTrailProps {
    resourceType?: string;
    resourceId?: string;
    limit?: number;
    className?: string;
}

export const TenantAuditTrail: React.FC<TenantAuditTrailProps> = ({
    resourceType,
    resourceId,
    limit = 10,
    className = ""
}) => {
    const { currentTenant } = useTenant();
    const [auditLogs, setAuditLogs] = React.useState<any[]>([]);

    React.useEffect(() => {
        if (currentTenant) {
            // In a real implementation, this would filter by resourceType and resourceId
            const logs = JSON.parse(localStorage.getItem('mt_audit_logs') || '[]')
                .filter((log: any) => log.tenantId === currentTenant.id)
                .filter((log: any) => !resourceType || log.resourceType === resourceType)
                .filter((log: any) => !resourceId || log.resourceId === resourceId)
                .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, limit);

            setAuditLogs(logs);
        }
    }, [currentTenant, resourceType, resourceId, limit]);

    if (auditLogs.length === 0) {
        return (
            <div className={`text-center text-gray-500 py-4 ${className}`}>
                No audit logs found
            </div>
        );
    }

    return (
        <div className={`space-y-2 ${className}`}>
            <h4 className="font-medium text-gray-700 mb-3">Recent Activity</h4>
            {auditLogs.map((log, index) => (
                <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded text-sm">
                    <div>
                        <span className="font-medium">{log.action?.replace('_', ' ')}</span>
                        <span className="text-gray-500 ml-2">by {log.userId}</span>
                    </div>
                    <span className="text-gray-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                </div>
            ))}
        </div>
    );
};