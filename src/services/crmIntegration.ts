import { Project, User, Client, Invoice, Task, Lead, Company } from '../types';

// CRM Platform Types
export interface CRMConfig {
    platform: 'salesforce' | 'hubspot' | 'pipedrive' | 'zoho';
    apiKey?: string;
    accessToken?: string;
    refreshToken?: string;
    instanceUrl?: string;
    clientId?: string;
    clientSecret?: string;
    enabled: boolean;
    syncFrequency: number; // minutes
    lastSync?: Date;
    syncMapping: CRMFieldMapping;
}

export interface CRMFieldMapping {
    // Lead/Contact mapping
    leads: {
        name: string;
        email: string;
        phone: string;
        company: string;
        source: string;
        status: string;
        value: string;
        tags: string;
        notes: string;
    };
    // Company/Account mapping
    companies: {
        name: string;
        industry: string;
        size: string;
        revenue: string;
        phone: string;
        website: string;
        address: string;
    };
    // Opportunity/Deal mapping
    opportunities: {
        name: string;
        stage: string;
        value: string;
        closeDate: string;
        probability: string;
        description: string;
        contactId: string;
        accountId: string;
    };
}

export interface CRMSyncResult {
    success: boolean;
    recordsProcessed: number;
    recordsCreated: number;
    recordsUpdated: number;
    recordsSkipped: number;
    errors: CRMSyncError[];
    lastSyncTime: Date;
    nextSyncTime: Date;
}

export interface CRMSyncError {
    recordId: string;
    recordType: string;
    error: string;
    details?: any;
}

export interface CRMRecord {
    id: string;
    type: 'lead' | 'contact' | 'account' | 'opportunity';
    externalId: string;
    platform: string;
    data: Record<string, any>;
    lastSynced: Date;
    syncStatus: 'pending' | 'synced' | 'error';
    localId?: string;
}

export interface CRMWebhook {
    id: string;
    platform: string;
    event: string;
    url: string;
    secret: string;
    enabled: boolean;
    createdAt: Date;
}

export class CRMIntegrationService {
    private configs: Map<string, CRMConfig> = new Map();
    private syncQueue: CRMRecord[] = [];
    private webhooks: CRMWebhook[] = [];
    private isAutoSyncEnabled = true;
    private syncInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.initializeDefaultConfigs();
        this.loadStoredData();
        this.startAutoSync();
    }

    private initializeDefaultConfigs(): void {
        // Salesforce configuration
        const salesforceConfig: CRMConfig = {
            platform: 'salesforce',
            enabled: false,
            syncFrequency: 15, // 15 minutes
            syncMapping: {
                leads: {
                    name: 'Name',
                    email: 'Email',
                    phone: 'Phone',
                    company: 'Company',
                    source: 'LeadSource',
                    status: 'Status',
                    value: 'AnnualRevenue',
                    tags: 'Industry',
                    notes: 'Description'
                },
                companies: {
                    name: 'Name',
                    industry: 'Industry',
                    size: 'NumberOfEmployees',
                    revenue: 'AnnualRevenue',
                    phone: 'Phone',
                    website: 'Website',
                    address: 'BillingStreet'
                },
                opportunities: {
                    name: 'Name',
                    stage: 'StageName',
                    value: 'Amount',
                    closeDate: 'CloseDate',
                    probability: 'Probability',
                    description: 'Description',
                    contactId: 'ContactId',
                    accountId: 'AccountId'
                }
            }
        };

        // HubSpot configuration
        const hubspotConfig: CRMConfig = {
            platform: 'hubspot',
            enabled: false,
            syncFrequency: 10, // 10 minutes
            syncMapping: {
                leads: {
                    name: 'firstname,lastname',
                    email: 'email',
                    phone: 'phone',
                    company: 'company',
                    source: 'hs_lead_status',
                    status: 'lifecyclestage',
                    value: 'hs_predicted_amount',
                    tags: 'industry',
                    notes: 'notes_last_contacted'
                },
                companies: {
                    name: 'name',
                    industry: 'industry',
                    size: 'numberofemployees',
                    revenue: 'annualrevenue',
                    phone: 'phone',
                    website: 'website',
                    address: 'address'
                },
                opportunities: {
                    name: 'dealname',
                    stage: 'dealstage',
                    value: 'amount',
                    closeDate: 'closedate',
                    probability: 'hs_deal_probability',
                    description: 'description',
                    contactId: 'associatedcontactid',
                    accountId: 'associatedcompanyid'
                }
            }
        };

        this.configs.set('salesforce', salesforceConfig);
        this.configs.set('hubspot', hubspotConfig);
    }

    private loadStoredData(): void {
        try {
            const storedConfigs = localStorage.getItem('crm_configs');
            const storedQueue = localStorage.getItem('crm_sync_queue');
            const storedWebhooks = localStorage.getItem('crm_webhooks');

            if (storedConfigs) {
                const parsed = JSON.parse(storedConfigs);
                Object.entries(parsed).forEach(([key, config]: [string, any]) => {
                    this.configs.set(key, {
                        ...config,
                        lastSync: config.lastSync ? new Date(config.lastSync) : undefined
                    });
                });
            }

            if (storedQueue) {
                this.syncQueue = JSON.parse(storedQueue).map((record: any) => ({
                    ...record,
                    lastSynced: new Date(record.lastSynced)
                }));
            }

            if (storedWebhooks) {
                this.webhooks = JSON.parse(storedWebhooks).map((webhook: any) => ({
                    ...webhook,
                    createdAt: new Date(webhook.createdAt)
                }));
            }
        } catch (error) {
            console.error('Error loading CRM data:', error);
        }
    }

    private saveStoredData(): void {
        try {
            const configsObj = Object.fromEntries(this.configs);
            localStorage.setItem('crm_configs', JSON.stringify(configsObj));
            localStorage.setItem('crm_sync_queue', JSON.stringify(this.syncQueue));
            localStorage.setItem('crm_webhooks', JSON.stringify(this.webhooks));
        } catch (error) {
            console.error('Error saving CRM data:', error);
        }
    }

    private startAutoSync(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        // Run sync every 5 minutes, checking each platform's sync frequency
        this.syncInterval = setInterval(() => {
            if (this.isAutoSyncEnabled) {
                this.performAutoSync();
            }
        }, 5 * 60 * 1000); // 5 minutes
    }

    private async performAutoSync(): Promise<void> {
        const now = new Date();
        
        for (const [platform, config] of this.configs) {
            if (!config.enabled) continue;
            
            const shouldSync = !config.lastSync || 
                (now.getTime() - config.lastSync.getTime()) >= (config.syncFrequency * 60 * 1000);
            
            if (shouldSync) {
                try {
                    await this.syncWithPlatform(platform);
                } catch (error) {
                    console.error(`Auto-sync failed for ${platform}:`, error);
                }
            }
        }
    }

    // Configuration Management
    async updateCRMConfig(platform: string, config: Partial<CRMConfig>): Promise<void> {
        const existingConfig = this.configs.get(platform);
        if (!existingConfig) {
            throw new Error(`CRM platform ${platform} not supported`);
        }

        const updatedConfig = { ...existingConfig, ...config };
        this.configs.set(platform, updatedConfig);
        this.saveStoredData();

        // Test connection if being enabled
        if (config.enabled && !existingConfig.enabled) {
            await this.testConnection(platform);
        }
    }

    getCRMConfig(platform: string): CRMConfig | null {
        return this.configs.get(platform) || null;
    }

    getAllCRMConfigs(): Record<string, CRMConfig> {
        return Object.fromEntries(this.configs);
    }

    // Connection Testing
    async testConnection(platform: string): Promise<{ success: boolean; message: string }> {
        const config = this.configs.get(platform);
        if (!config) {
            return { success: false, message: 'Platform not configured' };
        }

        try {
            // Simulate API connection test
            await this.simulateAPICall(platform, 'GET', '/test');
            
            return { success: true, message: 'Connection successful' };
        } catch (error) {
            return { 
                success: false, 
                message: error instanceof Error ? error.message : 'Connection failed' 
            };
        }
    }

    // Data Synchronization
    async syncWithPlatform(platform: string): Promise<CRMSyncResult> {
        const config = this.configs.get(platform);
        if (!config || !config.enabled) {
            throw new Error(`Platform ${platform} is not enabled`);
        }

        const startTime = new Date();
        let recordsProcessed = 0;
        let recordsCreated = 0;
        let recordsUpdated = 0;
        let recordsSkipped = 0;
        const errors: CRMSyncError[] = [];

        try {
            // Sync leads/contacts
            const leadsResult = await this.syncLeads(platform);
            recordsProcessed += leadsResult.processed;
            recordsCreated += leadsResult.created;
            recordsUpdated += leadsResult.updated;
            recordsSkipped += leadsResult.skipped;
            errors.push(...leadsResult.errors);

            // Sync companies/accounts
            const companiesResult = await this.syncCompanies(platform);
            recordsProcessed += companiesResult.processed;
            recordsCreated += companiesResult.created;
            recordsUpdated += companiesResult.updated;
            recordsSkipped += companiesResult.skipped;
            errors.push(...companiesResult.errors);

            // Sync opportunities/deals
            const opportunitiesResult = await this.syncOpportunities(platform);
            recordsProcessed += opportunitiesResult.processed;
            recordsCreated += opportunitiesResult.created;
            recordsUpdated += opportunitiesResult.updated;
            recordsSkipped += opportunitiesResult.skipped;
            errors.push(...opportunitiesResult.errors);

            // Update last sync time
            config.lastSync = startTime;
            this.configs.set(platform, config);
            this.saveStoredData();

            return {
                success: errors.length === 0,
                recordsProcessed,
                recordsCreated,
                recordsUpdated,
                recordsSkipped,
                errors,
                lastSyncTime: startTime,
                nextSyncTime: new Date(startTime.getTime() + config.syncFrequency * 60 * 1000)
            };
        } catch (error) {
            errors.push({
                recordId: 'sync_error',
                recordType: 'sync',
                error: error instanceof Error ? error.message : 'Unknown sync error'
            });

            return {
                success: false,
                recordsProcessed,
                recordsCreated,
                recordsUpdated,
                recordsSkipped,
                errors,
                lastSyncTime: startTime,
                nextSyncTime: new Date(startTime.getTime() + config.syncFrequency * 60 * 1000)
            };
        }
    }

    private async syncLeads(platform: string): Promise<{
        processed: number;
        created: number;
        updated: number;
        skipped: number;
        errors: CRMSyncError[];
    }> {
        // Simulate lead sync from CRM platform
        const mockLeads = await this.fetchMockCRMData(platform, 'leads');
        let processed = 0;
        let created = 0;
        let updated = 0;
        let skipped = 0;
        const errors: CRMSyncError[] = [];

        for (const leadData of mockLeads) {
            try {
                processed++;
                const existingLead = this.findExistingRecord(leadData.id, 'lead');
                
                if (existingLead) {
                    // Update existing lead
                    await this.updateLocalLead(existingLead, leadData);
                    updated++;
                } else {
                    // Create new lead
                    await this.createLocalLead(leadData, platform);
                    created++;
                }
            } catch (error) {
                errors.push({
                    recordId: leadData.id,
                    recordType: 'lead',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                skipped++;
            }
        }

        return { processed, created, updated, skipped, errors };
    }

    private async syncCompanies(platform: string): Promise<{
        processed: number;
        created: number;
        updated: number;
        skipped: number;
        errors: CRMSyncError[];
    }> {
        // Similar implementation for companies
        const mockCompanies = await this.fetchMockCRMData(platform, 'companies');
        return {
            processed: mockCompanies.length,
            created: Math.floor(mockCompanies.length * 0.3),
            updated: Math.floor(mockCompanies.length * 0.6),
            skipped: Math.floor(mockCompanies.length * 0.1),
            errors: []
        };
    }

    private async syncOpportunities(platform: string): Promise<{
        processed: number;
        created: number;
        updated: number;
        skipped: number;
        errors: CRMSyncError[];
    }> {
        // Similar implementation for opportunities
        const mockOpportunities = await this.fetchMockCRMData(platform, 'opportunities');
        return {
            processed: mockOpportunities.length,
            created: Math.floor(mockOpportunities.length * 0.4),
            updated: Math.floor(mockOpportunities.length * 0.5),
            skipped: Math.floor(mockOpportunities.length * 0.1),
            errors: []
        };
    }

    // Mock API calls (replace with actual API calls in production)
    private async simulateAPICall(platform: string, method: string, endpoint: string, data?: any): Promise<any> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 500));

        const config = this.configs.get(platform);
        if (!config) {
            throw new Error('Platform not configured');
        }

        // Simulate authentication check
        if (!config.apiKey && !config.accessToken) {
            throw new Error('Authentication credentials missing');
        }

        // Simulate API response based on platform
        return this.generateMockAPIResponse(platform, method, endpoint, data);
    }

    private async fetchMockCRMData(platform: string, recordType: string): Promise<any[]> {
        // Generate mock CRM data for demonstration
        const recordCount = Math.floor(Math.random() * 20) + 5; // 5-24 records
        const records: any[] = [];

        for (let i = 0; i < recordCount; i++) {
            const record = this.generateMockRecord(platform, recordType, i);
            records.push(record);
        }

        return records;
    }

    private generateMockRecord(platform: string, recordType: string, index: number): any {
        const baseRecord = {
            id: `${platform}_${recordType}_${Date.now()}_${index}`,
            platform,
            lastModified: new Date().toISOString()
        };

        switch (recordType) {
            case 'leads':
                return {
                    ...baseRecord,
                    name: `Lead ${index + 1}`,
                    email: `lead${index + 1}@example.com`,
                    phone: `+1-555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
                    company: `Company ${index + 1}`,
                    source: ['Website', 'Referral', 'Cold Call', 'Social Media'][Math.floor(Math.random() * 4)],
                    status: ['New', 'Contacted', 'Qualified', 'Unqualified'][Math.floor(Math.random() * 4)],
                    value: Math.floor(Math.random() * 100000) + 10000,
                    notes: `Generated mock lead ${index + 1} for ${platform} integration testing`
                };
            case 'companies':
                return {
                    ...baseRecord,
                    name: `Company ${index + 1}`,
                    industry: ['Construction', 'Technology', 'Healthcare', 'Finance'][Math.floor(Math.random() * 4)],
                    size: ['Small', 'Medium', 'Large', 'Enterprise'][Math.floor(Math.random() * 4)],
                    revenue: Math.floor(Math.random() * 10000000) + 100000,
                    phone: `+1-555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
                    website: `https://company${index + 1}.example.com`,
                    address: `${index + 1}00 Main St, City, State 12345`
                };
            case 'opportunities':
                return {
                    ...baseRecord,
                    name: `Opportunity ${index + 1}`,
                    stage: ['Prospect', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'][Math.floor(Math.random() * 6)],
                    value: Math.floor(Math.random() * 500000) + 50000,
                    closeDate: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
                    probability: Math.floor(Math.random() * 100),
                    description: `Mock opportunity ${index + 1} for testing ${platform} integration`,
                    contactId: `contact_${index + 1}`,
                    accountId: `account_${index + 1}`
                };
            default:
                return baseRecord;
        }
    }

    private generateMockAPIResponse(platform: string, method: string, endpoint: string, data?: any): any {
        switch (endpoint) {
            case '/test':
                return { success: true, message: `Connected to ${platform} successfully` };
            case '/leads':
                return { data: this.generateMockRecord(platform, 'leads', 0), success: true };
            case '/companies':
                return { data: this.generateMockRecord(platform, 'companies', 0), success: true };
            case '/opportunities':    
                return { data: this.generateMockRecord(platform, 'opportunities', 0), success: true };
            default:
                return { success: true, data: null };
        }
    }

    private findExistingRecord(externalId: string, recordType: string): CRMRecord | null {
        return this.syncQueue.find(record => 
            record.externalId === externalId && 
            record.type === recordType as any
        ) || null;
    }

    private async createLocalLead(leadData: any, platform: string): Promise<void> {
        // In production, this would create a lead in the local system
        const crmRecord: CRMRecord = {
            id: `local_${Date.now()}`,
            type: 'lead',
            externalId: leadData.id,
            platform,
            data: leadData,
            lastSynced: new Date(),
            syncStatus: 'synced'
        };

        this.syncQueue.push(crmRecord);
    }

    private async updateLocalLead(existingRecord: CRMRecord, leadData: any): Promise<void> {
        // Update existing record
        existingRecord.data = { ...existingRecord.data, ...leadData };
        existingRecord.lastSynced = new Date();
        existingRecord.syncStatus = 'synced';
    }

    // Push data to CRM
    async pushTocrm(platform: string, recordType: string, localData: any): Promise<{ success: boolean; externalId?: string; error?: string }> {
        try {
            const config = this.configs.get(platform);
            if (!config || !config.enabled) {
                throw new Error(`Platform ${platform} is not enabled`);
            }

            // Simulate pushing data to CRM
            const response = await this.simulateAPICall(platform, 'POST', `/${recordType}s`, localData);
            
            const crmRecord: CRMRecord = {
                id: `sync_${Date.now()}`,
                type: recordType as any,
                externalId: response.data?.id || `external_${Date.now()}`,
                platform,
                data: localData,
                lastSynced: new Date(),
                syncStatus: 'synced',
                localId: localData.id
            };

            this.syncQueue.push(crmRecord);
            this.saveStoredData();

            return { success: true, externalId: crmRecord.externalId };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }

    // Webhook Management
    async createWebhook(platform: string, event: string, url: string): Promise<CRMWebhook> {
        const webhook: CRMWebhook = {
            id: `webhook_${Date.now()}`,
            platform,
            event,
            url,
            secret: this.generateWebhookSecret(),
            enabled: true,
            createdAt: new Date()
        };

        this.webhooks.push(webhook);
        this.saveStoredData();

        return webhook;
    }

    private generateWebhookSecret(): string {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    getWebhooks(platform?: string): CRMWebhook[] {
        return platform 
            ? this.webhooks.filter(w => w.platform === platform)
            : this.webhooks;
    }

    // Analytics and Reporting
    getSyncStats(platform?: string): {
        totalRecords: number;
        lastSyncTime: Date | null;
        pendingRecords: number;
        errorCount: number;
        syncHistory: any[];
    } {
        const relevantRecords = platform 
            ? this.syncQueue.filter(r => r.platform === platform)
            : this.syncQueue;

        const config = platform ? this.configs.get(platform) : null;

        return {
            totalRecords: relevantRecords.length,
            lastSyncTime: config?.lastSync || null,
            pendingRecords: relevantRecords.filter(r => r.syncStatus === 'pending').length,
            errorCount: relevantRecords.filter(r => r.syncStatus === 'error').length,
            syncHistory: [] // Would contain historical sync results
        };
    }

    // Utility Methods
    toggleAutoSync(enabled: boolean): void {
        this.isAutoSyncEnabled = enabled;
        if (enabled) {
            this.startAutoSync();
        }
    }

    async forceSyncAll(): Promise<Record<string, CRMSyncResult>> {
        const results: Record<string, CRMSyncResult> = {};
        
        for (const [platform] of this.configs) {
            try {
                results[platform] = await this.syncWithPlatform(platform);
            } catch (error) {
                results[platform] = {
                    success: false,
                    recordsProcessed: 0,
                    recordsCreated: 0,
                    recordsUpdated: 0,
                    recordsSkipped: 0,
                    errors: [{
                        recordId: 'force_sync',
                        recordType: 'sync',
                        error: error instanceof Error ? error.message : 'Unknown error'
                    }],
                    lastSyncTime: new Date(),
                    nextSyncTime: new Date()
                };
            }
        }
        
        return results;
    }

    // Cleanup
    destroy(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }
}

// Export singleton instance
export const crmIntegrationService = new CRMIntegrationService();