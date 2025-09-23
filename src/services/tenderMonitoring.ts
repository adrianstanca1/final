import { TenderOpportunity } from '../types/procurement';
import { GoogleGenerativeAI } from '@google/generative-ai';

// API key should be set in environment variables
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

export interface TenderSource {
    id: string;
    name: string;
    url: string;
    type: 'government' | 'private' | 'international' | 'industry_specific';
    region: string;
    active: boolean;
    lastScan: Date;
    nextScan: Date;
    credentials?: {
        apiKey?: string;
        username?: string;
        token?: string;
    };
}

export interface MonitoringAlert {
    id: string;
    tenderId: string;
    type: 'new_tender' | 'deadline_approaching' | 'tender_updated' | 'competitor_bid';
    severity: 'high' | 'medium' | 'low';
    message: string;
    relevanceScore: number;
    createdAt: Date;
    read: boolean;
    actionRequired: boolean;
    recommendedAction?: string;
}

export interface RelevanceFilter {
    keywords: string[];
    excludeKeywords: string[];
    minValue: number;
    maxValue: number;
    regions: string[];
    sectors: string[];
    deadlineBuffer: number; // days
    experienceRequired: string[];
}

export interface ScrapingConfig {
    selector: string;
    dataFields: {
        title: string;
        description: string;
        value: string;
        deadline: string;
        region: string;
        sector: string;
        contactInfo: string;
    };
    pagination?: {
        selector: string;
        maxPages: number;
    };
    rateLimit: number; // milliseconds between requests
}

export class TenderMonitoringService {
    private sources: TenderSource[] = [];
    private alerts: MonitoringAlert[] = [];
    private relevanceFilters: RelevanceFilter[] = [];
    private isMonitoring = false;
    private monitoringInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.initializeDefaultSources();
        this.loadStoredData();
    }

    private initializeDefaultSources(): void {
        this.sources = [
            {
                id: 'gov-contracts',
                name: 'Government Contracts Portal',
                url: 'https://www.contractsregistry.gov',
                type: 'government',
                region: 'National',
                active: true,
                lastScan: new Date(),
                nextScan: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
            },
            {
                id: 'construction-bids',
                name: 'Construction Industry Bids',
                url: 'https://www.constructionbids.com',
                type: 'industry_specific',
                region: 'Regional',
                active: true,
                lastScan: new Date(),
                nextScan: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
            },
            {
                id: 'private-tenders',
                name: 'Private Sector Tenders',
                url: 'https://www.privatetenders.net',
                type: 'private',
                region: 'Multi-region',
                active: true,
                lastScan: new Date(),
                nextScan: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
            },
        ];
    }

    private loadStoredData(): void {
        try {
            const storedSources = localStorage.getItem('tender_monitoring_sources');
            const storedAlerts = localStorage.getItem('tender_monitoring_alerts');
            const storedFilters = localStorage.getItem('tender_monitoring_filters');

            if (storedSources) {
                this.sources = JSON.parse(storedSources).map((source: any) => ({
                    ...source,
                    lastScan: new Date(source.lastScan),
                    nextScan: new Date(source.nextScan),
                }));
            }

            if (storedAlerts) {
                this.alerts = JSON.parse(storedAlerts).map((alert: any) => ({
                    ...alert,
                    createdAt: new Date(alert.createdAt),
                }));
            }

            if (storedFilters) {
                this.relevanceFilters = JSON.parse(storedFilters);
            }
        } catch (error) {
            console.error('Error loading stored monitoring data:', error);
        }
    }

    private saveStoredData(): void {
        try {
            localStorage.setItem('tender_monitoring_sources', JSON.stringify(this.sources));
            localStorage.setItem('tender_monitoring_alerts', JSON.stringify(this.alerts));
            localStorage.setItem('tender_monitoring_filters', JSON.stringify(this.relevanceFilters));
        } catch (error) {
            console.error('Error saving monitoring data:', error);
        }
    }

    // AI-powered relevance scoring
    async calculateRelevanceScore(tender: TenderOpportunity, filters: RelevanceFilter[]): Promise<number> {
        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

            const prompt = `
                Analyze this tender opportunity for relevance to a construction company:
                
                Title: ${tender.title}
                Description: ${tender.description}
                Value: ${tender.estimatedValue}
                Sector: ${tender.sector}
                Region: ${tender.region}
                
                Filters:
                ${filters.map(filter => `
                - Keywords: ${filter.keywords.join(', ')}
                - Exclude: ${filter.excludeKeywords.join(', ')}
                - Value range: $${filter.minValue} - $${filter.maxValue}
                - Preferred regions: ${filter.regions.join(', ')}
                - Target sectors: ${filter.sectors.join(', ')}
                - Required experience: ${filter.experienceRequired.join(', ')}
                `).join('\n')}
                
                Return a relevance score from 0-100 based on:
                1. Keyword matching (30%)
                2. Value alignment (25%)
                3. Geographic proximity (20%)
                4. Sector experience (15%)
                5. Timeline feasibility (10%)
                
                Format: Just return the numeric score (0-100).
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const scoreText = response.text().trim();
            
            const score = parseInt(scoreText.match(/\d+/)?.[0] || '0');
            return Math.min(Math.max(score, 0), 100);
        } catch (error) {
            console.error('Error calculating relevance score:', error);
            return 0;
        }
    }

    // Web scraping simulation (in production, use proper scraping libraries)
    async scrapeTenderData(source: TenderSource, config: ScrapingConfig): Promise<TenderOpportunity[]> {
        try {
            // Simulate API/scraping delay
            await new Promise(resolve => setTimeout(resolve, config.rateLimit));

            // In production, this would use libraries like Puppeteer, Cheerio, or APIs
            // For demo, return simulated data
            const mockTenders: TenderOpportunity[] = [
                {
                    id: `${source.id}-${Date.now()}-1`,
                    title: `Infrastructure Development Project - ${source.region}`,
                    description: 'Large-scale infrastructure development including roads, utilities, and commercial buildings.',
                    sector: 'Infrastructure',
                    region: source.region,
                    estimatedValue: Math.floor(Math.random() * 10000000) + 1000000,
                    deadline: new Date(Date.now() + (Math.random() * 90 + 30) * 24 * 60 * 60 * 1000),
                    status: 'open',
                    contactInfo: {
                        name: `Procurement Officer - ${source.name}`,
                        email: `procurement@${source.name.toLowerCase().replace(/\s+/g, '')}.gov`,
                        phone: '+1-555-' + Math.floor(Math.random() * 9000 + 1000),
                    },
                    requirements: [
                        'Minimum 5 years construction experience',
                        'Previous infrastructure project portfolio',
                        'Local contractor registration',
                        'Environmental compliance certification',
                    ],
                    documents: [
                        { name: 'Tender Specification', url: '#', type: 'pdf' },
                        { name: 'Site Plans', url: '#', type: 'dwg' },
                        { name: 'Environmental Report', url: '#', type: 'pdf' },
                    ],
                    tags: ['construction', 'infrastructure', 'government', 'large-scale'],
                    source: source.name,
                    discoveredAt: new Date(),
                },
            ];

            return mockTenders;
        } catch (error) {
            console.error(`Error scraping data from ${source.name}:`, error);
            return [];
        }
    }

    // Monitor all active sources
    async scanAllSources(): Promise<TenderOpportunity[]> {
        const allTenders: TenderOpportunity[] = [];
        const scrapingConfig: ScrapingConfig = {
            selector: '.tender-item',
            dataFields: {
                title: '.tender-title',
                description: '.tender-description',
                value: '.tender-value',
                deadline: '.tender-deadline',
                region: '.tender-region',
                sector: '.tender-sector',
                contactInfo: '.tender-contact',
            },
            rateLimit: 2000,
        };

        for (const source of this.sources.filter(s => s.active)) {
            if (new Date() >= source.nextScan) {
                try {
                    const tenders = await this.scrapeTenderData(source, scrapingConfig);
                    
                    // Calculate relevance scores for each tender
                    for (const tender of tenders) {
                        const relevanceScore = await this.calculateRelevanceScore(tender, this.relevanceFilters);
                        
                        // Create alerts for highly relevant tenders
                        if (relevanceScore >= 70) {
                            await this.createAlert({
                                tenderId: tender.id,
                                type: 'new_tender',
                                severity: relevanceScore >= 90 ? 'high' : 'medium',
                                message: `New high-relevance tender discovered: ${tender.title}`,
                                relevanceScore,
                                actionRequired: true,
                                recommendedAction: 'Review and prepare bid response',
                            });
                        }
                    }

                    allTenders.push(...tenders);
                    
                    // Update source scan times
                    source.lastScan = new Date();
                    source.nextScan = new Date(Date.now() + 6 * 60 * 60 * 1000); // Next scan in 6 hours
                } catch (error) {
                    console.error(`Error scanning source ${source.name}:`, error);
                }
            }
        }

        this.saveStoredData();
        return allTenders;
    }

    // Create monitoring alert
    async createAlert(alertData: Omit<MonitoringAlert, 'id' | 'createdAt' | 'read'>): Promise<MonitoringAlert> {
        const alert: MonitoringAlert = {
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date(),
            read: false,
            ...alertData,
        };

        this.alerts.unshift(alert);
        this.saveStoredData();

        // Trigger notification (in production, integrate with notification service)
        this.triggerNotification(alert);

        return alert;
    }

    private triggerNotification(alert: MonitoringAlert): void {
        // In production, integrate with push notifications, email, or Slack
        console.log(`🚨 New Procurement Alert (${alert.severity.toUpperCase()}):`, alert.message);
        
        // Browser notification if permissions granted
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`Procurement Alert - ${alert.severity.toUpperCase()}`, {
                body: alert.message,
                icon: '/favicon.ico',
                tag: alert.id,
            });
        }
    }

    // Start automated monitoring
    startMonitoring(intervalHours: number = 6): void {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        this.monitoringInterval = setInterval(async () => {
            console.log('🔍 Running automated tender scan...');
            await this.scanAllSources();
        }, intervalHours * 60 * 60 * 1000);

        console.log(`✅ Tender monitoring started (scanning every ${intervalHours} hours)`);
    }

    // Stop automated monitoring
    stopMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.isMonitoring = false;
        console.log('⏹️ Tender monitoring stopped');
    }

    // Manage sources
    addSource(source: Omit<TenderSource, 'id' | 'lastScan' | 'nextScan'>): TenderSource {
        const newSource: TenderSource = {
            id: `source-${Date.now()}`,
            lastScan: new Date(0),
            nextScan: new Date(),
            ...source,
        };

        this.sources.push(newSource);
        this.saveStoredData();
        return newSource;
    }

    updateSource(id: string, updates: Partial<TenderSource>): boolean {
        const index = this.sources.findIndex(s => s.id === id);
        if (index >= 0) {
            this.sources[index] = { ...this.sources[index], ...updates };
            this.saveStoredData();
            return true;
        }
        return false;
    }

    removeSource(id: string): boolean {
        const index = this.sources.findIndex(s => s.id === id);
        if (index >= 0) {
            this.sources.splice(index, 1);
            this.saveStoredData();
            return true;
        }
        return false;
    }

    // Manage relevance filters
    addRelevanceFilter(filter: RelevanceFilter): void {
        this.relevanceFilters.push(filter);
        this.saveStoredData();
    }

    updateRelevanceFilter(index: number, filter: RelevanceFilter): boolean {
        if (index >= 0 && index < this.relevanceFilters.length) {
            this.relevanceFilters[index] = filter;
            this.saveStoredData();
            return true;
        }
        return false;
    }

    removeRelevanceFilter(index: number): boolean {
        if (index >= 0 && index < this.relevanceFilters.length) {
            this.relevanceFilters.splice(index, 1);
            this.saveStoredData();
            return true;
        }
        return false;
    }

    // Alert management
    markAlertAsRead(alertId: string): boolean {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.read = true;
            this.saveStoredData();
            return true;
        }
        return false;
    }

    deleteAlert(alertId: string): boolean {
        const index = this.alerts.findIndex(a => a.id === alertId);
        if (index >= 0) {
            this.alerts.splice(index, 1);
            this.saveStoredData();
            return true;
        }
        return false;
    }

    // Getters
    getSources(): TenderSource[] {
        return [...this.sources];
    }

    getAlerts(unreadOnly: boolean = false): MonitoringAlert[] {
        return unreadOnly ? this.alerts.filter(a => !a.read) : [...this.alerts];
    }

    getRelevanceFilters(): RelevanceFilter[] {
        return [...this.relevanceFilters];
    }

    isMonitoringActive(): boolean {
        return this.isMonitoring;
    }

    getMonitoringStats(): {
        totalSources: number;
        activeSources: number;
        totalAlerts: number;
        unreadAlerts: number;
        lastScan: Date | null;
        nextScan: Date | null;
    } {
        const activeSources = this.sources.filter(s => s.active);
        const lastScan = activeSources.reduce((latest, source) => 
            !latest || source.lastScan > latest ? source.lastScan : latest, null as Date | null);
        const nextScan = activeSources.reduce((earliest, source) => 
            !earliest || source.nextScan < earliest ? source.nextScan : earliest, null as Date | null);

        return {
            totalSources: this.sources.length,
            activeSources: activeSources.length,
            totalAlerts: this.alerts.length,
            unreadAlerts: this.alerts.filter(a => !a.read).length,
            lastScan,
            nextScan,
        };
    }
}

// Export singleton instance
export const tenderMonitoringService = new TenderMonitoringService();