import { User, Role } from '../types';

export interface Tenant {
    id: string;
    name: string;
    domain: string;
    plan: 'basic' | 'professional' | 'enterprise';
    status: 'active' | 'suspended' | 'trial' | 'expired';
    features: TenantFeatures;
    settings: TenantSettings;
    billing: TenantBilling;
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
    metadata: Record<string, any>;
}

export interface TenantFeatures {
    maxUsers: number;
    maxProjects: number;
    maxStorage: number; // in MB
    aiCreditsPerMonth: number;
    advancedAnalytics: boolean;
    customBranding: boolean;
    apiAccess: boolean;
    ssoIntegration: boolean;
    prioritySupport: boolean;
    customMLModels: boolean;
    dataExport: boolean;
    auditLogs: boolean;
    whiteLabeling: boolean;
}

export interface TenantSettings {
    timezone: string;
    currency: string;
    dateFormat: string;
    language: string;
    emailNotifications: boolean;
    slackIntegration?: {
        enabled: boolean;
        webhookUrl?: string;
        channel?: string;
    };
    securitySettings: {
        passwordPolicy: {
            minLength: number;
            requireNumbers: boolean;
            requireSymbols: boolean;
            requireUppercase: boolean;
        };
        sessionTimeout: number; // minutes
        maxFailedLogins: number;
        twoFactorRequired: boolean;
        ipWhitelist?: string[];
    };
    branding: {
        logoUrl?: string;
        primaryColor?: string;
        secondaryColor?: string;
        companyName?: string;
    };
}

export interface TenantBilling {
    subscriptionId?: string;
    currentPlan: string;
    billingCycle: 'monthly' | 'yearly';
    nextBillingDate: Date;
    paymentStatus: 'active' | 'past_due' | 'cancelled' | 'unpaid';
    usage: {
        users: number;
        projects: number;
        storage: number;
        aiCreditsUsed: number;
        apiCalls: number;
    };
    limits: {
        users: number;
        projects: number;
        storage: number;
        aiCredits: number;
        apiCalls: number;
    };
}

export interface TenantInvitation {
    id: string;
    tenantId: string;
    email: string;
    role: Role;
    invitedBy: string;
    status: 'pending' | 'accepted' | 'expired' | 'revoked';
    token: string;
    expiresAt: Date;
    createdAt: Date;
}

export interface DataScope {
    tenantId: string;
    resourceType: string;
    resourceId: string;
    permissions: string[];
    createdAt: Date;
}

export interface AuditLog {
    id: string;
    tenantId: string;
    userId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    details: Record<string, any>;
    ipAddress: string;
    userAgent: string;
    timestamp: Date;
    result: 'success' | 'failure' | 'unauthorized';
}

export class MultiTenantService {
    private tenants: Tenant[] = [];
    private invitations: TenantInvitation[] = [];
    private auditLogs: AuditLog[] = [];
    private dataScopes: DataScope[] = [];

    constructor() {
        this.initializeDefaultTenants();
        this.loadStoredData();
    }

    private initializeDefaultTenants(): void {
        const now = new Date();
        
        this.tenants = [
            {
                id: 'tenant-demo-construction',
                name: 'Demo Construction Corp',
                domain: 'demo-construction.local',
                plan: 'enterprise',
                status: 'active',
                features: this.getFeaturesByPlan('enterprise'),
                settings: this.getDefaultSettings(),
                billing: this.getDefaultBilling('enterprise'),
                createdAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
                updatedAt: now,
                metadata: {
                    industry: 'construction',
                    size: 'large',
                    region: 'north-america'
                }
            },
            {
                id: 'tenant-alpha-builders',
                name: 'Alpha Builders LLC',
                domain: 'alpha-builders.local',
                plan: 'professional',
                status: 'active',
                features: this.getFeaturesByPlan('professional'),
                settings: this.getDefaultSettings(),
                billing: this.getDefaultBilling('professional'),
                createdAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
                updatedAt: now,
                metadata: {
                    industry: 'construction',
                    size: 'medium',
                    region: 'europe'
                }
            },
            {
                id: 'tenant-beta-contractors',
                name: 'Beta Contractors Inc',
                domain: 'beta-contractors.local',
                plan: 'basic',
                status: 'trial',
                features: this.getFeaturesByPlan('basic'),
                settings: this.getDefaultSettings(),
                billing: this.getDefaultBilling('basic'),
                createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
                updatedAt: now,
                expiresAt: new Date(now.getTime() + 16 * 24 * 60 * 60 * 1000), // 16 days from now
                metadata: {
                    industry: 'construction',
                    size: 'small',
                    region: 'asia-pacific'
                }
            }
        ];
    }

    private getFeaturesByPlan(plan: string): TenantFeatures {
        const planFeatures: Record<string, TenantFeatures> = {
            basic: {
                maxUsers: 5,
                maxProjects: 10,
                maxStorage: 1024, // 1GB
                aiCreditsPerMonth: 100,
                advancedAnalytics: false,
                customBranding: false,
                apiAccess: false,
                ssoIntegration: false,
                prioritySupport: false,
                customMLModels: false,
                dataExport: true,
                auditLogs: false,
                whiteLabeling: false
            },
            professional: {
                maxUsers: 25,
                maxProjects: 50,
                maxStorage: 5120, // 5GB
                aiCreditsPerMonth: 500,
                advancedAnalytics: true,
                customBranding: true,
                apiAccess: true,
                ssoIntegration: false,
                prioritySupport: false,
                customMLModels: false,
                dataExport: true,
                auditLogs: true,
                whiteLabeling: false
            },
            enterprise: {
                maxUsers: -1, // unlimited
                maxProjects: -1, // unlimited
                maxStorage: 51200, // 50GB
                aiCreditsPerMonth: 5000,
                advancedAnalytics: true,
                customBranding: true,
                apiAccess: true,
                ssoIntegration: true,
                prioritySupport: true,
                customMLModels: true,
                dataExport: true,
                auditLogs: true,
                whiteLabeling: true
            }
        };

        return planFeatures[plan] || planFeatures.basic;
    }

    private getDefaultSettings(): TenantSettings {
        return {
            timezone: 'America/New_York',
            currency: 'USD',
            dateFormat: 'MM/DD/YYYY',
            language: 'en',
            emailNotifications: true,
            securitySettings: {
                passwordPolicy: {
                    minLength: 8,
                    requireNumbers: true,
                    requireSymbols: true,
                    requireUppercase: true
                },
                sessionTimeout: 480, // 8 hours
                maxFailedLogins: 5,
                twoFactorRequired: false
            },
            branding: {}
        };
    }

    private getDefaultBilling(plan: string): TenantBilling {
        const planPricing: Record<string, number> = {
            basic: 49,
            professional: 149,
            enterprise: 499
        };

        return {
            currentPlan: plan,
            billingCycle: 'monthly',
            nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            paymentStatus: 'active',
            usage: {
                users: 0,
                projects: 0,
                storage: 0,
                aiCreditsUsed: 0,
                apiCalls: 0
            },
            limits: this.getFeaturesByPlan(plan) as any
        };
    }

    private loadStoredData(): void {
        try {
            const storedTenants = localStorage.getItem('mt_tenants');
            const storedInvitations = localStorage.getItem('mt_invitations');
            const storedAuditLogs = localStorage.getItem('mt_audit_logs');
            const storedDataScopes = localStorage.getItem('mt_data_scopes');

            if (storedTenants) {
                const parsed = JSON.parse(storedTenants);
                this.tenants = parsed.map((tenant: any) => ({
                    ...tenant,
                    createdAt: new Date(tenant.createdAt),
                    updatedAt: new Date(tenant.updatedAt),
                    expiresAt: tenant.expiresAt ? new Date(tenant.expiresAt) : undefined,
                    billing: {
                        ...tenant.billing,
                        nextBillingDate: new Date(tenant.billing.nextBillingDate)
                    }
                }));
            }

            if (storedInvitations) {
                const parsed = JSON.parse(storedInvitations);
                this.invitations = parsed.map((inv: any) => ({
                    ...inv,
                    expiresAt: new Date(inv.expiresAt),
                    createdAt: new Date(inv.createdAt)
                }));
            }

            if (storedAuditLogs) {
                const parsed = JSON.parse(storedAuditLogs);
                this.auditLogs = parsed.map((log: any) => ({
                    ...log,
                    timestamp: new Date(log.timestamp)
                }));
            }

            if (storedDataScopes) {
                const parsed = JSON.parse(storedDataScopes);
                this.dataScopes = parsed.map((scope: any) => ({
                    ...scope,
                    createdAt: new Date(scope.createdAt)
                }));
            }
        } catch (error) {
            console.error('Error loading multi-tenant data:', error);
        }
    }

    private saveStoredData(): void {
        try {
            localStorage.setItem('mt_tenants', JSON.stringify(this.tenants));
            localStorage.setItem('mt_invitations', JSON.stringify(this.invitations));
            localStorage.setItem('mt_audit_logs', JSON.stringify(this.auditLogs));
            localStorage.setItem('mt_data_scopes', JSON.stringify(this.dataScopes));
        } catch (error) {
            console.error('Error saving multi-tenant data:', error);
        }
    }

    // Tenant Management
    async createTenant(
        name: string,
        domain: string,
        plan: 'basic' | 'professional' | 'enterprise',
        adminEmail: string,
        metadata?: Record<string, any>
    ): Promise<Tenant> {
        const now = new Date();
        const tenantId = `tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const tenant: Tenant = {
            id: tenantId,
            name,
            domain,
            plan,
            status: 'trial',
            features: this.getFeaturesByPlan(plan),
            settings: this.getDefaultSettings(),
            billing: this.getDefaultBilling(plan),
            createdAt: now,
            updatedAt: now,
            expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 day trial
            metadata: metadata || {}
        };

        this.tenants.push(tenant);
        this.saveStoredData();

        // Create admin invitation
        await this.createInvitation(tenantId, adminEmail, Role.ADMIN, 'system');

        await this.logAction(tenantId, 'system', 'tenant_created', 'tenant', tenantId, {
            name, domain, plan
        }, '127.0.0.1', 'system');

        return tenant;
    }

    getTenant(tenantId: string): Tenant | null {
        return this.tenants.find(t => t.id === tenantId) || null;
    }

    getTenantByDomain(domain: string): Tenant | null {
        return this.tenants.find(t => t.domain === domain) || null;
    }

    async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<Tenant> {
        const tenant = this.getTenant(tenantId);
        if (!tenant) {
            throw new Error('Tenant not found');
        }

        const updatedTenant = {
            ...tenant,
            ...updates,
            updatedAt: new Date()
        };

        const index = this.tenants.findIndex(t => t.id === tenantId);
        this.tenants[index] = updatedTenant;
        this.saveStoredData();

        return updatedTenant;
    }

    // Data Isolation and Scoping
    scopeData<T extends { id: string; companyId?: string; tenantId?: string }>(
        data: T[],
        tenantId: string
    ): T[] {
        return data.filter(item => 
            item.tenantId === tenantId || 
            item.companyId === tenantId || 
            (!item.tenantId && !item.companyId) // legacy data
        );
    }

    async validateTenantAccess(userId: string, tenantId: string): Promise<boolean> {
        // In production, this would check user-tenant relationships
        // For now, simulate access validation
        const tenant = this.getTenant(tenantId);
        return tenant?.status === 'active' || tenant?.status === 'trial';
    }

    async enforceResourceLimits(tenantId: string, resourceType: string): Promise<boolean> {
        const tenant = this.getTenant(tenantId);
        if (!tenant) return false;

        const usage = tenant.billing.usage;
        const limits = tenant.billing.limits;

        switch (resourceType) {
            case 'users':
                return limits.users === -1 || usage.users < limits.users;
            case 'projects':
                return limits.projects === -1 || usage.projects < limits.projects;
            case 'storage':
                return usage.storage < limits.storage;
            case 'ai_credits':
                return usage.aiCreditsUsed < limits.aiCredits;
            case 'api_calls':
                return usage.apiCalls < limits.apiCalls;
            default:
                return true;
        }
    }

    async updateResourceUsage(
        tenantId: string,
        resourceType: keyof TenantBilling['usage'],
        increment: number
    ): Promise<void> {
        const tenant = this.getTenant(tenantId);
        if (!tenant) return;

        tenant.billing.usage[resourceType] += increment;
        tenant.updatedAt = new Date();
        this.saveStoredData();
    }

    // Invitation Management
    async createInvitation(
        tenantId: string,
        email: string,
        role: Role,
        invitedBy: string
    ): Promise<TenantInvitation> {
        const invitation: TenantInvitation = {
            id: `invite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            tenantId,
            email,
            role,
            invitedBy,
            status: 'pending',
            token: this.generateInvitationToken(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            createdAt: new Date()
        };

        this.invitations.push(invitation);
        this.saveStoredData();

        await this.logAction(tenantId, invitedBy, 'user_invited', 'invitation', invitation.id, {
            email, role
        }, '127.0.0.1', 'system');

        return invitation;
    }

    private generateInvitationToken(): string {
        return Math.random().toString(36).substr(2, 32);
    }

    getInvitation(token: string): TenantInvitation | null {
        return this.invitations.find(inv => 
            inv.token === token && 
            inv.status === 'pending' && 
            inv.expiresAt > new Date()
        ) || null;
    }

    async acceptInvitation(token: string): Promise<TenantInvitation> {
        const invitation = this.getInvitation(token);
        if (!invitation) {
            throw new Error('Invalid or expired invitation');
        }

        invitation.status = 'accepted';
        this.saveStoredData();

        await this.logAction(invitation.tenantId, 'system', 'invitation_accepted', 'invitation', invitation.id, {
            email: invitation.email
        }, '127.0.0.1', 'system');

        return invitation;
    }

    // Audit Logging
    async logAction(
        tenantId: string,
        userId: string,
        action: string,
        resourceType: string,
        resourceId: string,
        details: Record<string, any>,
        ipAddress: string,
        userAgent: string,
        result: 'success' | 'failure' | 'unauthorized' = 'success'
    ): Promise<void> {
        const auditLog: AuditLog = {
            id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            tenantId,
            userId,
            action,
            resourceType,
            resourceId,
            details,
            ipAddress,
            userAgent,
            timestamp: new Date(),
            result
        };

        this.auditLogs.push(auditLog);
        
        // Keep only last 10000 logs to prevent memory issues
        if (this.auditLogs.length > 10000) {
            this.auditLogs = this.auditLogs.slice(-10000);
        }
        
        this.saveStoredData();
    }

    getAuditLogs(tenantId: string, limit: number = 100): AuditLog[] {
        return this.auditLogs
            .filter(log => log.tenantId === tenantId)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    }

    // Feature Access Control
    hasFeature(tenantId: string, feature: keyof TenantFeatures): boolean {
        const tenant = this.getTenant(tenantId);
        if (!tenant || tenant.status !== 'active') return false;
        
        return tenant.features[feature] as boolean;
    }

    getFeatureLimit(tenantId: string, feature: keyof TenantFeatures): number {
        const tenant = this.getTenant(tenantId);
        if (!tenant) return 0;
        
        return tenant.features[feature] as number;
    }

    // Statistics and Analytics
    getTenantStats(tenantId: string): {
        users: number;
        projects: number;
        storage: number;
        aiCreditsUsed: number;
        apiCalls: number;
        auditLogs: number;
        planFeatures: TenantFeatures;
    } {
        const tenant = this.getTenant(tenantId);
        if (!tenant) throw new Error('Tenant not found');

        return {
            users: tenant.billing.usage.users,
            projects: tenant.billing.usage.projects,
            storage: tenant.billing.usage.storage,
            aiCreditsUsed: tenant.billing.usage.aiCreditsUsed,
            apiCalls: tenant.billing.usage.apiCalls,
            auditLogs: this.auditLogs.filter(log => log.tenantId === tenantId).length,
            planFeatures: tenant.features
        };
    }

    getAllTenants(): Tenant[] {
        return this.tenants.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    // Security and Compliance
    async checkComplianceStatus(tenantId: string): Promise<{
        gdprCompliant: boolean;
        dataRetentionPeriod: number;
        encryptionEnabled: boolean;
        auditLogRetention: number;
        backupFrequency: string;
    }> {
        const tenant = this.getTenant(tenantId);
        if (!tenant) throw new Error('Tenant not found');

        return {
            gdprCompliant: true,
            dataRetentionPeriod: 2555, // days (7 years)
            encryptionEnabled: true,
            auditLogRetention: 365, // days
            backupFrequency: 'daily'
        };
    }
}

// Export singleton instance
export const multiTenantService = new MultiTenantService();