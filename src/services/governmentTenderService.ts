import { GoogleGenerativeAI } from '@google/generative-ai';

// Government Tender Platform Types
export interface GovernmentTenderConfig {
    platform: 'sam_gov' | 'fedbizopps' | 'state_procurement' | 'local_gov' | 'international';
    name: string;
    baseUrl: string;
    apiKey?: string;
    username?: string;
    password?: string;
    certificationPath?: string;
    enabled: boolean;
    syncFrequency: number; // minutes
    lastSync?: Date;
    searchSettings: TenderSearchSettings;
    notificationSettings: TenderNotificationSettings;
}

export interface TenderSearchSettings {
    keywords: string[];
    naicsCodes: string[]; // North American Industry Classification System
    setPasides: string[]; // Set-aside categories (e.g., small business, veteran-owned)
    agencies: string[];
    minValue: number;
    maxValue: number;
    locations: string[];
    responseDeadlineDays: number; // Only include tenders with response time >= this
    excludeKeywords: string[];
    includeAmendments: boolean;
    includeArchived: boolean;
}

export interface TenderNotificationSettings {
    emailNotifications: boolean;
    smsNotifications: boolean;
    webhookUrl?: string;
    notificationThreshold: number; // Minimum relevance score to trigger notification
    dailyDigest: boolean;
    instantAlerts: boolean;
    recipientEmails: string[];
    recipientPhones: string[];
}

export interface GovernmentTender {
    id: string;
    platform: string;
    title: string;
    description: string;
    agency: string;
    department?: string;
    solicitationNumber: string;
    naicsCode: string;
    setValue?: number;
    estimatedValue?: number;
    responseDeadline: Date;
    publishDate: Date;
    lastModified: Date;
    status: 'active' | 'cancelled' | 'awarded' | 'closed' | 'amended';
    type: 'solicitation' | 'award' | 'amendment' | 'source_sought';
    setAsides: string[];
    location: {
        state?: string;
        city?: string;
        zip?: string;
        country?: string;
    };
    contactInfo: {
        name?: string;
        email?: string;
        phone?: string;
    };
    documents: TenderDocument[];
    amendments: TenderAmendment[];
    requirements: string[];
    keywords: string[];
    relevanceScore: number; // AI-calculated relevance (0-100)
    aiAnalysis: TenderAIAnalysis;
    bidSubmitted: boolean;
    watchlisted: boolean;
    notes: string;
    customTags: string[];
}

export interface TenderDocument {
    id: string;
    name: string;
    type: 'solicitation' | 'amendment' | 'attachment' | 'award' | 'spec';
    url: string;
    downloadUrl?: string;
    size: number; // bytes
    uploadDate: Date;
    description?: string;
}

export interface TenderAmendment {
    id: string;
    amendmentNumber: string;
    publishDate: Date;
    title: string;
    description: string;
    changes: string[];
    newDeadline?: Date;
    documents: TenderDocument[];
}

export interface TenderAIAnalysis {
    relevanceScore: number;
    competitiveAdvantage: string[];
    risks: string[];
    requirements: {
        technical: string[];
        financial: string[];
        administrative: string[];
    };
    recommendedAction: 'bid' | 'watch' | 'skip';
    confidence: number; // 0-100
    keyInsights: string[];
    estimatedBidCost: number;
    winProbability: number; // 0-100
    competitorAnalysis: string;
}

export interface TenderAlert {
    id: string;
    tenderId: string;
    type: 'new_tender' | 'amendment' | 'deadline_reminder' | 'status_change';
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    createdAt: Date;
    readAt?: Date;
    actionRequired: boolean;
    metadata: Record<string, any>;
}

export interface TenderSyncResult {
    success: boolean;
    platform: string;
    tendersProcessed: number;
    newTenders: number;
    updatedTenders: number;
    amendmentsFound: number;
    alertsGenerated: number;
    errors: TenderSyncError[];
    lastSyncTime: Date;
    nextSyncTime: Date;
    dataVolume: number; // bytes processed
}

export interface TenderSyncError {
    tenderId?: string;
    platform: string;
    error: string;
    details?: any;
    retry: boolean;
}

export interface TenderStatistics {
    totalTenders: number;
    activeTenders: number;
    watchlistedTenders: number;
    submittedBids: number;
    totalValue: number;
    averageRelevanceScore: number;
    topAgencies: Array<{ name: string; count: number; value: number }>;
    topNaicsCodes: Array<{ code: string; description: string; count: number }>;
    monthlyTrends: Array<{ month: string; count: number; value: number }>;
    responseRates: {
        submitted: number;
        won: number;
        lost: number;
        pending: number;
    };
}

export class GovernmentTenderService {
    private configs: Map<string, GovernmentTenderConfig> = new Map();
    private tenders: Map<string, GovernmentTender> = new Map();
    private alerts: TenderAlert[] = [];
    private watchlist: Set<string> = new Set();
    private submittedBids: Set<string> = new Set();
    private isAutoSyncEnabled = true;
    private syncInterval: NodeJS.Timeout | null = null;
    private genAI: GoogleGenerativeAI | null = null;

    constructor() {
        this.initializeDefaultConfigs();
        this.loadStoredData();
        this.initializeAI();
        this.startAutoSync();
    }

    private initializeAI(): void {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
        } else {
            console.warn('Gemini API key not found - AI analysis will be limited');
        }
    }

    private initializeDefaultConfigs(): void {
        // SAM.gov (System for Award Management) - Primary US Government contracting database
        const samGovConfig: GovernmentTenderConfig = {
            platform: 'sam_gov',
            name: 'SAM.gov',
            baseUrl: 'https://api.sam.gov',
            enabled: false,
            syncFrequency: 60, // 1 hour
            searchSettings: {
                keywords: ['construction', 'building', 'renovation', 'infrastructure', 'facility'],
                naicsCodes: ['236220', '237310', '237990', '238110', '238210'], // Construction codes
                setPasides: ['SBA', 'WOSB', 'VOSB', '8A'], // Set-aside categories
                agencies: ['DOD', 'GSA', 'VA', 'USACE', 'DOT'],
                minValue: 25000,
                maxValue: 10000000,
                locations: ['US'],
                responseDeadlineDays: 7,
                excludeKeywords: ['software', 'IT services', 'consulting only'],
                includeAmendments: true,
                includeArchived: false
            },
            notificationSettings: {
                emailNotifications: true,
                smsNotifications: false,
                notificationThreshold: 70,
                dailyDigest: true,
                instantAlerts: true,
                recipientEmails: [],
                recipientPhones: []
            }
        };

        // State/Local Government Procurement (Generic)
        const stateLocalConfig: GovernmentTenderConfig = {
            platform: 'state_procurement',
            name: 'State & Local Procurement',
            baseUrl: 'https://various-state-portals.gov',
            enabled: false,
            syncFrequency: 120, // 2 hours
            searchSettings: {
                keywords: ['construction', 'public works', 'infrastructure', 'municipal'],
                naicsCodes: ['236220', '237310', '237990'],
                setPasides: ['local_business', 'minority_owned', 'disadvantaged'],
                agencies: ['DOT', 'Public Works', 'Parks', 'Education'],
                minValue: 10000,
                maxValue: 5000000,
                locations: ['CA', 'TX', 'NY', 'FL'],
                responseDeadlineDays: 5,
                excludeKeywords: ['design only', 'planning only'],
                includeAmendments: true,
                includeArchived: false
            },
            notificationSettings: {
                emailNotifications: true,
                smsNotifications: false,
                notificationThreshold: 65,
                dailyDigest: true,
                instantAlerts: false,
                recipientEmails: [],
                recipientPhones: []
            }
        };

        // International tender databases (World Bank, UN, etc.)
        const internationalConfig: GovernmentTenderConfig = {
            platform: 'international',
            name: 'International Development Banks',
            baseUrl: 'https://various-international-portals.org',
            enabled: false,
            syncFrequency: 180, // 3 hours
            searchSettings: {
                keywords: ['infrastructure', 'construction', 'development', 'facility'],
                naicsCodes: ['236220', '237310'],
                setPasides: [],
                agencies: ['World Bank', 'ADB', 'IDB', 'AfDB', 'UN'],
                minValue: 100000,
                maxValue: 50000000,
                locations: ['Global'],
                responseDeadlineDays: 14,
                excludeKeywords: ['consulting only', 'technical assistance only'],
                includeAmendments: true,
                includeArchived: false
            },
            notificationSettings: {
                emailNotifications: true,
                smsNotifications: false,
                notificationThreshold: 75,
                dailyDigest: false,
                instantAlerts: true,
                recipientEmails: [],
                recipientPhones: []
            }
        };

        this.configs.set('sam_gov', samGovConfig);
        this.configs.set('state_procurement', stateLocalConfig);
        this.configs.set('international', internationalConfig);
    }

    private loadStoredData(): void {
        try {
            const storedConfigs = localStorage.getItem('gov_tender_configs');
            const storedTenders = localStorage.getItem('gov_tenders');
            const storedAlerts = localStorage.getItem('tender_alerts');
            const storedWatchlist = localStorage.getItem('tender_watchlist');
            const storedBids = localStorage.getItem('submitted_bids');

            if (storedConfigs) {
                const parsed = JSON.parse(storedConfigs);
                Object.entries(parsed).forEach(([key, config]: [string, any]) => {
                    this.configs.set(key, {
                        ...config,
                        lastSync: config.lastSync ? new Date(config.lastSync) : undefined
                    });
                });
            }

            if (storedTenders) {
                const tendersArray = JSON.parse(storedTenders);
                tendersArray.forEach((tender: any) => {
                    this.tenders.set(tender.id, {
                        ...tender,
                        responseDeadline: new Date(tender.responseDeadline),
                        publishDate: new Date(tender.publishDate),
                        lastModified: new Date(tender.lastModified),
                        documents: tender.documents.map((doc: any) => ({
                            ...doc,
                            uploadDate: new Date(doc.uploadDate)
                        })),
                        amendments: tender.amendments.map((amend: any) => ({
                            ...amend,
                            publishDate: new Date(amend.publishDate),
                            newDeadline: amend.newDeadline ? new Date(amend.newDeadline) : undefined,
                            documents: amend.documents.map((doc: any) => ({
                                ...doc,
                                uploadDate: new Date(doc.uploadDate)
                            }))
                        }))
                    });
                });
            }

            if (storedAlerts) {
                this.alerts = JSON.parse(storedAlerts).map((alert: any) => ({
                    ...alert,
                    createdAt: new Date(alert.createdAt),
                    readAt: alert.readAt ? new Date(alert.readAt) : undefined
                }));
            }

            if (storedWatchlist) {
                this.watchlist = new Set(JSON.parse(storedWatchlist));
            }

            if (storedBids) {
                this.submittedBids = new Set(JSON.parse(storedBids));
            }
        } catch (error) {
            console.error('Error loading government tender data:', error);
        }
    }

    private saveStoredData(): void {
        try {
            const configsObj = Object.fromEntries(this.configs);
            const tendersArray = Array.from(this.tenders.values());
            
            localStorage.setItem('gov_tender_configs', JSON.stringify(configsObj));
            localStorage.setItem('gov_tenders', JSON.stringify(tendersArray));
            localStorage.setItem('tender_alerts', JSON.stringify(this.alerts));
            localStorage.setItem('tender_watchlist', JSON.stringify(Array.from(this.watchlist)));
            localStorage.setItem('submitted_bids', JSON.stringify(Array.from(this.submittedBids)));
        } catch (error) {
            console.error('Error saving government tender data:', error);
        }
    }

    private startAutoSync(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        // Run sync every 15 minutes, checking each platform's sync frequency
        this.syncInterval = setInterval(() => {
            if (this.isAutoSyncEnabled) {
                this.performAutoSync();
            }
        }, 15 * 60 * 1000); // 15 minutes
    }

    private async performAutoSync(): Promise<void> {
        const now = new Date();
        
        for (const [platform, config] of this.configs) {
            if (!config.enabled) continue;
            
            const shouldSync = !config.lastSync || 
                (now.getTime() - config.lastSync.getTime()) >= (config.syncFrequency * 60 * 1000);
            
            if (shouldSync) {
                try {
                    await this.syncTendersFromPlatform(platform);
                } catch (error) {
                    console.error(`Auto-sync failed for ${platform}:`, error);
                }
            }
        }
    }

    // Configuration Management
    async updateTenderConfig(platform: string, config: Partial<GovernmentTenderConfig>): Promise<void> {
        const existingConfig = this.configs.get(platform);
        if (!existingConfig) {
            throw new Error(`Government tender platform ${platform} not supported`);
        }

        const updatedConfig = { ...existingConfig, ...config };
        this.configs.set(platform, updatedConfig);
        this.saveStoredData();

        // Test connection if being enabled
        if (config.enabled && !existingConfig.enabled) {
            await this.testConnection(platform);
        }
    }

    getTenderConfig(platform: string): GovernmentTenderConfig | null {
        return this.configs.get(platform) || null;
    }

    getAllTenderConfigs(): Record<string, GovernmentTenderConfig> {
        return Object.fromEntries(this.configs);
    }

    // Connection Testing
    async testConnection(platform: string): Promise<{ success: boolean; message: string; availableData?: any }> {
        const config = this.configs.get(platform);
        if (!config) {
            return { success: false, message: 'Platform not configured' };
        }

        try {
            // Simulate API connection test
            const response = await this.simulateAPICall(platform, 'GET', '/api/status');
            
            return { 
                success: true, 
                message: 'Connection successful',
                availableData: response.data
            };
        } catch (error) {
            return { 
                success: false, 
                message: error instanceof Error ? error.message : 'Connection failed' 
            };
        }
    }

    // Tender Synchronization
    async syncTendersFromPlatform(platform: string): Promise<TenderSyncResult> {
        const config = this.configs.get(platform);
        if (!config || !config.enabled) {
            throw new Error(`Platform ${platform} is not enabled`);
        }

        const startTime = new Date();
        let tendersProcessed = 0;
        let newTenders = 0;
        let updatedTenders = 0;
        let amendmentsFound = 0;
        let alertsGenerated = 0;
        let dataVolume = 0;
        const errors: TenderSyncError[] = [];

        try {
            // Fetch tenders from platform
            const tenderData = await this.fetchTendersFromAPI(platform, config.searchSettings);
            dataVolume += JSON.stringify(tenderData).length;

            for (const tenderInfo of tenderData) {
                try {
                    tendersProcessed++;
                    
                    const existingTender = this.tenders.get(tenderInfo.id);
                    
                    if (existingTender) {
                        // Check for updates and amendments
                        if (new Date(tenderInfo.lastModified) > existingTender.lastModified) {
                            const updatedTender = await this.processTenderUpdate(existingTender, tenderInfo);
                            this.tenders.set(tenderInfo.id, updatedTender);
                            updatedTenders++;
                            
                            // Check for amendments
                            if (tenderInfo.amendments && tenderInfo.amendments.length > existingTender.amendments.length) {
                                amendmentsFound++;
                                const alert = await this.createAmendmentAlert(updatedTender);
                                this.alerts.push(alert);
                                alertsGenerated++;
                            }
                        }
                    } else {
                        // New tender
                        const newTender = await this.processNewTender(tenderInfo, platform);
                        this.tenders.set(newTender.id, newTender);
                        newTenders++;
                        
                        // Generate alert if relevant
                        if (newTender.relevanceScore >= config.notificationSettings.notificationThreshold) {
                            const alert = await this.createNewTenderAlert(newTender);
                            this.alerts.push(alert);
                            alertsGenerated++;
                        }
                    }
                } catch (error) {
                    errors.push({
                        tenderId: tenderInfo.id,
                        platform,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        retry: true
                    });
                }
            }

            // Update last sync time
            config.lastSync = startTime;
            this.configs.set(platform, config);
            this.saveStoredData();

            return {
                success: errors.length === 0,
                platform,
                tendersProcessed,
                newTenders,
                updatedTenders,
                amendmentsFound,
                alertsGenerated,
                errors,
                lastSyncTime: startTime,
                nextSyncTime: new Date(startTime.getTime() + config.syncFrequency * 60 * 1000),
                dataVolume
            };
        } catch (error) {
            errors.push({
                platform,
                error: error instanceof Error ? error.message : 'Unknown sync error',
                retry: true
            });

            return {
                success: false,
                platform,
                tendersProcessed,
                newTenders,
                updatedTenders,
                amendmentsFound,
                alertsGenerated,
                errors,
                lastSyncTime: startTime,
                nextSyncTime: new Date(startTime.getTime() + config.syncFrequency * 60 * 1000),
                dataVolume
            };
        }
    }

    // Mock API calls and data generation
    private async simulateAPICall(platform: string, method: string, endpoint: string, params?: any): Promise<any> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));

        const config = this.configs.get(platform);
        if (!config) {
            throw new Error('Platform not configured');
        }

        // Simulate authentication check
        if (!config.apiKey && !config.username) {
            throw new Error('Authentication credentials missing');
        }

        return this.generateMockAPIResponse(platform, method, endpoint, params);
    }

    private async fetchTendersFromAPI(platform: string, searchSettings: TenderSearchSettings): Promise<any[]> {
        const recordCount = Math.floor(Math.random() * 25) + 10; // 10-34 tenders
        const tenders: any[] = [];

        for (let i = 0; i < recordCount; i++) {
            const tender = this.generateMockGovernmentTender(platform, searchSettings, i);
            tenders.push(tender);
        }

        return tenders;
    }

    private generateMockGovernmentTender(platform: string, searchSettings: TenderSearchSettings, index: number): any {
        const agencies = searchSettings.agencies.length > 0 ? searchSettings.agencies : ['General Services Administration', 'Department of Defense', 'Department of Transportation'];
        const agency = agencies[Math.floor(Math.random() * agencies.length)];
        const naicsCode = searchSettings.naicsCodes[Math.floor(Math.random() * searchSettings.naicsCodes.length)] || '236220';
        
        const baseValue = Math.floor(Math.random() * (searchSettings.maxValue - searchSettings.minValue)) + searchSettings.minValue;
        const publishDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        const responseDeadline = new Date(publishDate.getTime() + (Math.random() * 60 + searchSettings.responseDeadlineDays) * 24 * 60 * 60 * 1000);

        return {
            id: `${platform}_tender_${Date.now()}_${index}`,
            platform,
            title: `${['Construction of', 'Renovation of', 'Maintenance of', 'Upgrade of', 'Design-Build'][Math.floor(Math.random() * 5)]} ${['Office Building', 'Public Facility', 'Infrastructure', 'Federal Building', 'Military Base'][Math.floor(Math.random() * 5)]} - ${agency}`,
            description: `Comprehensive ${['construction', 'renovation', 'maintenance'][Math.floor(Math.random() * 3)]} project requiring experienced contractor with proven track record in government contracting. Project includes all aspects of ${['structural work', 'MEP systems', 'site preparation', 'finishing work'][Math.floor(Math.random() * 4)]}.`,
            agency,
            department: ['Facilities Management', 'Public Works', 'Engineering', 'Procurement'][Math.floor(Math.random() * 4)],
            solicitationNumber: `${agency.replace(/\s+/g, '').toUpperCase()}-${Date.now().toString().slice(-6)}-${String(index).padStart(3, '0')}`,
            naicsCode,
            setValue: Math.random() > 0.7 ? baseValue : undefined,
            estimatedValue: baseValue,
            responseDeadline,
            publishDate,
            lastModified: new Date(publishDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000),
            status: ['active', 'active', 'active', 'amended'][Math.floor(Math.random() * 4)] as any,
            type: ['solicitation', 'solicitation', 'source_sought'][Math.floor(Math.random() * 3)] as any,
            setAsides: Math.random() > 0.6 ? [searchSettings.setPasides[Math.floor(Math.random() * searchSettings.setPasides.length)]] : [],
            location: {
                state: searchSettings.locations[0] !== 'Global' ? searchSettings.locations[Math.floor(Math.random() * searchSettings.locations.length)] : 'Various',
                city: ['Washington', 'Atlanta', 'Denver', 'Los Angeles', 'Chicago'][Math.floor(Math.random() * 5)],
                zip: `${Math.floor(Math.random() * 90000) + 10000}`,
                country: 'US'
            },
            contactInfo: {
                name: `${['John', 'Sarah', 'Michael', 'Lisa', 'David'][Math.floor(Math.random() * 5)]} ${['Smith', 'Johnson', 'Williams', 'Brown', 'Davis'][Math.floor(Math.random() * 5)]}`,
                email: `contracting.officer.${index}@${agency.toLowerCase().replace(/\s+/g, '')}.gov`,
                phone: `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`
            },
            documents: [
                {
                    id: `doc_${Date.now()}_1`,
                    name: 'Solicitation Document',
                    type: 'solicitation',
                    url: `https://sam.gov/documents/${Date.now()}_solicitation.pdf`,
                    size: Math.floor(Math.random() * 5000000) + 500000,
                    uploadDate: publishDate,
                    description: 'Main solicitation document with requirements'
                },
                {
                    id: `doc_${Date.now()}_2`,
                    name: 'Technical Specifications',
                    type: 'spec',
                    url: `https://sam.gov/documents/${Date.now()}_specs.pdf`,
                    size: Math.floor(Math.random() * 3000000) + 200000,
                    uploadDate: publishDate,
                    description: 'Detailed technical specifications and requirements'
                }
            ],
            amendments: Math.random() > 0.8 ? [{
                id: `amend_${Date.now()}`,
                amendmentNumber: '001',
                publishDate: new Date(publishDate.getTime() + 7 * 24 * 60 * 60 * 1000),
                title: 'Amendment 001 - Response Deadline Extension',
                description: 'Extended response deadline by 14 days due to holiday period',
                changes: ['Response deadline extended', 'Minor clarifications added'],
                newDeadline: new Date(responseDeadline.getTime() + 14 * 24 * 60 * 60 * 1000),
                documents: []
            }] : [],
            requirements: [
                'Valid contractor license',
                'Bonding capacity',
                'Insurance requirements',
                'Security clearance (if applicable)',
                'Past performance references'
            ],
            keywords: searchSettings.keywords.slice(0, 3),
            relevanceScore: 0, // Will be calculated by AI
            aiAnalysis: {
                relevanceScore: 0,
                competitiveAdvantage: [],
                risks: [],
                requirements: {
                    technical: [],
                    financial: [],
                    administrative: []
                },
                recommendedAction: 'watch' as any,
                confidence: 0,
                keyInsights: [],
                estimatedBidCost: 0,
                winProbability: 0,
                competitorAnalysis: ''
            },
            bidSubmitted: false,
            watchlisted: false,
            notes: '',
            customTags: []
        };
    }

    private generateMockAPIResponse(platform: string, method: string, endpoint: string, params?: any): any {
        switch (endpoint) {
            case '/api/status':
                return {
                    success: true,
                    data: {
                        platform,
                        status: 'operational',
                        lastUpdate: new Date().toISOString(),
                        availableRecords: Math.floor(Math.random() * 10000) + 5000
                    }
                };
            default:
                return { success: true, data: params || null };
        }
    }

    // Tender Processing
    private async processNewTender(tenderInfo: any, platform: string): Promise<GovernmentTender> {
        const tender: GovernmentTender = {
            ...tenderInfo,
            platform,
            relevanceScore: 0,
            aiAnalysis: {
                relevanceScore: 0,
                competitiveAdvantage: [],
                risks: [],
                requirements: {
                    technical: [],
                    financial: [],
                    administrative: []
                },
                recommendedAction: 'watch',
                confidence: 0,
                keyInsights: [],
                estimatedBidCost: 0,
                winProbability: 0,
                competitorAnalysis: ''
            }
        };

        // Perform AI analysis
        tender.aiAnalysis = await this.performAIAnalysis(tender);
        tender.relevanceScore = tender.aiAnalysis.relevanceScore;

        return tender;
    }

    private async processTenderUpdate(existingTender: GovernmentTender, updateInfo: any): Promise<GovernmentTender> {
        const updatedTender = {
            ...existingTender,
            ...updateInfo,
            lastModified: new Date(updateInfo.lastModified)
        };

        // Re-analyze if significant changes
        if (updateInfo.description !== existingTender.description || updateInfo.amendments?.length > existingTender.amendments.length) {
            updatedTender.aiAnalysis = await this.performAIAnalysis(updatedTender);
            updatedTender.relevanceScore = updatedTender.aiAnalysis.relevanceScore;
        }

        return updatedTender;
    }

    // AI Analysis
    private async performAIAnalysis(tender: GovernmentTender): Promise<TenderAIAnalysis> {
        try {
            if (!this.genAI) {
                // Return basic analysis without AI
                return this.generateBasicAnalysis(tender);
            }

            const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
            
            const prompt = `
Analyze this government construction tender for relevance and bid potential:

Title: ${tender.title}
Agency: ${tender.agency}
Estimated Value: $${tender.estimatedValue?.toLocaleString() || 'Not specified'}
Description: ${tender.description}
NAICS Code: ${tender.naicsCode}
Requirements: ${tender.requirements.join(', ')}
Deadline: ${tender.responseDeadline.toDateString()}
Set-Asides: ${tender.setAsides.join(', ') || 'None'}

Please provide analysis in this JSON format:
{
  "relevanceScore": number (0-100),
  "competitiveAdvantage": ["advantage1", "advantage2"],
  "risks": ["risk1", "risk2"],
  "requirements": {
    "technical": ["req1", "req2"],
    "financial": ["req1", "req2"],
    "administrative": ["req1", "req2"]
  },
  "recommendedAction": "bid|watch|skip",
  "confidence": number (0-100),
  "keyInsights": ["insight1", "insight2"],
  "estimatedBidCost": number,
  "winProbability": number (0-100),
  "competitorAnalysis": "analysis text"
}

Base your analysis on construction industry expertise, government contracting requirements, and competitive landscape.
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const analysisText = response.text();

            // Try to parse JSON response
            try {
                const analysis = JSON.parse(analysisText);
                return {
                    relevanceScore: Math.min(100, Math.max(0, analysis.relevanceScore || 50)),
                    competitiveAdvantage: Array.isArray(analysis.competitiveAdvantage) ? analysis.competitiveAdvantage : [],
                    risks: Array.isArray(analysis.risks) ? analysis.risks : [],
                    requirements: {
                        technical: Array.isArray(analysis.requirements?.technical) ? analysis.requirements.technical : [],
                        financial: Array.isArray(analysis.requirements?.financial) ? analysis.requirements.financial : [],
                        administrative: Array.isArray(analysis.requirements?.administrative) ? analysis.requirements.administrative : []
                    },
                    recommendedAction: ['bid', 'watch', 'skip'].includes(analysis.recommendedAction) ? analysis.recommendedAction : 'watch',
                    confidence: Math.min(100, Math.max(0, analysis.confidence || 50)),
                    keyInsights: Array.isArray(analysis.keyInsights) ? analysis.keyInsights : [],
                    estimatedBidCost: Math.max(0, analysis.estimatedBidCost || tender.estimatedValue * 0.8 || 0),
                    winProbability: Math.min(100, Math.max(0, analysis.winProbability || 25)),
                    competitorAnalysis: analysis.competitorAnalysis || 'Analysis not available'
                };
            } catch (parseError) {
                console.warn('Failed to parse AI analysis JSON, using basic analysis');
                return this.generateBasicAnalysis(tender);
            }
        } catch (error) {
            console.error('AI analysis failed:', error);
            return this.generateBasicAnalysis(tender);
        }
    }

    private generateBasicAnalysis(tender: GovernmentTender): TenderAIAnalysis {
        // Basic rule-based analysis without AI
        let relevanceScore = 50;
        const competitiveAdvantage: string[] = [];
        const risks: string[] = [];

        // Score based on value range
        if (tender.estimatedValue && tender.estimatedValue >= 100000 && tender.estimatedValue <= 2000000) {
            relevanceScore += 20;
            competitiveAdvantage.push('Appropriate project size for our capacity');
        }

        // Score based on keywords
        const constructionKeywords = ['construction', 'building', 'renovation', 'infrastructure'];
        const titleLower = tender.title.toLowerCase();
        const matchedKeywords = constructionKeywords.filter(keyword => titleLower.includes(keyword));
        relevanceScore += matchedKeywords.length * 10;

        // Score based on location
        if (tender.location.state && ['CA', 'TX', 'NY', 'FL'].includes(tender.location.state)) {
            relevanceScore += 10;
            competitiveAdvantage.push('Located in our operational area');
        }

        // Score based on deadline
        const daysToDeadline = Math.floor((tender.responseDeadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
        if (daysToDeadline >= 14) {
            relevanceScore += 15;
            competitiveAdvantage.push('Adequate time for proposal preparation');
        } else if (daysToDeadline < 7) {
            risks.push('Short response deadline');
        }

        // Basic risk assessment
        if (tender.estimatedValue && tender.estimatedValue > 5000000) {
            risks.push('Large project may require significant bonding');
        }

        if (tender.setAsides.length === 0) {
            risks.push('Full and open competition expected');
        }

        const recommendedAction = relevanceScore >= 70 ? 'bid' : relevanceScore >= 50 ? 'watch' : 'skip';

        return {
            relevanceScore: Math.min(100, relevanceScore),
            competitiveAdvantage,
            risks,
            requirements: {
                technical: ['Construction experience', 'Licensed contractors', 'Quality management system'],
                financial: ['Bonding capacity', 'Insurance coverage', 'Financial stability'],
                administrative: ['SAM registration', 'Compliance documentation', 'Past performance records']
            },
            recommendedAction: recommendedAction as any,
            confidence: 60,
            keyInsights: [
                `Project value: $${tender.estimatedValue?.toLocaleString() || 'TBD'}`,
                `Response deadline: ${daysToDeadline} days`,
                `Agency: ${tender.agency}`
            ],
            estimatedBidCost: tender.estimatedValue ? Math.floor(tender.estimatedValue * 0.85) : 0,
            winProbability: relevanceScore >= 70 ? 35 : relevanceScore >= 50 ? 20 : 10,
            competitorAnalysis: 'Basic competitive analysis based on project characteristics and market conditions'
        };
    }

    // Alert Management
    private async createNewTenderAlert(tender: GovernmentTender): Promise<TenderAlert> {
        return {
            id: `alert_${Date.now()}`,
            tenderId: tender.id,
            type: 'new_tender',
            title: `New High-Relevance Tender: ${tender.title}`,
            message: `A new tender matching your criteria has been found with ${tender.relevanceScore}% relevance score. Deadline: ${tender.responseDeadline.toDateString()}`,
            priority: tender.relevanceScore >= 85 ? 'critical' : tender.relevanceScore >= 70 ? 'high' : 'medium',
            createdAt: new Date(),
            actionRequired: tender.aiAnalysis.recommendedAction === 'bid',
            metadata: {
                relevanceScore: tender.relevanceScore,
                estimatedValue: tender.estimatedValue,
                deadline: tender.responseDeadline,
                recommendedAction: tender.aiAnalysis.recommendedAction
            }
        };
    }

    private async createAmendmentAlert(tender: GovernmentTender): Promise<TenderAlert> {
        const latestAmendment = tender.amendments[tender.amendments.length - 1];
        return {
            id: `alert_amend_${Date.now()}`,
            tenderId: tender.id,
            type: 'amendment',
            title: `Amendment Posted: ${tender.title}`,
            message: `${latestAmendment.title} - ${latestAmendment.description}`,
            priority: tender.watchlisted ? 'high' : 'medium',
            createdAt: new Date(),
            actionRequired: tender.watchlisted || tender.bidSubmitted,
            metadata: {
                amendmentNumber: latestAmendment.amendmentNumber,
                changes: latestAmendment.changes,
                newDeadline: latestAmendment.newDeadline
            }
        };
    }

    // Public API Methods

    // Search and Filtering
    searchTenders(query: {
        keywords?: string[];
        agencies?: string[];
        minValue?: number;
        maxValue?: number;
        status?: string[];
        deadlineRange?: { start: Date; end: Date };
        relevanceThreshold?: number;
        platforms?: string[];
    }): GovernmentTender[] {
        let results = Array.from(this.tenders.values());

        if (query.keywords?.length) {
            results = results.filter(tender => 
                query.keywords!.some(keyword => 
                    tender.title.toLowerCase().includes(keyword.toLowerCase()) ||
                    tender.description.toLowerCase().includes(keyword.toLowerCase())
                )
            );
        }

        if (query.agencies?.length) {
            results = results.filter(tender => 
                query.agencies!.includes(tender.agency)
            );
        }

        if (query.minValue !== undefined) {
            results = results.filter(tender => 
                tender.estimatedValue && tender.estimatedValue >= query.minValue!
            );
        }

        if (query.maxValue !== undefined) {
            results = results.filter(tender => 
                tender.estimatedValue && tender.estimatedValue <= query.maxValue!
            );
        }

        if (query.status?.length) {
            results = results.filter(tender => 
                query.status!.includes(tender.status)
            );
        }

        if (query.deadlineRange) {
            results = results.filter(tender => 
                tender.responseDeadline >= query.deadlineRange!.start &&
                tender.responseDeadline <= query.deadlineRange!.end
            );
        }

        if (query.relevanceThreshold !== undefined) {
            results = results.filter(tender => 
                tender.relevanceScore >= query.relevanceThreshold!
            );
        }

        if (query.platforms?.length) {
            results = results.filter(tender => 
                query.platforms!.includes(tender.platform)
            );
        }

        return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    getTender(tenderId: string): GovernmentTender | null {
        return this.tenders.get(tenderId) || null;
    }

    getAllTenders(): GovernmentTender[] {
        return Array.from(this.tenders.values()).sort((a, b) => 
            b.publishDate.getTime() - a.publishDate.getTime()
        );
    }

    getActiveTenders(): GovernmentTender[] {
        const now = new Date();
        return Array.from(this.tenders.values())
            .filter(tender => 
                tender.status === 'active' && 
                tender.responseDeadline > now
            )
            .sort((a, b) => a.responseDeadline.getTime() - b.responseDeadline.getTime());
    }

    getHighRelevanceTenders(threshold: number = 70): GovernmentTender[] {
        return Array.from(this.tenders.values())
            .filter(tender => tender.relevanceScore >= threshold)
            .sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    // Watchlist Management
    addToWatchlist(tenderId: string): void {
        this.watchlist.add(tenderId);
        const tender = this.tenders.get(tenderId);
        if (tender) {
            tender.watchlisted = true;
            this.tenders.set(tenderId, tender);
        }
        this.saveStoredData();
    }

    removeFromWatchlist(tenderId: string): void {
        this.watchlist.delete(tenderId);
        const tender = this.tenders.get(tenderId);
        if (tender) {
            tender.watchlisted = false;
            this.tenders.set(tenderId, tender);
        }
        this.saveStoredData();
    }

    getWatchlistedTenders(): GovernmentTender[] {
        return Array.from(this.watchlist)
            .map(id => this.tenders.get(id))
            .filter(tender => tender !== undefined) as GovernmentTender[];
    }

    // Bid Management
    markBidSubmitted(tenderId: string, notes?: string): void {
        this.submittedBids.add(tenderId);
        const tender = this.tenders.get(tenderId);
        if (tender) {
            tender.bidSubmitted = true;
            if (notes) tender.notes = notes;
            this.tenders.set(tenderId, tender);
        }
        this.saveStoredData();
    }

    getSubmittedBids(): GovernmentTender[] {
        return Array.from(this.submittedBids)
            .map(id => this.tenders.get(id))
            .filter(tender => tender !== undefined) as GovernmentTender[];
    }

    // Alert Management
    getAlerts(unreadOnly: boolean = false): TenderAlert[] {
        const alerts = unreadOnly 
            ? this.alerts.filter(alert => !alert.readAt)
            : this.alerts;
        
        return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    markAlertAsRead(alertId: string): void {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.readAt = new Date();
            this.saveStoredData();
        }
    }

    // Statistics and Analytics
    getTenderStatistics(): TenderStatistics {
        const tenders = Array.from(this.tenders.values());
        const now = new Date();
        
        const activeTenders = tenders.filter(t => 
            t.status === 'active' && t.responseDeadline > now
        );
        
        const totalValue = tenders.reduce((sum, t) => 
            sum + (t.estimatedValue || 0), 0
        );
        
        const averageRelevanceScore = tenders.length > 0 
            ? tenders.reduce((sum, t) => sum + t.relevanceScore, 0) / tenders.length
            : 0;

        // Agency statistics
        const agencyStats = tenders.reduce((acc, tender) => {
            const existing = acc.find(a => a.name === tender.agency);
            if (existing) {
                existing.count++;
                existing.value += tender.estimatedValue || 0;
            } else {
                acc.push({
                    name: tender.agency,
                    count: 1,
                    value: tender.estimatedValue || 0
                });
            }
            return acc;
        }, [] as Array<{ name: string; count: number; value: number }>);

        return {
            totalTenders: tenders.length,
            activeTenders: activeTenders.length,
            watchlistedTenders: this.watchlist.size,
            submittedBids: this.submittedBids.size,
            totalValue,
            averageRelevanceScore,
            topAgencies: agencyStats.sort((a, b) => b.count - a.count).slice(0, 5),
            topNaicsCodes: [], // Would be calculated from actual data
            monthlyTrends: [], // Would be calculated from actual data
            responseRates: {
                submitted: this.submittedBids.size,
                won: 0, // Would track actual wins
                lost: 0, // Would track actual losses
                pending: this.submittedBids.size // Assuming all submitted are pending
            }
        };
    }

    // Utility Methods
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
export const governmentTenderService = new GovernmentTenderService();