import React, { createContext, useContext, useEffect, useState } from 'react';
import { multiTenantService, Tenant, TenantFeatures } from '../services/multiTenant';
import { useAuth } from './AuthContext';

interface TenantContextType {
    currentTenant: Tenant | null;
    tenantFeatures: TenantFeatures | null;
    loading: boolean;
    error: string | null;

    // Tenant management
    switchTenant: (tenantId: string) => Promise<void>;
    hasFeature: (feature: keyof TenantFeatures) => boolean;
    getFeatureLimit: (feature: keyof TenantFeatures) => number;
    checkResourceLimit: (resourceType: string) => Promise<boolean>;

    // Usage tracking
    incrementUsage: (resourceType: keyof Tenant['billing']['usage'], amount?: number) => Promise<void>;
    getTenantStats: () => ReturnType<typeof multiTenantService.getTenantStats> | null;

    // Audit logging
    logAction: (action: string, resourceType: string, resourceId: string, details?: Record<string, any>) => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const useTenant = () => {
    const context = useContext(TenantContext);
    if (context === undefined) {
        throw new Error('useTenant must be used within a TenantProvider');
    }
    return context;
};

interface TenantProviderProps {
    children: React.ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
    const { user } = useAuth();
    const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
    const [tenantFeatures, setTenantFeatures] = useState<TenantFeatures | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user?.companyId) {
            loadTenant(user.companyId);
        } else {
            setLoading(false);
        }
    }, [user]);

    const loadTenant = async (tenantId: string) => {
        try {
            setLoading(true);
            setError(null);

            const tenant = multiTenantService.getTenant(tenantId);
            if (!tenant) {
                throw new Error('Tenant not found');
            }

            // Validate tenant access
            const hasAccess = await multiTenantService.validateTenantAccess(user?.id || '', tenantId);
            if (!hasAccess) {
                throw new Error('Access denied to tenant');
            }

            setCurrentTenant(tenant);
            setTenantFeatures(tenant.features);

            // Log tenant access
            if (user) {
                await multiTenantService.logAction(
                    tenantId,
                    user.id,
                    'tenant_accessed',
                    'tenant',
                    tenantId,
                    { userRole: user.role },
                    '127.0.0.1',
                    navigator.userAgent
                );
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load tenant');
            setCurrentTenant(null);
            setTenantFeatures(null);
        } finally {
            setLoading(false);
        }
    };

    const switchTenant = async (tenantId: string) => {
        await loadTenant(tenantId);
    };

    const hasFeature = (feature: keyof TenantFeatures): boolean => {
        if (!currentTenant) return false;
        return multiTenantService.hasFeature(currentTenant.id, feature);
    };

    const getFeatureLimit = (feature: keyof TenantFeatures): number => {
        if (!currentTenant) return 0;
        return multiTenantService.getFeatureLimit(currentTenant.id, feature);
    };

    const checkResourceLimit = async (resourceType: string): Promise<boolean> => {
        if (!currentTenant) return false;
        return multiTenantService.enforceResourceLimits(currentTenant.id, resourceType);
    };

    const incrementUsage = async (
        resourceType: keyof Tenant['billing']['usage'],
        amount: number = 1
    ): Promise<void> => {
        if (!currentTenant) return;

        await multiTenantService.updateResourceUsage(currentTenant.id, resourceType, amount);

        // Refresh tenant data to reflect updated usage
        const updatedTenant = multiTenantService.getTenant(currentTenant.id);
        if (updatedTenant) {
            setCurrentTenant(updatedTenant);
        }
    };

    const getTenantStats = () => {
        if (!currentTenant) return null;
        return multiTenantService.getTenantStats(currentTenant.id);
    };

    const logAction = async (
        action: string,
        resourceType: string,
        resourceId: string,
        details: Record<string, any> = {}
    ): Promise<void> => {
        if (!currentTenant || !user) return;

        await multiTenantService.logAction(
            currentTenant.id,
            user.id,
            action,
            resourceType,
            resourceId,
            details,
            '127.0.0.1',
            navigator.userAgent
        );
    };

    const value: TenantContextType = {
        currentTenant,
        tenantFeatures,
        loading,
        error,
        switchTenant,
        hasFeature,
        getFeatureLimit,
        checkResourceLimit,
        incrementUsage,
        getTenantStats,
        logAction,
    };

    return (
        <TenantContext.Provider value={value}>
            {children}
        </TenantContext.Provider>
    );
};

// Higher-order component for tenant feature gating
interface WithTenantFeatureProps {
    feature: keyof TenantFeatures;
    fallback?: React.ReactNode;
    children: React.ReactNode;
}

export const WithTenantFeature: React.FC<WithTenantFeatureProps> = ({
    feature,
    fallback = null,
    children
}) => {
    const { hasFeature } = useTenant();

    if (!hasFeature(feature)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};

// Hook for tenant-specific resource limits
export const useTenantLimits = () => {
    const { currentTenant, checkResourceLimit, incrementUsage } = useTenant();

    const checkLimit = async (resourceType: string): Promise<{ allowed: boolean; current: number; limit: number }> => {
        if (!currentTenant) {
            return { allowed: false, current: 0, limit: 0 };
        }

        const allowed = await checkResourceLimit(resourceType);
        const usage = currentTenant.billing.usage as any;
        const limits = currentTenant.billing.limits as any;

        return {
            allowed,
            current: usage[resourceType] || 0,
            limit: limits[resourceType] || 0
        };
    };

    const useResource = async (resourceType: string, amount: number = 1): Promise<boolean> => {
        const { allowed } = await checkLimit(resourceType);

        if (allowed) {
            await incrementUsage(resourceType as any, amount);
            return true;
        }

        return false;
    };

    return { checkLimit, useResource };
};

// Hook for tenant audit logging
export const useTenantAudit = () => {
    const { logAction } = useTenant();

    const logUserAction = async (
        action: string,
        details?: Record<string, any>
    ): Promise<void> => {
        await logAction(action, 'user_action', 'general', details);
    };

    const logProjectAction = async (
        projectId: string,
        action: string,
        details?: Record<string, any>
    ): Promise<void> => {
        await logAction(action, 'project', projectId, details);
    };

    const logTenderAction = async (
        tenderId: string,
        action: string,
        details?: Record<string, any>
    ): Promise<void> => {
        await logAction(action, 'tender', tenderId, details);
    };

    const logDataAccess = async (
        resourceType: string,
        resourceId: string,
        details?: Record<string, any>
    ): Promise<void> => {
        await logAction('data_accessed', resourceType, resourceId, details);
    };

    return {
        logUserAction,
        logProjectAction,
        logTenderAction,
        logDataAccess
    };
};

// Hook for tenant data scoping
export const useTenantData = () => {
    const { currentTenant } = useTenant();

    const scopeData = <T extends { id: string; companyId?: string; tenantId?: string }>(
        data: T[]
    ): T[] => {
        if (!currentTenant) return [];
        return multiTenantService.scopeData(data, currentTenant.id);
    };

    const addTenantScope = <T extends Record<string, any>>(data: T): T & { tenantId: string } => {
        if (!currentTenant) throw new Error('No active tenant');
        return { ...data, tenantId: currentTenant.id };
    };

    return { scopeData, addTenantScope };
};