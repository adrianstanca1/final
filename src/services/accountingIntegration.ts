import { Invoice, Expense, Project, User, Client } from '../types';

// Accounting Platform Types
export interface AccountingConfig {
    platform: 'quickbooks' | 'xero' | 'sage' | 'wave';
    apiKey?: string;
    accessToken?: string;
    refreshToken?: string;
    companyId?: string;
    baseUrl?: string;
    clientId?: string;
    clientSecret?: string;
    enabled: boolean;
    syncFrequency: number; // minutes
    lastSync?: Date;
    syncSettings: AccountingSyncSettings;
}

export interface AccountingSyncSettings {
    autoCreateInvoices: boolean;
    autoSyncExpenses: boolean;
    syncProjects: boolean;
    syncClients: boolean;
    autoReconcile: boolean;
    defaultTaxRate: number;
    defaultExpenseAccount: string;
    defaultIncomeAccount: string;
    currencyCode: string;
    fiscalYearStart: string; // MM-DD format
}

export interface AccountingSyncResult {
    success: boolean;
    itemsProcessed: number;
    itemsCreated: number;
    itemsUpdated: number;
    itemsSkipped: number;
    errors: AccountingSyncError[];
    lastSyncTime: Date;
    nextSyncTime: Date;
    totalValue: number;
}

export interface AccountingSyncError {
    itemId: string;
    itemType: string;
    error: string;
    details?: any;
}

export interface AccountingRecord {
    id: string;
    type: 'invoice' | 'expense' | 'customer' | 'item' | 'payment';
    externalId: string;
    platform: string;
    data: Record<string, any>;
    lastSynced: Date;
    syncStatus: 'pending' | 'synced' | 'error';
    localId?: string;
    amount: number;
    currency: string;
}

export interface FinancialReport {
    id: string;
    name: string;
    type: 'profit_loss' | 'balance_sheet' | 'cash_flow' | 'trial_balance';
    dateRange: {
        start: Date;
        end: Date;
    };
    data: Record<string, any>;
    generatedAt: Date;
    platform: string;
}

export interface TaxCalculation {
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    taxBreakdown: Array<{
        name: string;
        rate: number;
        amount: number;
    }>;
}

export interface BankReconciliation {
    id: string;
    accountId: string;
    statementDate: Date;
    openingBalance: number;
    closingBalance: number;
    reconciledTransactions: number;
    unreconciledTransactions: number;
    discrepancy: number;
    status: 'pending' | 'reconciled' | 'discrepancy';
}

export class AccountingIntegrationService {
    private configs: Map<string, AccountingConfig> = new Map();
    private syncQueue: AccountingRecord[] = [];
    private reports: FinancialReport[] = [];
    private reconciliations: BankReconciliation[] = [];
    private isAutoSyncEnabled = true;
    private syncInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.initializeDefaultConfigs();
        this.loadStoredData();
        this.startAutoSync();
    }

    private initializeDefaultConfigs(): void {
        // QuickBooks configuration
        const quickbooksConfig: AccountingConfig = {
            platform: 'quickbooks',
            enabled: false,
            syncFrequency: 30, // 30 minutes
            syncSettings: {
                autoCreateInvoices: true,
                autoSyncExpenses: true,
                syncProjects: true,
                syncClients: true,
                autoReconcile: false,
                defaultTaxRate: 0.0875, // 8.75%
                defaultExpenseAccount: 'Job Expenses',
                defaultIncomeAccount: 'Construction Income',
                currencyCode: 'USD',
                fiscalYearStart: '01-01'
            }
        };

        // Xero configuration
        const xeroConfig: AccountingConfig = {
            platform: 'xero',
            enabled: false,
            syncFrequency: 20, // 20 minutes
            syncSettings: {
                autoCreateInvoices: true,
                autoSyncExpenses: true,
                syncProjects: true,
                syncClients: true,
                autoReconcile: false,
                defaultTaxRate: 0.10, // 10%
                defaultExpenseAccount: 'Project Costs',
                defaultIncomeAccount: 'Sales',
                currencyCode: 'USD',
                fiscalYearStart: '04-01' // April 1st fiscal year
            }
        };

        // Sage configuration
        const sageConfig: AccountingConfig = {
            platform: 'sage',
            enabled: false,
            syncFrequency: 45, // 45 minutes
            syncSettings: {
                autoCreateInvoices: true,
                autoSyncExpenses: true,
                syncProjects: false,
                syncClients: true,
                autoReconcile: false,
                defaultTaxRate: 0.0825, // 8.25%
                defaultExpenseAccount: 'Direct Costs',
                defaultIncomeAccount: 'Revenue',
                currencyCode: 'USD',
                fiscalYearStart: '01-01'
            }
        };

        this.configs.set('quickbooks', quickbooksConfig);
        this.configs.set('xero', xeroConfig);
        this.configs.set('sage', sageConfig);
    }

    private loadStoredData(): void {
        try {
            const storedConfigs = localStorage.getItem('accounting_configs');
            const storedQueue = localStorage.getItem('accounting_sync_queue');
            const storedReports = localStorage.getItem('accounting_reports');
            const storedReconciliations = localStorage.getItem('bank_reconciliations');

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

            if (storedReports) {
                this.reports = JSON.parse(storedReports).map((report: any) => ({
                    ...report,
                    dateRange: {
                        start: new Date(report.dateRange.start),
                        end: new Date(report.dateRange.end)
                    },
                    generatedAt: new Date(report.generatedAt)
                }));
            }

            if (storedReconciliations) {
                this.reconciliations = JSON.parse(storedReconciliations).map((rec: any) => ({
                    ...rec,
                    statementDate: new Date(rec.statementDate)
                }));
            }
        } catch (error) {
            console.error('Error loading accounting data:', error);
        }
    }

    private saveStoredData(): void {
        try {
            const configsObj = Object.fromEntries(this.configs);
            localStorage.setItem('accounting_configs', JSON.stringify(configsObj));
            localStorage.setItem('accounting_sync_queue', JSON.stringify(this.syncQueue));
            localStorage.setItem('accounting_reports', JSON.stringify(this.reports));
            localStorage.setItem('bank_reconciliations', JSON.stringify(this.reconciliations));
        } catch (error) {
            console.error('Error saving accounting data:', error);
        }
    }

    private startAutoSync(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        // Run sync every 10 minutes, checking each platform's sync frequency
        this.syncInterval = setInterval(() => {
            if (this.isAutoSyncEnabled) {
                this.performAutoSync();
            }
        }, 10 * 60 * 1000); // 10 minutes
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
    async updateAccountingConfig(platform: string, config: Partial<AccountingConfig>): Promise<void> {
        const existingConfig = this.configs.get(platform);
        if (!existingConfig) {
            throw new Error(`Accounting platform ${platform} not supported`);
        }

        const updatedConfig = { ...existingConfig, ...config };
        this.configs.set(platform, updatedConfig);
        this.saveStoredData();

        // Test connection if being enabled
        if (config.enabled && !existingConfig.enabled) {
            await this.testConnection(platform);
        }
    }

    getAccountingConfig(platform: string): AccountingConfig | null {
        return this.configs.get(platform) || null;
    }

    getAllAccountingConfigs(): Record<string, AccountingConfig> {
        return Object.fromEntries(this.configs);
    }

    // Connection Testing
    async testConnection(platform: string): Promise<{ success: boolean; message: string; companyInfo?: any }> {
        const config = this.configs.get(platform);
        if (!config) {
            return { success: false, message: 'Platform not configured' };
        }

        try {
            // Simulate API connection test
            const response = await this.simulateAPICall(platform, 'GET', '/companyinfo');
            
            return { 
                success: true, 
                message: 'Connection successful',
                companyInfo: response.data
            };
        } catch (error) {
            return { 
                success: false, 
                message: error instanceof Error ? error.message : 'Connection failed' 
            };
        }
    }

    // Data Synchronization
    async syncWithPlatform(platform: string): Promise<AccountingSyncResult> {
        const config = this.configs.get(platform);
        if (!config || !config.enabled) {
            throw new Error(`Platform ${platform} is not enabled`);
        }

        const startTime = new Date();
        let itemsProcessed = 0;
        let itemsCreated = 0;
        let itemsUpdated = 0;
        let itemsSkipped = 0;
        let totalValue = 0;
        const errors: AccountingSyncError[] = [];

        try {
            // Sync customers/clients
            if (config.syncSettings.syncClients) {
                const clientsResult = await this.syncCustomers(platform);
                itemsProcessed += clientsResult.processed;
                itemsCreated += clientsResult.created;
                itemsUpdated += clientsResult.updated;
                itemsSkipped += clientsResult.skipped;
                errors.push(...clientsResult.errors);
            }

            // Sync invoices
            if (config.syncSettings.autoCreateInvoices) {
                const invoicesResult = await this.syncInvoices(platform);
                itemsProcessed += invoicesResult.processed;
                itemsCreated += invoicesResult.created;
                itemsUpdated += invoicesResult.updated;
                itemsSkipped += invoicesResult.skipped;
                totalValue += invoicesResult.totalValue;
                errors.push(...invoicesResult.errors);
            }

            // Sync expenses
            if (config.syncSettings.autoSyncExpenses) {
                const expensesResult = await this.syncExpenses(platform);
                itemsProcessed += expensesResult.processed;
                itemsCreated += expensesResult.created;
                itemsUpdated += expensesResult.updated;
                itemsSkipped += expensesResult.skipped;
                totalValue += expensesResult.totalValue;
                errors.push(...expensesResult.errors);
            }

            // Sync projects (if supported)
            if (config.syncSettings.syncProjects && platform !== 'sage') {
                const projectsResult = await this.syncProjects(platform);
                itemsProcessed += projectsResult.processed;
                itemsCreated += projectsResult.created;
                itemsUpdated += projectsResult.updated;
                itemsSkipped += projectsResult.skipped;
                errors.push(...projectsResult.errors);
            }

            // Update last sync time
            config.lastSync = startTime;
            this.configs.set(platform, config);
            this.saveStoredData();

            return {
                success: errors.length === 0,
                itemsProcessed,
                itemsCreated,
                itemsUpdated,
                itemsSkipped,
                errors,
                lastSyncTime: startTime,
                nextSyncTime: new Date(startTime.getTime() + config.syncFrequency * 60 * 1000),
                totalValue
            };
        } catch (error) {
            errors.push({
                itemId: 'sync_error',
                itemType: 'sync',
                error: error instanceof Error ? error.message : 'Unknown sync error'
            });

            return {
                success: false,
                itemsProcessed,
                itemsCreated,
                itemsUpdated,
                itemsSkipped,
                errors,
                lastSyncTime: startTime,
                nextSyncTime: new Date(startTime.getTime() + config.syncFrequency * 60 * 1000),
                totalValue
            };
        }
    }

    private async syncCustomers(platform: string): Promise<{
        processed: number;
        created: number;
        updated: number;
        skipped: number;
        errors: AccountingSyncError[];
    }> {
        const mockCustomers = await this.fetchMockAccountingData(platform, 'customers');
        let processed = 0;
        let created = 0;
        let updated = 0;
        let skipped = 0;
        const errors: AccountingSyncError[] = [];

        for (const customerData of mockCustomers) {
            try {
                processed++;
                const existingCustomer = this.findExistingRecord(customerData.id, 'customer');
                
                if (existingCustomer) {
                    await this.updateLocalCustomer(existingCustomer, customerData);
                    updated++;
                } else {
                    await this.createLocalCustomer(customerData, platform);
                    created++;
                }
            } catch (error) {
                errors.push({
                    itemId: customerData.id,
                    itemType: 'customer',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                skipped++;
            }
        }

        return { processed, created, updated, skipped, errors };
    }

    private async syncInvoices(platform: string): Promise<{
        processed: number;
        created: number;
        updated: number;
        skipped: number;
        totalValue: number;
        errors: AccountingSyncError[];
    }> {
        const mockInvoices = await this.fetchMockAccountingData(platform, 'invoices');
        let processed = 0;
        let created = 0;
        let updated = 0;
        let skipped = 0;
        let totalValue = 0;
        const errors: AccountingSyncError[] = [];

        for (const invoiceData of mockInvoices) {
            try {
                processed++;
                totalValue += invoiceData.amount || 0;
                
                const existingInvoice = this.findExistingRecord(invoiceData.id, 'invoice');
                
                if (existingInvoice) {
                    await this.updateLocalInvoice(existingInvoice, invoiceData);
                    updated++;
                } else {
                    await this.createLocalInvoice(invoiceData, platform);
                    created++;
                }
            } catch (error) {
                errors.push({
                    itemId: invoiceData.id,
                    itemType: 'invoice',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                skipped++;
            }
        }

        return { processed, created, updated, skipped, totalValue, errors };
    }

    private async syncExpenses(platform: string): Promise<{
        processed: number;
        created: number;
        updated: number;
        skipped: number;
        totalValue: number;
        errors: AccountingSyncError[];
    }> {
        const mockExpenses = await this.fetchMockAccountingData(platform, 'expenses');
        let processed = 0;
        let created = 0;
        let updated = 0;
        let skipped = 0;
        let totalValue = 0;
        const errors: AccountingSyncError[] = [];

        for (const expenseData of mockExpenses) {
            try {
                processed++;
                totalValue += expenseData.amount || 0;
                
                const existingExpense = this.findExistingRecord(expenseData.id, 'expense');
                
                if (existingExpense) {
                    await this.updateLocalExpense(existingExpense, expenseData);
                    updated++;
                } else {
                    await this.createLocalExpense(expenseData, platform);
                    created++;
                }
            } catch (error) {
                errors.push({
                    itemId: expenseData.id,
                    itemType: 'expense',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                skipped++;
            }
        }

        return { processed, created, updated, skipped, totalValue, errors };
    }

    private async syncProjects(platform: string): Promise<{
        processed: number;
        created: number;
        updated: number;
        skipped: number;
        errors: AccountingSyncError[];
    }> {
        // QuickBooks and Xero support project tracking
        const mockProjects = await this.fetchMockAccountingData(platform, 'projects');
        return {
            processed: mockProjects.length,
            created: Math.floor(mockProjects.length * 0.2),
            updated: Math.floor(mockProjects.length * 0.7),
            skipped: Math.floor(mockProjects.length * 0.1),
            errors: []
        };
    }

    // Mock API calls and data generation
    private async simulateAPICall(platform: string, method: string, endpoint: string, data?: any): Promise<any> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 700));

        const config = this.configs.get(platform);
        if (!config) {
            throw new Error('Platform not configured');
        }

        // Simulate authentication check
        if (!config.apiKey && !config.accessToken) {
            throw new Error('Authentication credentials missing');
        }

        return this.generateMockAPIResponse(platform, method, endpoint, data);
    }

    private async fetchMockAccountingData(platform: string, dataType: string): Promise<any[]> {
        const recordCount = Math.floor(Math.random() * 15) + 5; // 5-19 records
        const records: any[] = [];

        for (let i = 0; i < recordCount; i++) {
            const record = this.generateMockAccountingRecord(platform, dataType, i);
            records.push(record);
        }

        return records;
    }

    private generateMockAccountingRecord(platform: string, recordType: string, index: number): any {
        const baseRecord = {
            id: `${platform}_${recordType}_${Date.now()}_${index}`,
            platform,
            lastModified: new Date().toISOString()
        };

        switch (recordType) {
            case 'customers':
                return {
                    ...baseRecord,
                    name: `Client Company ${index + 1}`,
                    email: `client${index + 1}@construction.com`,
                    phone: `+1-555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
                    address: {
                        street: `${index + 1}00 Business Ave`,
                        city: 'Construction City',
                        state: 'CA',
                        zip: `9${String(index).padStart(4, '0')}`
                    },
                    taxExempt: Math.random() > 0.8,
                    creditLimit: Math.floor(Math.random() * 100000) + 50000,
                    paymentTerms: ['Net 30', 'Net 15', 'Due on Receipt'][Math.floor(Math.random() * 3)]
                };
            case 'invoices':
                return {
                    ...baseRecord,
                    invoiceNumber: `INV-${String(Date.now()).slice(-6)}-${index}`,
                    customerId: `customer_${index + 1}`,
                    amount: Math.floor(Math.random() * 50000) + 5000,
                    subtotal: 0, // calculated
                    taxAmount: 0, // calculated
                    status: ['Draft', 'Sent', 'Paid', 'Overdue'][Math.floor(Math.random() * 4)],
                    dueDate: new Date(Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
                    issueDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                    description: `Construction work for project ${index + 1}`,
                    lineItems: [
                        {
                            description: 'Labor',
                            quantity: Math.floor(Math.random() * 100) + 20,
                            rate: Math.floor(Math.random() * 100) + 50,
                            amount: 0 // calculated
                        },
                        {
                            description: 'Materials',
                            quantity: 1,
                            rate: Math.floor(Math.random() * 10000) + 2000,
                            amount: 0 // calculated
                        }
                    ]
                };
            case 'expenses':
                return {
                    ...baseRecord,
                    vendorName: `Vendor ${index + 1}`,
                    amount: Math.floor(Math.random() * 5000) + 100,
                    category: ['Materials', 'Equipment', 'Subcontractor', 'Fuel', 'Office'][Math.floor(Math.random() * 5)],
                    account: ['Job Expenses', 'Equipment', 'Materials', 'Fuel', 'Administrative'][Math.floor(Math.random() * 5)],
                    date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
                    description: `${['Materials purchase', 'Equipment rental', 'Subcontractor payment', 'Fuel costs', 'Office supplies'][Math.floor(Math.random() * 5)]} for project`,
                    receiptUrl: `https://receipts.example.com/${baseRecord.id}.pdf`,
                    projectId: `project_${index + 1}`,
                    taxAmount: 0,
                    billable: Math.random() > 0.3
                };
            case 'projects':
                return {
                    ...baseRecord,
                    name: `Construction Project ${index + 1}`,
                    customerId: `customer_${index + 1}`,
                    status: ['Active', 'Completed', 'On Hold'][Math.floor(Math.random() * 3)],
                    startDate: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
                    endDate: new Date(Date.now() + Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
                    budgetAmount: Math.floor(Math.random() * 500000) + 100000,
                    actualCosts: Math.floor(Math.random() * 400000) + 50000,
                    description: `Commercial construction project ${index + 1}`
                };
            default:
                return baseRecord;
        }
    }

    private generateMockAPIResponse(platform: string, method: string, endpoint: string, data?: any): any {
        switch (endpoint) {
            case '/companyinfo':
                return {
                    success: true,
                    data: {
                        companyName: `Demo Company (${platform})`,
                        baseCurrency: 'USD',
                        fiscalYearStart: '01-01',
                        country: 'US',
                        industry: 'Construction'
                    }
                };
            default:
                return { success: true, data: data || null };
        }
    }

    // Local record management
    private findExistingRecord(externalId: string, recordType: string): AccountingRecord | null {
        return this.syncQueue.find(record => 
            record.externalId === externalId && 
            record.type === recordType as any
        ) || null;
    }

    private async createLocalCustomer(customerData: any, platform: string): Promise<void> {
        const record: AccountingRecord = {
            id: `local_customer_${Date.now()}`,
            type: 'customer',
            externalId: customerData.id,
            platform,
            data: customerData,
            lastSynced: new Date(),
            syncStatus: 'synced',
            amount: 0,
            currency: 'USD'
        };
        this.syncQueue.push(record);
    }

    private async updateLocalCustomer(existingRecord: AccountingRecord, customerData: any): Promise<void> {
        existingRecord.data = { ...existingRecord.data, ...customerData };
        existingRecord.lastSynced = new Date();
        existingRecord.syncStatus = 'synced';
    }

    private async createLocalInvoice(invoiceData: any, platform: string): Promise<void> {
        const record: AccountingRecord = {
            id: `local_invoice_${Date.now()}`,
            type: 'invoice',
            externalId: invoiceData.id,
            platform,
            data: invoiceData,
            lastSynced: new Date(),
            syncStatus: 'synced',
            amount: invoiceData.amount || 0,
            currency: 'USD'
        };
        this.syncQueue.push(record);
    }

    private async updateLocalInvoice(existingRecord: AccountingRecord, invoiceData: any): Promise<void> {
        existingRecord.data = { ...existingRecord.data, ...invoiceData };
        existingRecord.amount = invoiceData.amount || existingRecord.amount;
        existingRecord.lastSynced = new Date();
        existingRecord.syncStatus = 'synced';
    }

    private async createLocalExpense(expenseData: any, platform: string): Promise<void> {
        const record: AccountingRecord = {
            id: `local_expense_${Date.now()}`,
            type: 'expense',
            externalId: expenseData.id,
            platform,
            data: expenseData,
            lastSynced: new Date(),
            syncStatus: 'synced',
            amount: expenseData.amount || 0,
            currency: 'USD'
        };
        this.syncQueue.push(record);
    }

    private async updateLocalExpense(existingRecord: AccountingRecord, expenseData: any): Promise<void> {
        existingRecord.data = { ...existingRecord.data, ...expenseData };
        existingRecord.amount = expenseData.amount || existingRecord.amount;
        existingRecord.lastSynced = new Date();
        existingRecord.syncStatus = 'synced';
    }

    // Push data to accounting platforms
    async pushInvoiceToAccounting(platform: string, invoiceData: Invoice): Promise<{ success: boolean; externalId?: string; error?: string }> {
        try {
            const config = this.configs.get(platform);
            if (!config || !config.enabled) {
                throw new Error(`Platform ${platform} is not enabled`);
            }

            // Calculate tax
            const taxCalc = this.calculateTax(invoiceData.total, config.syncSettings.defaultTaxRate);
            
            const accountingInvoice = this.transformInvoiceForPlatform(invoiceData, taxCalc, platform);
            const response = await this.simulateAPICall(platform, 'POST', '/invoices', accountingInvoice);
            
            const record: AccountingRecord = {
                id: `sync_invoice_${Date.now()}`,
                type: 'invoice',
                externalId: response.data?.id || `external_inv_${Date.now()}`,
                platform,
                data: accountingInvoice,
                lastSynced: new Date(),
                syncStatus: 'synced',
                localId: invoiceData.id,
                amount: invoiceData.total,
                currency: 'USD'
            };

            this.syncQueue.push(record);
            this.saveStoredData();

            return { success: true, externalId: record.externalId };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }

    async pushExpenseToAccounting(platform: string, expenseData: Expense): Promise<{ success: boolean; externalId?: string; error?: string }> {
        try {
            const config = this.configs.get(platform);
            if (!config || !config.enabled) {
                throw new Error(`Platform ${platform} is not enabled`);
            }

            const accountingExpense = this.transformExpenseForPlatform(expenseData, platform);
            const response = await this.simulateAPICall(platform, 'POST', '/expenses', accountingExpense);
            
            const record: AccountingRecord = {
                id: `sync_expense_${Date.now()}`,
                type: 'expense',
                externalId: response.data?.id || `external_exp_${Date.now()}`,
                platform,
                data: accountingExpense,
                lastSynced: new Date(),
                syncStatus: 'synced',
                localId: expenseData.id,
                amount: expenseData.amount,
                currency: 'USD'
            };

            this.syncQueue.push(record);
            this.saveStoredData();

            return { success: true, externalId: record.externalId };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }

    // Tax calculations
    calculateTax(amount: number, taxRate: number): TaxCalculation {
        const subtotal = amount;
        const taxAmount = subtotal * taxRate;
        const total = subtotal + taxAmount;

        return {
            subtotal,
            taxRate,
            taxAmount,
            total,
            taxBreakdown: [
                {
                    name: 'Sales Tax',
                    rate: taxRate,
                    amount: taxAmount
                }
            ]
        };
    }

    // Data transformation for different platforms
    private transformInvoiceForPlatform(invoice: Invoice, tax: TaxCalculation, platform: string): any {
        const base = {
            amount: invoice.total,
            subtotal: tax.subtotal,
            taxAmount: tax.taxAmount,
            customerRef: invoice.clientId,
            dueDate: invoice.dueDate,
            description: `Construction invoice for project work`
        };

        switch (platform) {
            case 'quickbooks':
                return {
                    ...base,
                    CustomerRef: { value: invoice.clientId },
                    DueDate: invoice.dueDate,
                    TotalAmt: invoice.total,
                    Line: invoice.items.map(item => ({
                        Amount: item.amount,
                        DetailType: 'SalesItemLineDetail',
                        SalesItemLineDetail: {
                            ItemRef: { value: '1', name: item.description },
                            Qty: item.quantity,
                            UnitPrice: item.rate
                        }
                    }))
                };
            case 'xero':
                return {
                    ...base,
                    Contact: { ContactID: invoice.clientId },
                    Date: new Date().toISOString().split('T')[0],
                    DueDate: invoice.dueDate,
                    LineItems: invoice.items.map(item => ({
                        Description: item.description,
                        Quantity: item.quantity,
                        UnitAmount: item.rate,
                        AccountCode: '200' // Sales account
                    }))
                };
            default:
                return base;
        }
    }

    private transformExpenseForPlatform(expense: Expense, platform: string): any {
        const base = {
            amount: expense.amount,
            vendor: expense.vendor || 'Unknown Vendor',
            date: expense.date,
            description: expense.description || 'Project expense'
        };

        switch (platform) {
            case 'quickbooks':
                return {
                    ...base,
                    VendorRef: { value: '1', name: expense.vendor },
                    TotalAmt: expense.amount,
                    Line: [{
                        Amount: expense.amount,
                        DetailType: 'AccountBasedExpenseLineDetail',
                        AccountBasedExpenseLineDetail: {
                            AccountRef: { value: '60', name: 'Job Expenses' }
                        }
                    }]
                };
            case 'xero':
                return {
                    ...base,
                    Contact: { Name: expense.vendor },
                    Date: expense.date,
                    LineItems: [{
                        Description: expense.description,
                        UnitAmount: expense.amount,
                        AccountCode: '400' // Expense account
                    }]
                };
            default:
                return base;
        }
    }

    // Financial Reports
    async generateFinancialReport(
        platform: string,
        reportType: 'profit_loss' | 'balance_sheet' | 'cash_flow' | 'trial_balance',
        startDate: Date,
        endDate: Date
    ): Promise<FinancialReport> {
        const config = this.configs.get(platform);
        if (!config || !config.enabled) {
            throw new Error(`Platform ${platform} is not enabled`);
        }

        // Simulate report generation
        const reportData = await this.generateMockReportData(reportType, startDate, endDate);
        
        const report: FinancialReport = {
            id: `report_${Date.now()}`,
            name: `${reportType.replace('_', ' ').toUpperCase()} Report`,
            type: reportType,
            dateRange: { start: startDate, end: endDate },
            data: reportData,
            generatedAt: new Date(),
            platform
        };

        this.reports.push(report);
        this.saveStoredData();

        return report;
    }

    private async generateMockReportData(reportType: string, startDate: Date, endDate: Date): Promise<any> {
        // Generate mock financial data
        const revenue = Math.floor(Math.random() * 500000) + 100000;
        const expenses = Math.floor(Math.random() * 300000) + 50000;
        const netIncome = revenue - expenses;

        switch (reportType) {
            case 'profit_loss':
                return {
                    revenue: {
                        constructionIncome: revenue * 0.9,
                        otherIncome: revenue * 0.1,
                        total: revenue
                    },
                    expenses: {
                        materials: expenses * 0.4,
                        labor: expenses * 0.35,
                        equipment: expenses * 0.15,
                        overhead: expenses * 0.1,
                        total: expenses
                    },
                    netIncome,
                    margin: (netIncome / revenue) * 100
                };
            case 'balance_sheet':
                return {
                    assets: {
                        current: {
                            cash: Math.floor(Math.random() * 100000) + 20000,
                            accountsReceivable: Math.floor(Math.random() * 150000) + 30000,
                            inventory: Math.floor(Math.random() * 50000) + 10000
                        },
                        fixed: {
                            equipment: Math.floor(Math.random() * 300000) + 100000,
                            buildings: Math.floor(Math.random() * 500000) + 200000
                        }
                    },
                    liabilities: {
                        current: {
                            accountsPayable: Math.floor(Math.random() * 100000) + 20000,
                            shortTermDebt: Math.floor(Math.random() * 50000) + 10000
                        },
                        longTerm: {
                            longTermDebt: Math.floor(Math.random() * 200000) + 50000
                        }
                    }
                };
            default:
                return { startDate, endDate, generated: new Date() };
        }
    }

    // Analytics and Utilities
    getSyncStats(platform?: string): {
        totalRecords: number;
        totalValue: number;
        lastSyncTime: Date | null;
        pendingRecords: number;
        errorCount: number;
        byType: Record<string, number>;
    } {
        const relevantRecords = platform 
            ? this.syncQueue.filter(r => r.platform === platform)
            : this.syncQueue;

        const config = platform ? this.configs.get(platform) : null;
        const totalValue = relevantRecords.reduce((sum, record) => sum + record.amount, 0);
        
        const byType = relevantRecords.reduce((acc, record) => {
            acc[record.type] = (acc[record.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            totalRecords: relevantRecords.length,
            totalValue,
            lastSyncTime: config?.lastSync || null,
            pendingRecords: relevantRecords.filter(r => r.syncStatus === 'pending').length,
            errorCount: relevantRecords.filter(r => r.syncStatus === 'error').length,
            byType
        };
    }

    async reconcileAccount(accountId: string, statementDate: Date, transactions: any[]): Promise<BankReconciliation> {
        // Simulate bank reconciliation
        const reconciliation: BankReconciliation = {
            id: `reconcile_${Date.now()}`,
            accountId,
            statementDate,
            openingBalance: Math.floor(Math.random() * 50000) + 10000,
            closingBalance: Math.floor(Math.random() * 60000) + 15000,
            reconciledTransactions: Math.floor(Math.random() * 50) + 20,
            unreconciledTransactions: Math.floor(Math.random() * 5),
            discrepancy: Math.floor(Math.random() * 1000) - 500,
            status: 'reconciled'
        };

        this.reconciliations.push(reconciliation);
        this.saveStoredData();

        return reconciliation;
    }

    toggleAutoSync(enabled: boolean): void {
        this.isAutoSyncEnabled = enabled;
        if (enabled) {
            this.startAutoSync();
        }
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
export const accountingIntegrationService = new AccountingIntegrationService();