import { Project, Task, User, Client } from '../types';

// Project Management Platform Types
export interface ProjectManagementConfig {
    platform: 'asana' | 'monday' | 'jira' | 'trello' | 'notion' | 'clickup';
    apiKey?: string;
    accessToken?: string;
    refreshToken?: string;
    workspaceId?: string;
    teamId?: string;
    boardId?: string;
    baseUrl?: string;
    enabled: boolean;
    syncFrequency: number; // minutes
    lastSync?: Date;
    syncSettings: PMSyncSettings;
}

export interface PMSyncSettings {
    autoCreateProjects: boolean;
    autoSyncTasks: boolean;
    syncTimeline: boolean;
    syncResources: boolean;
    syncComments: boolean;
    syncAttachments: boolean;
    bidirectionalSync: boolean;
    defaultProjectTemplate?: string;
    statusMapping: Record<string, string>;
    priorityMapping: Record<string, string>;
    fieldMapping: Record<string, string>;
}

export interface ProjectManagementSyncResult {
    success: boolean;
    projectsProcessed: number;
    tasksProcessed: number;
    itemsCreated: number;
    itemsUpdated: number;
    itemsSkipped: number;
    errors: PMSyncError[];
    lastSyncTime: Date;
    nextSyncTime: Date;
    dataTransferred: number; // bytes
}

export interface PMSyncError {
    itemId: string;
    itemType: 'project' | 'task' | 'comment' | 'attachment' | 'resource';
    error: string;
    details?: any;
    platform: string;
}

export interface PMRecord {
    id: string;
    type: 'project' | 'task' | 'milestone' | 'comment' | 'attachment';
    externalId: string;
    platform: string;
    data: Record<string, any>;
    lastSynced: Date;
    syncStatus: 'pending' | 'synced' | 'error' | 'conflict';
    localId?: string;
    parentId?: string;
    dependencies: string[];
}

export interface TaskDependency {
    dependentTask: string;
    prerequisiteTask: string;
    dependencyType: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
    lag: number; // days
}

export interface ProjectTemplate {
    id: string;
    name: string;
    description: string;
    platform: string;
    taskTemplates: TaskTemplate[];
    milestoneTemplates: MilestoneTemplate[];
    customFields: CustomField[];
    automationRules: AutomationRule[];
}

export interface TaskTemplate {
    name: string;
    description: string;
    estimatedHours: number;
    priority: string;
    assigneeRole: string;
    dependencies: string[];
    customFields: Record<string, any>;
}

export interface MilestoneTemplate {
    name: string;
    description: string;
    daysFromStart: number;
    deliverables: string[];
}

export interface CustomField {
    name: string;
    type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox';
    options?: string[];
    required: boolean;
    defaultValue?: any;
}

export interface AutomationRule {
    id: string;
    name: string;
    trigger: AutomationTrigger;
    actions: AutomationAction[];
    enabled: boolean;
}

export interface AutomationTrigger {
    type: 'status_change' | 'date_reached' | 'field_updated' | 'task_completed';
    conditions: Record<string, any>;
}

export interface AutomationAction {
    type: 'update_field' | 'create_task' | 'send_notification' | 'move_task';
    parameters: Record<string, any>;
}

export interface ResourceAllocation {
    projectId: string;
    userId: string;
    role: string;
    allocation: number; // percentage 0-100
    startDate: Date;
    endDate: Date;
    hourlyRate?: number;
    skills: string[];
}

export interface ProjectTimeline {
    projectId: string;
    startDate: Date;
    endDate: Date;
    milestones: TimelineMilestone[];
    criticalPath: string[];
    ganttData: GanttTask[];
    bufferTime: number; // days
}

export interface TimelineMilestone {
    id: string;
    name: string;
    date: Date;
    deliverables: string[];
    status: 'upcoming' | 'in_progress' | 'completed' | 'overdue';
}

export interface GanttTask {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    progress: number; // 0-100
    dependencies: string[];
    assignees: string[];
    isCritical: boolean;
}

export class ProjectManagementIntegrationService {
    private configs: Map<string, ProjectManagementConfig> = new Map();
    private syncQueue: PMRecord[] = [];
    private templates: ProjectTemplate[] = [];
    private dependencies: TaskDependency[] = [];
    private resourceAllocations: ResourceAllocation[] = [];
    private timelines: ProjectTimeline[] = [];
    private isAutoSyncEnabled = true;
    private syncInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.initializeDefaultConfigs();
        this.loadStoredData();
        this.createDefaultTemplates();
        this.startAutoSync();
    }

    private initializeDefaultConfigs(): void {
        // Asana configuration
        const asanaConfig: ProjectManagementConfig = {
            platform: 'asana',
            enabled: false,
            syncFrequency: 15, // 15 minutes
            syncSettings: {
                autoCreateProjects: true,
                autoSyncTasks: true,
                syncTimeline: true,
                syncResources: true,
                syncComments: true,
                syncAttachments: false,
                bidirectionalSync: true,
                statusMapping: {
                    'Not Started': 'incomplete',
                    'In Progress': 'incomplete',
                    'Completed': 'completed',
                    'On Hold': 'incomplete'
                },
                priorityMapping: {
                    'Low': 'low',
                    'Medium': 'normal',
                    'High': 'high',
                    'Urgent': 'high'
                },
                fieldMapping: {
                    'description': 'notes',
                    'dueDate': 'due_on',
                    'assignee': 'assignee'
                }
            }
        };

        // Monday.com configuration
        const mondayConfig: ProjectManagementConfig = {
            platform: 'monday',
            enabled: false,
            syncFrequency: 20, // 20 minutes
            syncSettings: {
                autoCreateProjects: true,
                autoSyncTasks: true,
                syncTimeline: true,
                syncResources: true,
                syncComments: true,
                syncAttachments: true,
                bidirectionalSync: true,
                statusMapping: {
                    'Not Started': 'not_started',
                    'In Progress': 'working_on_it',
                    'Completed': 'done',
                    'On Hold': 'stuck'
                },
                priorityMapping: {
                    'Low': 'low',
                    'Medium': 'medium',
                    'High': 'high',
                    'Urgent': 'critical'
                },
                fieldMapping: {
                    'description': 'long_text',
                    'dueDate': 'date',
                    'assignee': 'person'
                }
            }
        };

        // Jira configuration
        const jiraConfig: ProjectManagementConfig = {
            platform: 'jira',
            enabled: false,
            syncFrequency: 25, // 25 minutes
            syncSettings: {
                autoCreateProjects: false, // Jira projects need specific setup
                autoSyncTasks: true,
                syncTimeline: true,
                syncResources: false,
                syncComments: true,
                syncAttachments: true,
                bidirectionalSync: true,
                statusMapping: {
                    'Not Started': 'To Do',
                    'In Progress': 'In Progress',
                    'Completed': 'Done',
                    'On Hold': 'On Hold'
                },
                priorityMapping: {
                    'Low': 'Low',
                    'Medium': 'Medium',
                    'High': 'High',
                    'Urgent': 'Highest'
                },
                fieldMapping: {
                    'description': 'description',
                    'dueDate': 'duedate',
                    'assignee': 'assignee'
                }
            }
        };

        this.configs.set('asana', asanaConfig);
        this.configs.set('monday', mondayConfig);
        this.configs.set('jira', jiraConfig);
    }

    private loadStoredData(): void {
        try {
            const storedConfigs = localStorage.getItem('pm_configs');
            const storedQueue = localStorage.getItem('pm_sync_queue');
            const storedTemplates = localStorage.getItem('pm_templates');
            const storedDependencies = localStorage.getItem('pm_dependencies');
            const storedResources = localStorage.getItem('pm_resource_allocations');
            const storedTimelines = localStorage.getItem('pm_timelines');

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

            if (storedTemplates) {
                this.templates = JSON.parse(storedTemplates);
            }

            if (storedDependencies) {
                this.dependencies = JSON.parse(storedDependencies);
            }

            if (storedResources) {
                this.resourceAllocations = JSON.parse(storedResources).map((res: any) => ({
                    ...res,
                    startDate: new Date(res.startDate),
                    endDate: new Date(res.endDate)
                }));
            }

            if (storedTimelines) {
                this.timelines = JSON.parse(storedTimelines).map((timeline: any) => ({
                    ...timeline,
                    startDate: new Date(timeline.startDate),
                    endDate: new Date(timeline.endDate),
                    milestones: timeline.milestones.map((m: any) => ({
                        ...m,
                        date: new Date(m.date)
                    })),
                    ganttData: timeline.ganttData.map((g: any) => ({
                        ...g,
                        startDate: new Date(g.startDate),
                        endDate: new Date(g.endDate)
                    }))
                }));
            }
        } catch (error) {
            console.error('Error loading PM data:', error);
        }
    }

    private saveStoredData(): void {
        try {
            const configsObj = Object.fromEntries(this.configs);
            localStorage.setItem('pm_configs', JSON.stringify(configsObj));
            localStorage.setItem('pm_sync_queue', JSON.stringify(this.syncQueue));
            localStorage.setItem('pm_templates', JSON.stringify(this.templates));
            localStorage.setItem('pm_dependencies', JSON.stringify(this.dependencies));
            localStorage.setItem('pm_resource_allocations', JSON.stringify(this.resourceAllocations));
            localStorage.setItem('pm_timelines', JSON.stringify(this.timelines));
        } catch (error) {
            console.error('Error saving PM data:', error);
        }
    }

    private createDefaultTemplates(): void {
        const constructionTemplate: ProjectTemplate = {
            id: 'construction_standard',
            name: 'Standard Construction Project',
            description: 'Template for typical construction projects with standard phases',
            platform: 'generic',
            taskTemplates: [
                {
                    name: 'Site Survey and Planning',
                    description: 'Initial site assessment and planning phase',
                    estimatedHours: 40,
                    priority: 'High',
                    assigneeRole: 'Project Manager',
                    dependencies: [],
                    customFields: { phase: 'Planning', category: 'Survey' }
                },
                {
                    name: 'Permit Applications',
                    description: 'Submit and track building permits',
                    estimatedHours: 16,
                    priority: 'High',
                    assigneeRole: 'Project Manager',
                    dependencies: ['Site Survey and Planning'],
                    customFields: { phase: 'Planning', category: 'Legal' }
                },
                {
                    name: 'Foundation Work',
                    description: 'Excavation and foundation construction',
                    estimatedHours: 120,
                    priority: 'High',
                    assigneeRole: 'Crew Lead',
                    dependencies: ['Permit Applications'],
                    customFields: { phase: 'Construction', category: 'Structural' }
                },
                {
                    name: 'Framing',
                    description: 'Structural framing and roof installation',
                    estimatedHours: 200,
                    priority: 'High',
                    assigneeRole: 'Crew Lead',
                    dependencies: ['Foundation Work'],
                    customFields: { phase: 'Construction', category: 'Structural' }
                },
                {
                    name: 'Electrical and Plumbing',
                    description: 'Install electrical and plumbing systems',
                    estimatedHours: 160,
                    priority: 'Medium',
                    assigneeRole: 'Subcontractor',
                    dependencies: ['Framing'],
                    customFields: { phase: 'Construction', category: 'MEP' }
                },
                {
                    name: 'Final Inspection',
                    description: 'Final walkthrough and quality inspection',
                    estimatedHours: 8,
                    priority: 'High',
                    assigneeRole: 'Project Manager',
                    dependencies: ['Electrical and Plumbing'],
                    customFields: { phase: 'Completion', category: 'Quality' }
                }
            ],
            milestoneTemplates: [
                {
                    name: 'Permits Approved',
                    description: 'All required permits obtained',
                    daysFromStart: 14,
                    deliverables: ['Building permit', 'Electrical permit', 'Plumbing permit']
                },
                {
                    name: 'Foundation Complete',
                    description: 'Foundation work finished and inspected',
                    daysFromStart: 30,
                    deliverables: ['Foundation inspection certificate']
                },
                {
                    name: 'Structure Complete',
                    description: 'Framing and roofing complete',
                    daysFromStart: 60,
                    deliverables: ['Structural inspection certificate']
                },
                {
                    name: 'Project Complete',
                    description: 'All work completed and final inspection passed',
                    daysFromStart: 90,
                    deliverables: ['Certificate of occupancy', 'Final inspection report']
                }
            ],
            customFields: [
                {
                    name: 'Phase',
                    type: 'select',
                    options: ['Planning', 'Construction', 'Completion'],
                    required: true
                },
                {
                    name: 'Category',
                    type: 'select',
                    options: ['Survey', 'Legal', 'Structural', 'MEP', 'Quality'],
                    required: true
                },
                {
                    name: 'Weather Dependent',
                    type: 'checkbox',
                    required: false,
                    defaultValue: false
                }
            ],
            automationRules: [
                {
                    id: 'weather_delay',
                    name: 'Weather Delay Notification',
                    trigger: {
                        type: 'field_updated',
                        conditions: { weatherDependent: true, status: 'delayed' }
                    },
                    actions: [{
                        type: 'send_notification',
                        parameters: { 
                            message: 'Weather-dependent task delayed',
                            recipients: ['project_manager', 'crew_lead']
                        }
                    }],
                    enabled: true
                }
            ]
        };

        this.templates.push(constructionTemplate);
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
    async updatePMConfig(platform: string, config: Partial<ProjectManagementConfig>): Promise<void> {
        const existingConfig = this.configs.get(platform);
        if (!existingConfig) {
            throw new Error(`PM platform ${platform} not supported`);
        }

        const updatedConfig = { ...existingConfig, ...config };
        this.configs.set(platform, updatedConfig);
        this.saveStoredData();

        // Test connection if being enabled
        if (config.enabled && !existingConfig.enabled) {
            await this.testConnection(platform);
        }
    }

    getPMConfig(platform: string): ProjectManagementConfig | null {
        return this.configs.get(platform) || null;
    }

    getAllPMConfigs(): Record<string, ProjectManagementConfig> {
        return Object.fromEntries(this.configs);
    }

    // Connection Testing
    async testConnection(platform: string): Promise<{ success: boolean; message: string; workspaceInfo?: any }> {
        const config = this.configs.get(platform);
        if (!config) {
            return { success: false, message: 'Platform not configured' };
        }

        try {
            const response = await this.simulateAPICall(platform, 'GET', '/workspaces');
            
            return { 
                success: true, 
                message: 'Connection successful',
                workspaceInfo: response.data
            };
        } catch (error) {
            return { 
                success: false, 
                message: error instanceof Error ? error.message : 'Connection failed' 
            };
        }
    }

    // Data Synchronization
    async syncWithPlatform(platform: string): Promise<ProjectManagementSyncResult> {
        const config = this.configs.get(platform);
        if (!config || !config.enabled) {
            throw new Error(`Platform ${platform} is not enabled`);
        }

        const startTime = new Date();
        let projectsProcessed = 0;
        let tasksProcessed = 0;
        let itemsCreated = 0;
        let itemsUpdated = 0;
        let itemsSkipped = 0;
        let dataTransferred = 0;
        const errors: PMSyncError[] = [];

        try {
            // Sync projects
            if (config.syncSettings.autoCreateProjects) {
                const projectsResult = await this.syncProjects(platform);
                projectsProcessed = projectsResult.processed;
                itemsCreated += projectsResult.created;
                itemsUpdated += projectsResult.updated;
                itemsSkipped += projectsResult.skipped;
                dataTransferred += projectsResult.dataSize;
                errors.push(...projectsResult.errors);
            }

            // Sync tasks
            if (config.syncSettings.autoSyncTasks) {
                const tasksResult = await this.syncTasks(platform);
                tasksProcessed = tasksResult.processed;
                itemsCreated += tasksResult.created;
                itemsUpdated += tasksResult.updated;
                itemsSkipped += tasksResult.skipped;
                dataTransferred += tasksResult.dataSize;
                errors.push(...tasksResult.errors);
            }

            // Sync comments
            if (config.syncSettings.syncComments) {
                const commentsResult = await this.syncComments(platform);
                itemsCreated += commentsResult.created;
                itemsUpdated += commentsResult.updated;
                dataTransferred += commentsResult.dataSize;
                errors.push(...commentsResult.errors);
            }

            // Sync timeline data
            if (config.syncSettings.syncTimeline) {
                await this.syncTimelines(platform);
            }

            // Update last sync time
            config.lastSync = startTime;
            this.configs.set(platform, config);
            this.saveStoredData();

            return {
                success: errors.length === 0,
                projectsProcessed,
                tasksProcessed,
                itemsCreated,
                itemsUpdated,
                itemsSkipped,
                errors,
                lastSyncTime: startTime,
                nextSyncTime: new Date(startTime.getTime() + config.syncFrequency * 60 * 1000),
                dataTransferred
            };
        } catch (error) {
            errors.push({
                itemId: 'sync_error',
                itemType: 'project',
                platform,
                error: error instanceof Error ? error.message : 'Unknown sync error'
            });

            return {
                success: false,
                projectsProcessed,
                tasksProcessed,
                itemsCreated,
                itemsUpdated,
                itemsSkipped,
                errors,
                lastSyncTime: startTime,
                nextSyncTime: new Date(startTime.getTime() + config.syncFrequency * 60 * 1000),
                dataTransferred
            };
        }
    }

    private async syncProjects(platform: string): Promise<{
        processed: number;
        created: number;
        updated: number;
        skipped: number;
        dataSize: number;
        errors: PMSyncError[];
    }> {
        const mockProjects = await this.fetchMockPMData(platform, 'projects');
        let processed = 0;
        let created = 0;
        let updated = 0;
        let skipped = 0;
        let dataSize = 0;
        const errors: PMSyncError[] = [];

        for (const projectData of mockProjects) {
            try {
                processed++;
                dataSize += JSON.stringify(projectData).length;
                
                const existingProject = this.findExistingPMRecord(projectData.id, 'project');
                
                if (existingProject) {
                    await this.updateLocalProject(existingProject, projectData);
                    updated++;
                } else {
                    await this.createLocalProject(projectData, platform);
                    created++;
                }
            } catch (error) {
                errors.push({
                    itemId: projectData.id,
                    itemType: 'project',
                    platform,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                skipped++;
            }
        }

        return { processed, created, updated, skipped, dataSize, errors };
    }

    private async syncTasks(platform: string): Promise<{
        processed: number;
        created: number;
        updated: number;
        skipped: number;
        dataSize: number;
        errors: PMSyncError[];
    }> {
        const mockTasks = await this.fetchMockPMData(platform, 'tasks');
        let processed = 0;
        let created = 0;
        let updated = 0;
        let skipped = 0;
        let dataSize = 0;
        const errors: PMSyncError[] = [];

        for (const taskData of mockTasks) {
            try {
                processed++;
                dataSize += JSON.stringify(taskData).length;
                
                const existingTask = this.findExistingPMRecord(taskData.id, 'task');
                
                if (existingTask) {
                    await this.updateLocalTask(existingTask, taskData);
                    updated++;
                } else {
                    await this.createLocalTask(taskData, platform);
                    created++;
                }
            } catch (error) {
                errors.push({
                    itemId: taskData.id,
                    itemType: 'task',
                    platform,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                skipped++;
            }
        }

        return { processed, created, updated, skipped, dataSize, errors };
    }

    private async syncComments(platform: string): Promise<{
        created: number;
        updated: number;
        dataSize: number;
        errors: PMSyncError[];
    }> {
        const mockComments = await this.fetchMockPMData(platform, 'comments');
        return {
            created: Math.floor(mockComments.length * 0.6),
            updated: Math.floor(mockComments.length * 0.4),
            dataSize: mockComments.reduce((sum, c) => sum + JSON.stringify(c).length, 0),
            errors: []
        };
    }

    private async syncTimelines(platform: string): Promise<void> {
        // Sync timeline and gantt data
        const timelineData = await this.fetchMockPMData(platform, 'timelines');
        for (const timeline of timelineData) {
            const existingTimeline = this.timelines.find(t => t.projectId === timeline.projectId);
            if (existingTimeline) {
                Object.assign(existingTimeline, timeline);
            } else {
                this.timelines.push(timeline);
            }
        }
    }

    // Mock API and data generation
    private async simulateAPICall(platform: string, method: string, endpoint: string, data?: any): Promise<any> {
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 500));

        const config = this.configs.get(platform);
        if (!config) {
            throw new Error('Platform not configured');
        }

        if (!config.apiKey && !config.accessToken) {
            throw new Error('Authentication credentials missing');
        }

        return this.generateMockPMAPIResponse(platform, method, endpoint, data);
    }

    private async fetchMockPMData(platform: string, dataType: string): Promise<any[]> {
        const recordCount = Math.floor(Math.random() * 12) + 3; // 3-14 records
        const records: any[] = [];

        for (let i = 0; i < recordCount; i++) {
            const record = this.generateMockPMRecord(platform, dataType, i);
            records.push(record);
        }

        return records;
    }

    private generateMockPMRecord(platform: string, recordType: string, index: number): any {
        const baseRecord = {
            id: `${platform}_${recordType}_${Date.now()}_${index}`,
            platform,
            lastModified: new Date().toISOString()
        };

        switch (recordType) {
            case 'projects':
                return {
                    ...baseRecord,
                    name: `Construction Project ${index + 1}`,
                    description: `Commercial construction project with timeline management`,
                    status: ['Planning', 'In Progress', 'On Hold', 'Completed'][Math.floor(Math.random() * 4)],
                    startDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
                    endDate: new Date(Date.now() + Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
                    budget: Math.floor(Math.random() * 500000) + 100000,
                    progress: Math.floor(Math.random() * 100),
                    teamMembers: Math.floor(Math.random() * 10) + 3,
                    priority: ['Low', 'Medium', 'High', 'Urgent'][Math.floor(Math.random() * 4)],
                    client: `Client ${index + 1}`,
                    tags: ['Construction', 'Commercial', 'Active'],
                    customFields: {
                        projectType: 'Commercial',
                        contractValue: Math.floor(Math.random() * 1000000) + 200000,
                        permitStatus: 'Approved'
                    }
                };
            case 'tasks':
                return {
                    ...baseRecord,
                    name: `Task ${index + 1}: ${['Foundation Work', 'Framing', 'Electrical', 'Plumbing', 'Inspection'][Math.floor(Math.random() * 5)]}`,
                    description: `Detailed task description for construction activity`,
                    projectId: `project_${Math.floor(Math.random() * 5) + 1}`,
                    assigneeId: `user_${Math.floor(Math.random() * 8) + 1}`,
                    status: ['Not Started', 'In Progress', 'Completed', 'On Hold'][Math.floor(Math.random() * 4)],
                    priority: ['Low', 'Medium', 'High', 'Urgent'][Math.floor(Math.random() * 4)],
                    startDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                    dueDate: new Date(Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
                    estimatedHours: Math.floor(Math.random() * 40) + 4,
                    actualHours: Math.floor(Math.random() * 35) + 2,
                    progress: Math.floor(Math.random() * 100),
                    dependencies: index > 0 ? [`task_${index}`] : [],
                    tags: ['Construction', 'Active'],
                    customFields: {
                        phase: ['Planning', 'Construction', 'Completion'][Math.floor(Math.random() * 3)],
                        weatherDependent: Math.random() > 0.6,
                        skillsRequired: ['General Labor', 'Electrical', 'Plumbing', 'Carpentry'][Math.floor(Math.random() * 4)]
                    }
                };
            case 'comments':
                return {
                    ...baseRecord,
                    taskId: `task_${Math.floor(Math.random() * 10) + 1}`,
                    authorId: `user_${Math.floor(Math.random() * 5) + 1}`,
                    content: `Progress update: ${['Work proceeding as planned', 'Minor delays due to weather', 'Ahead of schedule', 'Waiting for materials'][Math.floor(Math.random() * 4)]}`,
                    createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
                    attachments: Math.random() > 0.7 ? [`photo_${index}.jpg`] : []
                };
            case 'timelines':
                return {
                    projectId: `project_${index + 1}`,
                    startDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
                    endDate: new Date(Date.now() + Math.random() * 120 * 24 * 60 * 60 * 1000),
                    milestones: [
                        {
                            id: `milestone_${index}_1`,
                            name: 'Foundation Complete',
                            date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                            deliverables: ['Foundation inspection'],
                            status: 'upcoming'
                        }
                    ],
                    criticalPath: [`task_${index}_1`, `task_${index}_2`],
                    ganttData: [],
                    bufferTime: Math.floor(Math.random() * 10) + 5
                };
            default:
                return baseRecord;
        }
    }

    private generateMockPMAPIResponse(platform: string, method: string, endpoint: string, data?: any): any {
        switch (endpoint) {
            case '/workspaces':
                return {
                    success: true,
                    data: {
                        workspaces: [{
                            id: `workspace_${platform}`,
                            name: `Construction Workspace (${platform})`,
                            projects: Math.floor(Math.random() * 20) + 5
                        }]
                    }
                };
            default:
                return { success: true, data: data || null };
        }
    }

    // Local record management
    private findExistingPMRecord(externalId: string, recordType: string): PMRecord | null {
        return this.syncQueue.find(record => 
            record.externalId === externalId && 
            record.type === recordType as any
        ) || null;
    }

    private async createLocalProject(projectData: any, platform: string): Promise<void> {
        const record: PMRecord = {
            id: `local_project_${Date.now()}`,
            type: 'project',
            externalId: projectData.id,
            platform,
            data: projectData,
            lastSynced: new Date(),
            syncStatus: 'synced',
            dependencies: []
        };
        this.syncQueue.push(record);
    }

    private async updateLocalProject(existingRecord: PMRecord, projectData: any): Promise<void> {
        existingRecord.data = { ...existingRecord.data, ...projectData };
        existingRecord.lastSynced = new Date();
        existingRecord.syncStatus = 'synced';
    }

    private async createLocalTask(taskData: any, platform: string): Promise<void> {
        const record: PMRecord = {
            id: `local_task_${Date.now()}`,
            type: 'task',
            externalId: taskData.id,
            platform,
            data: taskData,
            lastSynced: new Date(),
            syncStatus: 'synced',
            parentId: taskData.projectId,
            dependencies: taskData.dependencies || []
        };
        this.syncQueue.push(record);
    }

    private async updateLocalTask(existingRecord: PMRecord, taskData: any): Promise<void> {
        existingRecord.data = { ...existingRecord.data, ...taskData };
        existingRecord.dependencies = taskData.dependencies || existingRecord.dependencies;
        existingRecord.lastSynced = new Date();
        existingRecord.syncStatus = 'synced';
    }

    // Push data to PM platforms
    async pushProjectToPlatform(platform: string, projectData: Project): Promise<{ success: boolean; externalId?: string; error?: string }> {
        try {
            const config = this.configs.get(platform);
            if (!config || !config.enabled) {
                throw new Error(`Platform ${platform} is not enabled`);
            }

            const transformedProject = this.transformProjectForPlatform(projectData, platform);
            const response = await this.simulateAPICall(platform, 'POST', '/projects', transformedProject);
            
            const record: PMRecord = {
                id: `sync_project_${Date.now()}`,
                type: 'project',
                externalId: response.data?.id || `external_proj_${Date.now()}`,
                platform,
                data: transformedProject,
                lastSynced: new Date(),
                syncStatus: 'synced',
                localId: projectData.id,
                dependencies: []
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

    async pushTaskToPlatform(platform: string, taskData: Task): Promise<{ success: boolean; externalId?: string; error?: string }> {
        try {
            const config = this.configs.get(platform);
            if (!config || !config.enabled) {
                throw new Error(`Platform ${platform} is not enabled`);
            }

            const transformedTask = this.transformTaskForPlatform(taskData, platform);
            const response = await this.simulateAPICall(platform, 'POST', '/tasks', transformedTask);
            
            const record: PMRecord = {
                id: `sync_task_${Date.now()}`,
                type: 'task',
                externalId: response.data?.id || `external_task_${Date.now()}`,
                platform,
                data: transformedTask,
                lastSynced: new Date(),
                syncStatus: 'synced',
                localId: taskData.id,
                parentId: taskData.projectId,
                dependencies: []
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

    // Data transformation for different platforms
    private transformProjectForPlatform(project: Project, platform: string): any {
        const base = {
            name: project.name,
            description: project.description,
            startDate: project.startDate,
            endDate: project.endDate,
            status: project.status
        };

        switch (platform) {
            case 'asana':
                return {
                    ...base,
                    notes: project.description,
                    due_on: project.endDate,
                    color: 'light-green',
                    team: 'construction_team'
                };
            case 'monday':
                return {
                    ...base,
                    board_id: 'construction_board',
                    group_id: 'active_projects',
                    column_values: JSON.stringify({
                        status: { label: project.status },
                        date: { date: project.endDate },
                        text: project.description
                    })
                };
            case 'jira':
                return {
                    ...base,
                    key: `CONST-${Date.now()}`,
                    projectTypeKey: 'business',
                    projectTemplateKey: 'com.atlassian.jira-core-project-templates:jira-core-project-management',
                    leadAccountId: 'project_manager'
                };
            default:
                return base;
        }
    }

    private transformTaskForPlatform(task: Task, platform: string): any {
        const config = this.configs.get(platform);
        const base = {
            name: task.title,
            description: task.description,
            dueDate: task.dueDate,
            assignee: task.assignedTo,
            priority: task.priority
        };

        switch (platform) {
            case 'asana':
                return {
                    ...base,
                    notes: task.description,
                    due_on: task.dueDate,
                    assignee: task.assignedTo,
                    projects: [task.projectId],
                    tags: task.tags || []
                };
            case 'monday':
                return {
                    ...base,
                    board_id: 'tasks_board',
                    group_id: 'active_tasks',
                    column_values: JSON.stringify({
                        status: { label: config?.syncSettings.statusMapping[task.status] || task.status },
                        person: { personsAndTeams: [{ id: task.assignedTo }] },
                        date: { date: task.dueDate },
                        priority: { label: config?.syncSettings.priorityMapping[task.priority] || task.priority }
                    })
                };
            case 'jira':
                return {
                    fields: {
                        summary: task.title,
                        description: task.description,
                        issuetype: { name: 'Task' },
                        project: { key: task.projectId },
                        assignee: { accountId: task.assignedTo },
                        priority: { name: config?.syncSettings.priorityMapping[task.priority] || task.priority },
                        duedate: task.dueDate
                    }
                };
            default:
                return base;
        }
    }

    // Template Management
    createProjectFromTemplate(templateId: string, projectData: Partial<Project>): {
        project: any;
        tasks: any[];
        milestones: any[];
    } {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) {
            throw new Error(`Template ${templateId} not found`);
        }

        const project = {
            id: `project_${Date.now()}`,
            name: projectData.name || 'New Project',
            description: projectData.description || template.description,
            startDate: projectData.startDate || new Date(),
            endDate: projectData.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            status: 'Planning',
            customFields: template.customFields.reduce((acc, field) => {
                acc[field.name] = field.defaultValue;
                return acc;
            }, {} as Record<string, any>)
        };

        const tasks = template.taskTemplates.map((taskTemplate, index) => ({
            id: `task_${Date.now()}_${index}`,
            projectId: project.id,
            title: taskTemplate.name,
            description: taskTemplate.description,
            estimatedHours: taskTemplate.estimatedHours,
            priority: taskTemplate.priority,
            status: 'Not Started',
            dependencies: taskTemplate.dependencies,
            customFields: taskTemplate.customFields
        }));

        const milestones = template.milestoneTemplates.map((milestoneTemplate, index) => ({
            id: `milestone_${Date.now()}_${index}`,
            projectId: project.id,
            name: milestoneTemplate.name,
            description: milestoneTemplate.description,
            date: new Date(project.startDate.getTime() + milestoneTemplate.daysFromStart * 24 * 60 * 60 * 1000),
            deliverables: milestoneTemplate.deliverables,
            status: 'upcoming'
        }));

        return { project, tasks, milestones };
    }

    getTemplates(): ProjectTemplate[] {
        return this.templates;
    }

    // Resource Management
    allocateResource(allocation: Omit<ResourceAllocation, 'id'>): string {
        const newAllocation: ResourceAllocation = {
            ...allocation,
            projectId: allocation.projectId,
            userId: allocation.userId,
            role: allocation.role,
            allocation: allocation.allocation,
            startDate: allocation.startDate,
            endDate: allocation.endDate,
            skills: allocation.skills || []
        };

        this.resourceAllocations.push(newAllocation);
        this.saveStoredData();

        return `allocation_${Date.now()}`;
    }

    getResourceAllocations(projectId?: string): ResourceAllocation[] {
        return projectId 
            ? this.resourceAllocations.filter(ra => ra.projectId === projectId)
            : this.resourceAllocations;
    }

    // Timeline Management
    generateProjectTimeline(projectId: string, tasks: Task[]): ProjectTimeline {
        const sortedTasks = this.sortTasksByDependencies(tasks);
        const ganttData: GanttTask[] = sortedTasks.map(task => ({
            id: task.id,
            name: task.title,
            startDate: new Date(task.createdAt),
            endDate: new Date(task.dueDate),
            progress: this.calculateTaskProgress(task),
            dependencies: task.dependencies || [],
            assignees: task.assignedTo ? [task.assignedTo] : [],
            isCritical: this.isTaskOnCriticalPath(task.id, tasks)
        }));

        const timeline: ProjectTimeline = {
            projectId,
            startDate: new Date(Math.min(...ganttData.map(t => t.startDate.getTime()))),
            endDate: new Date(Math.max(...ganttData.map(t => t.endDate.getTime()))),
            milestones: this.generateMilestones(projectId, ganttData),
            criticalPath: this.calculateCriticalPath(ganttData),
            ganttData,
            bufferTime: 7 // 7 days buffer
        };

        // Store timeline
        const existingIndex = this.timelines.findIndex(t => t.projectId === projectId);
        if (existingIndex >= 0) {
            this.timelines[existingIndex] = timeline;
        } else {
            this.timelines.push(timeline);
        }
        
        this.saveStoredData();
        return timeline;
    }

    private sortTasksByDependencies(tasks: Task[]): Task[] {
        const sorted: Task[] = [];
        const visited = new Set<string>();
        
        const visit = (task: Task) => {
            if (visited.has(task.id)) return;
            
            // Visit dependencies first
            if (task.dependencies) {
                for (const depId of task.dependencies) {
                    const depTask = tasks.find(t => t.id === depId);
                    if (depTask && !visited.has(depId)) {
                        visit(depTask);
                    }
                }
            }
            
            visited.add(task.id);
            sorted.push(task);
        };

        tasks.forEach(task => visit(task));
        return sorted;
    }

    private calculateTaskProgress(task: Task): number {
        // Mock progress calculation based on task status
        const statusProgress: Record<string, number> = {
            'Not Started': 0,
            'In Progress': 50,
            'Completed': 100,
            'On Hold': 25
        };
        return statusProgress[task.status] || 0;
    }

    private isTaskOnCriticalPath(taskId: string, tasks: Task[]): boolean {
        // Simplified critical path detection
        const task = tasks.find(t => t.id === taskId);
        if (!task) return false;
        
        const dependentTasks = tasks.filter(t => t.dependencies?.includes(taskId));
        return dependentTasks.length > 0 && task.priority === 'High';
    }

    private generateMilestones(projectId: string, ganttData: GanttTask[]): TimelineMilestone[] {
        // Generate milestones based on project phases
        const phases = ['Planning', 'Construction', 'Completion'];
        return phases.map((phase, index) => ({
            id: `milestone_${projectId}_${index}`,
            name: `${phase} Phase Complete`,
            date: new Date(ganttData[0].startDate.getTime() + (index + 1) * 30 * 24 * 60 * 60 * 1000),
            deliverables: [`${phase} deliverables`],
            status: 'upcoming' as const
        }));
    }

    private calculateCriticalPath(ganttData: GanttTask[]): string[] {
        // Return tasks on critical path (simplified)
        return ganttData
            .filter(task => task.isCritical)
            .map(task => task.id);
    }

    getProjectTimeline(projectId: string): ProjectTimeline | null {
        return this.timelines.find(t => t.projectId === projectId) || null;
    }

    // Analytics and Utilities
    getSyncStats(platform?: string): {
        totalRecords: number;
        lastSyncTime: Date | null;
        pendingRecords: number;
        errorCount: number;
        byType: Record<string, number>;
        dataTransferred: number;
    } {
        const relevantRecords = platform 
            ? this.syncQueue.filter(r => r.platform === platform)
            : this.syncQueue;

        const config = platform ? this.configs.get(platform) : null;
        
        const byType = relevantRecords.reduce((acc, record) => {
            acc[record.type] = (acc[record.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            totalRecords: relevantRecords.length,
            lastSyncTime: config?.lastSync || null,
            pendingRecords: relevantRecords.filter(r => r.syncStatus === 'pending').length,
            errorCount: relevantRecords.filter(r => r.syncStatus === 'error').length,
            byType,
            dataTransferred: relevantRecords.reduce((sum, record) => 
                sum + JSON.stringify(record.data).length, 0
            )
        };
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
export const projectManagementIntegrationService = new ProjectManagementIntegrationService();