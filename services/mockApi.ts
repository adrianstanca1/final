// A mock API using localStorage to simulate a backend.
// Supports offline queuing for write operations.

import { initialData } from './mockData';
import { apiCache, cacheKeys } from './cacheService';
import { ValidationService, securityValidation } from './validationService';
import { notificationService } from './notificationService';
import {
    User,
    Company,
    Project,
    ProjectPortfolioSummary,
    Task,
    TimeEntry,
    SafetyIncident,
    Equipment,
    Client,
    Invoice,
    Expense,
    Notification,
    LoginCredentials,
    RegisterCredentials,
    TaskStatus,
    TaskPriority,
    TimeEntryStatus,
    IncidentSeverity,
    SiteUpdate,
    ProjectMessage,
    Weather,
    InvoiceStatus,
    Quote,
    FinancialKPIs,
    MonthlyFinancials,
    CostBreakdown,
    Role,
    TimesheetStatus,
    IncidentStatus,
    AuditLog,
    ResourceAssignment,
    Conversation,
    Message,
    CompanySettings,
    ProjectAssignment,
    ProjectTemplate,
    ProjectInsight,
    FinancialForecast,
    WhiteboardNote,
    BidPackage,
    RiskAnalysis,
    Grant,
    Timesheet,
    Todo,
    InvoiceLineItem,
    Document,
    UsageMetric,
    CompanyType,
    ExpenseStatus,
    TodoStatus,
    TodoPriority,
    OperationalAlert,
    OperationalInsights,
} from '../types';
import { computeProjectPortfolioSummary } from '../utils/projectPortfolio';
import { getInvoiceFinancials } from '../utils/finance';
const delay = (ms = 50) => new Promise(res => setTimeout(res, ms));

type RequestOptions = { signal?: AbortSignal };
type ProjectSummaryOptions = RequestOptions & { projectIds?: string[] };

const ensureNotAborted = (signal?: AbortSignal) => {
    if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }
};

// Removed duplicate delay function - already exists elsewhere

// Enhanced API with caching, validation, and rate limiting
const withCache = <T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> => {
    const cached = apiCache.get<T>(key);
    if (cached) return Promise.resolve(cached);

    return fetcher().then(result => {
        apiCache.set(key, result, ttl);
        return result;
    });
};

const withValidation = <T>(data: Partial<T>, rules: any[]): T => {
    const result = ValidationService.validate(data, rules);
    if (!result.isValid) {
        throw new Error(`Validation failed: ${Object.values(result.errors).flat().join(', ')}`);
    }
    return result.sanitizedData as T;
};

const withRateLimit = (key: string, limit: number = 100, windowMs: number = 60000): void => {
    if (!securityValidation.checkRateLimit(key, limit, windowMs)) {
        throw new Error('Rate limit exceeded. Please try again later.');
    }
};

const withSecurity = (input: string): void => {
    if (securityValidation.checkSqlInjection(input)) {
        throw new Error('Invalid input detected');
    }
    if (securityValidation.checkXss(input)) {
        throw new Error('Invalid input detected');
    }
};

const JWT_SECRET = 'your-super-secret-key-for-mock-jwt';
const MOCK_ACCESS_TOKEN_LIFESPAN = 15 * 60 * 1000; // 15 minutes
const MOCK_REFRESH_TOKEN_LIFESPAN = 7 * 24 * 60 * 60 * 1000; // 7 days
const MOCK_RESET_TOKEN_LIFESPAN = 60 * 60 * 1000; // 1 hour

// In-memory store for password reset tokens for this mock implementation
const passwordResetTokens = new Map<string, { userId: string, expires: number }>();

const encodeBase64 = (value: string): string => {
    if (typeof btoa === 'function') {
        return btoa(value);
    }
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(value, 'binary').toString('base64');
    }
    throw new Error('Base64 encoding is not supported in this environment.');
};

const decodeBase64 = (value: string): string => {
    if (typeof atob === 'function') {
        return atob(value);
    }
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(value, 'base64').toString('binary');
    }
    throw new Error('Base64 decoding is not supported in this environment.');
};

const createToken = (payload: object, expiresIn: number): string => {
    const header = { alg: 'HS256', typ: 'JWT' };
    const extendedPayload = { ...payload, iat: Date.now(), exp: Math.floor((Date.now() + expiresIn) / 1000) };
    const encodedHeader = encodeBase64(JSON.stringify(header));
    const encodedPayload = encodeBase64(JSON.stringify(extendedPayload));
    const signature = encodeBase64(JWT_SECRET);
    return `${encodedHeader}.${encodedPayload}.${signature}`;
};

/**
 * Decodes a token and validates its expiration.
 * @param token The JWT to decode.
 * @returns The decoded payload if the token is valid and not expired, otherwise null.
 */
const decodeToken = (token: string): any => {
    try {
        const payload = JSON.parse(decodeBase64(token.split('.')[1]));
        // This check ensures the token has not expired.
        if (payload.exp * 1000 < Date.now()) {
            throw new Error("Token expired");
        }
        return payload;
    } catch (e) {
        console.error("Token decode/validation failed:", e);
        return null;
    }
};

const safeNumber = (value: unknown): number => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number(value.trim());
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return 0;
};

const parseDate = (value: unknown): Date | null => {
    if (!value) {
        return null;
    }
    const parsed = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getMonthKey = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const getMonthLabel = (date: Date): string =>
    date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

const MILLISECONDS_PER_HOUR = 1000 * 60 * 60;
const MILLISECONDS_PER_DAY = MILLISECONDS_PER_HOUR * 24;

const hydrateData = <T extends { [key: string]: any }>(key: string, defaultData: T[]): T[] => {
    try {
        const stored = localStorage.getItem(`asagents_${key}`);
        if (stored) return JSON.parse(stored);
    } catch (e) {
        console.error(`Failed to hydrate ${key} from localStorage`, e);
    }
    localStorage.setItem(`asagents_${key}`, JSON.stringify(defaultData));
    return defaultData;
};

let db: {
    companies: Partial<Company>[];
    users: Partial<User>[];
    projects: Partial<Project>[];
    todos: Partial<Task>[];
    timeEntries: Partial<TimeEntry>[];
    safetyIncidents: Partial<SafetyIncident>[];
    equipment: Partial<Equipment>[];
    clients: Partial<Client>[];
    invoices: Partial<Invoice>[];
    expenses: Partial<Expense>[];
    siteUpdates: Partial<SiteUpdate>[];
    projectMessages: Partial<ProjectMessage>[];
    notifications: Partial<Notification>[];
    quotes: Partial<Quote>[];
    auditLogs: Partial<AuditLog>[];
    resourceAssignments: Partial<ResourceAssignment>[];
    conversations: Partial<Conversation>[];
    messages: Partial<Message>[];
    projectAssignments: Partial<ProjectAssignment>[];
    projectTemplates: Partial<ProjectTemplate>[];
    whiteboardNotes: Partial<WhiteboardNote>[];
    documents: Partial<Document>[];
    projectInsights: Partial<ProjectInsight>[];
    financialForecasts: Partial<FinancialForecast>[];
} = {
    companies: hydrateData('companies', initialData.companies),
    users: hydrateData('users', initialData.users),
    projects: hydrateData('projects', initialData.projects),
    todos: hydrateData('todos', initialData.todos),
    timeEntries: hydrateData('timeEntries', initialData.timeEntries),
    safetyIncidents: hydrateData('safetyIncidents', initialData.safetyIncidents),
    equipment: hydrateData('equipment', initialData.equipment),
    clients: hydrateData('clients', initialData.clients),
    invoices: hydrateData('invoices', initialData.invoices),
    expenses: hydrateData('expenses', initialData.expenses),
    siteUpdates: hydrateData('siteUpdates', initialData.siteUpdates),
    projectMessages: hydrateData('projectMessages', initialData.projectMessages),
    notifications: hydrateData('notifications', (initialData as any).notifications || []),
    quotes: hydrateData('quotes', (initialData as any).quotes || []),
    auditLogs: hydrateData('auditLogs', []),
    resourceAssignments: hydrateData('resourceAssignments', []),
    conversations: hydrateData('conversations', []),
    messages: hydrateData('messages', []),
    projectAssignments: hydrateData('projectAssignments', []),
    projectTemplates: hydrateData('projectTemplates', []),
    whiteboardNotes: hydrateData('whiteboardNotes', []),
    documents: hydrateData('documents', []),
    projectInsights: hydrateData('projectInsights', (initialData as any).projectInsights || []),
    financialForecasts: hydrateData('financialForecasts', (initialData as any).financialForecasts || []),
};

const findProjectById = (projectId: unknown): Partial<Project> | undefined => {
    if (projectId == null) {
        return undefined;
    }
    return db.projects.find(project => project.id != null && String(project.id) === String(projectId));
};

const resolveCompanyIdFromProject = (projectId: unknown): string | null => {
    const project = findProjectById(projectId);
    return project?.companyId != null ? String(project.companyId) : null;
};

const resolveCompanyIdFromUser = (userId: unknown): string | null => {
    if (userId == null) {
        return null;
    }
    const user = db.users.find(candidate => candidate.id != null && String(candidate.id) === String(userId));
    return user?.companyId != null ? String(user.companyId) : null;
};

const resolveCompanyIdForInvoice = (invoice: Partial<Invoice>): string | null => {
    const directCompany = (invoice as any).companyId;
    if (directCompany != null) {
        return String(directCompany);
    }

    const projectCompany = resolveCompanyIdFromProject(invoice.projectId);
    if (projectCompany) {
        return projectCompany;
    }

    if (invoice.clientId != null) {
        const client = db.clients.find(candidate => candidate.id != null && String(candidate.id) === String(invoice.clientId));
        if (client?.companyId != null) {
            return String(client.companyId);
        }
    }

    return null;
};

const resolveCompanyIdForExpense = (expense: Partial<Expense>): string | null => {
    const directCompany = (expense as any).companyId;
    if (directCompany != null) {
        return String(directCompany);
    }
    const projectCompany = resolveCompanyIdFromProject(expense.projectId);
    if (projectCompany) {
        return projectCompany;
    }
    const userCompany = resolveCompanyIdFromUser(expense.userId);
    if (userCompany) {
        return userCompany;
    }
    return null;
};

const getCompanyCurrency = (companyId: string): string => {
    const company = db.companies.find(entry => entry.id != null && String(entry.id) === String(companyId));
    const directCurrency = (company as any)?.currency;
    if (typeof directCurrency === 'string' && directCurrency.trim().length > 0) {
        return directCurrency;
    }
    const settingsCurrency = (company as any)?.settings?.currency;
    if (typeof settingsCurrency === 'string' && settingsCurrency.trim().length > 0) {
        return settingsCurrency;
    }
    return 'GBP';
};

const saveDb = () => {
    Object.entries(db).forEach(([key, value]) => {
        localStorage.setItem(`asagents_${key}`, JSON.stringify(value));
    });
};

const addAuditLog = (actorId: string, action: string, target?: { type: string, id: string, name: string }) => {
    const newLog: AuditLog = {
        id: String(Date.now() + Math.random()),
        actorId,
        action,
        target,
        timestamp: new Date().toISOString(),
    };
    db.auditLogs.push(newLog);
};

export const authApi = {
    register: async (credentials: Partial<RegisterCredentials & { companyName?: string; companyType?: CompanyType; companyEmail?: string; companyPhone?: string; companyWebsite?: string; companySelection?: 'create' | 'join', role?: Role }>): Promise<any> => {
        await delay();
        if (db.users.some(u => u.email === credentials.email)) {
            throw new Error("An account with this email already exists.");
        }

        let companyId: string;
        let userRole = credentials.role || Role.OPERATIVE;

        if (credentials.companySelection === 'create') {
            const newCompany: Partial<Company> = {
                id: String(Date.now()),
                name: credentials.companyName,
                type: credentials.companyType || 'GENERAL_CONTRACTOR',
                email: credentials.companyEmail,
                phone: credentials.companyPhone,
                website: credentials.companyWebsite,
                status: 'Active',
                subscriptionPlan: 'FREE',
                storageUsageGB: 0,
            };
            db.companies.push(newCompany);
            companyId = newCompany.id!;
            userRole = Role.OWNER;
        } else if (credentials.companySelection === 'join') {
            if (credentials.inviteToken !== 'JOIN-CONSTRUCTCO') {
                 throw new Error("Invalid invite token.");
            }
            companyId = '1';
        } else {
            throw new Error("Invalid company selection.");
        }

        const newUser: Partial<User> = {
            id: String(Date.now()),
            firstName: credentials.firstName,
            lastName: credentials.lastName,
            email: credentials.email,
            password: credentials.password,
            phone: credentials.phone,
            role: userRole,
            companyId,
            isActive: true,
            isEmailVerified: true, // Mocking verification for simplicity
            createdAt: new Date().toISOString(),
        };
        db.users.push(newUser);
        saveDb();

        const user = db.users.find(u => u.id === newUser.id) as User;
        const company = db.companies.find(c => c.id === companyId) as Company;

        const token = createToken({ userId: user.id, companyId: company.id, role: user.role }, MOCK_ACCESS_TOKEN_LIFESPAN);
        const refreshToken = createToken({ userId: user.id }, MOCK_REFRESH_TOKEN_LIFESPAN);
        
        return { success: true, token, refreshToken, user, company };
    },
    login: async (credentials: LoginCredentials): Promise<any> => {
        await delay(200);
        const user = db.users.find(u => u.email === credentials.email && u.password === credentials.password);
        if (!user) {
            throw new Error("Invalid email or password.");
        }
        if (user.mfaEnabled) {
            return { success: true, mfaRequired: true, userId: user.id };
        }
        return authApi.finalizeLogin(user.id as string);
    },
    verifyMfa: async (userId: string, code: string): Promise<any> => {
        await delay(200);
        if (code !== '123456') {
            throw new Error("Invalid MFA code.");
        }
        return authApi.finalizeLogin(userId);
    },
    finalizeLogin: async (userId: string): Promise<any> => {
        await delay();
        const user = db.users.find(u => u.id === userId) as User;
        if (!user) throw new Error("User not found during finalization.");
        const company = db.companies.find(c => c.id === user.companyId) as Company;
        if (!company) throw new Error("Company not found for user.");

        const token = createToken({ userId: user.id, companyId: company.id, role: user.role }, MOCK_ACCESS_TOKEN_LIFESPAN);
        const refreshToken = createToken({ userId: user.id }, MOCK_REFRESH_TOKEN_LIFESPAN);
        
        return { success: true, token, refreshToken, user, company };
    },
    refreshToken: async (refreshToken: string): Promise<{ token: string }> => {
        await delay();
        const decoded = decodeToken(refreshToken);
        if (!decoded) throw new Error("Invalid refresh token");
        const user = db.users.find(u => u.id === decoded.userId);
        if (!user) throw new Error("User not found for refresh token");
        const token = createToken({ userId: user.id, companyId: user.companyId, role: user.role }, MOCK_ACCESS_TOKEN_LIFESPAN);
        return { token };
    },
    /**
     * Gets user and company info from a token.
     * This function validates the token, including its expiration.
     * The client (`AuthContext`) is responsible for catching an expiry error and using the refresh token.
     */
    me: async (token: string): Promise<{ user: User, company: Company }> => {
        await delay();
        const decoded = decodeToken(token);
        if (!decoded) throw new Error("Invalid or expired token");
        const user = db.users.find(u => u.id === decoded.userId) as User;
        const company = db.companies.find(c => c.id === decoded.companyId) as Company;
        if (!user || !company) throw new Error("User or company not found");
        return { user, company };
    },
    requestPasswordReset: async (email: string): Promise<{ success: boolean }> => {
        await delay(300);
        const user = db.users.find(u => u.email === email);
        if (user) {
            const token = `reset-${Date.now()}-${Math.random()}`;
            passwordResetTokens.set(token, { userId: user.id!, expires: Date.now() + MOCK_RESET_TOKEN_LIFESPAN });
            console.log(`Password reset for ${email}. Token: ${token}`); // Simulate sending email
        }
        // Always return success to prevent user enumeration attacks
        return { success: true };
    },
    resetPassword: async (token: string, newPassword: string): Promise<{ success: boolean }> => {
        await delay(300);
        const tokenData = passwordResetTokens.get(token);
        if (!tokenData || tokenData.expires < Date.now()) {
            throw new Error("Invalid or expired password reset token.");
        }
        const userIndex = db.users.findIndex(u => u.id === tokenData.userId);
        if (userIndex === -1) {
            throw new Error("User not found.");
        }
        db.users[userIndex].password = newPassword;
        saveDb();
        passwordResetTokens.delete(token);
        return { success: true };
    },
};

type OfflineAction = { id: number, type: string, payload: any, retries: number, error?: string };
let offlineQueue: OfflineAction[] = JSON.parse(localStorage.getItem('asagents_offline_queue') || '[]');
let failedSyncActions: OfflineAction[] = JSON.parse(localStorage.getItem('asagents_failed_sync_actions') || '[]');

const saveQueues = () => {
    localStorage.setItem('asagents_offline_queue', JSON.stringify(offlineQueue));
    localStorage.setItem('asagents_failed_sync_actions', JSON.stringify(failedSyncActions));
};

const addToOfflineQueue = (type: string, payload: any) => {
    offlineQueue.push({ id: Date.now(), type, payload, retries: 0 });
    saveQueues();
};

export const processOfflineQueue = async () => {
    if (offlineQueue.length === 0) return { successCount: 0, movedToFailedCount: 0 };
    
    let successCount = 0;
    let movedToFailedCount = 0;
    const processingQueue = [...offlineQueue];
    offlineQueue = [];
    
    for (const action of processingQueue) {
        try {
            await delay(100); 
            console.log(`Successfully synced action: ${action.type}`, action.payload);
            successCount++;
        } catch (error) {
            action.retries++;
            action.error = error instanceof Error ? error.message : "Unknown sync error";
            if (action.retries >= 3) {
                failedSyncActions.push(action);
                movedToFailedCount++;
            } else {
                offlineQueue.push(action);
            }
        }
    }
    saveQueues();
    return { successCount, movedToFailedCount };
};

export const getFailedSyncActions = () => [...failedSyncActions];
export const retryFailedAction = async (id: number) => {
    const actionIndex = failedSyncActions.findIndex(a => a.id === id);
    if (actionIndex > -1) {
        const [action] = failedSyncActions.splice(actionIndex, 1);
        action.retries = 0;
        offlineQueue.push(action);
        saveQueues();
        await processOfflineQueue();
    }
};
export const discardFailedAction = (id: number) => {
    failedSyncActions = failedSyncActions.filter(a => a.id !== id);
    saveQueues();
};
export interface FailedActionForUI { id: number; summary: string; error: string; timestamp: string; }
export const formatFailedActionForUI = (action: OfflineAction): FailedActionForUI => ({
    id: action.id,
    summary: `${action.type.replace(/_/g, ' ')}: ${JSON.stringify(action.payload).substring(0, 100)}...`,
    error: action.error || 'Unknown Error',
    timestamp: new Date(action.id).toLocaleString(),
});

export const api = {
    // Company Settings
    getCompanySettings: async (companyId: string): Promise<CompanySettings> => {
        await delay();
        return {
            theme: 'light',
            accessibility: { highContrast: false },
            timeZone: 'GMT',
            dateFormat: 'DD/MM/YYYY',
            currency: 'GBP',
            workingHours: { start: '08:00', end: '17:00', workDays: [1,2,3,4,5] },
            notifications: { email: true, sms: false, push: true },
            backup: { autoBackup: true, frequency: 'weekly', retention: '3months' },
            integrations: { calendarSync: false, emailSync: false },
            companyId
        };
    },

    updateCompanySettings: async (
        companyId: string,
        updates: Partial<CompanySettings>,
        updatedBy: string
    ): Promise<CompanySettings> => {
        await delay();
        const current = await api.getCompanySettings(companyId);
        return { ...current, ...updates };
    },

    // Projects  
    getProjectsByCompany: async (companyId: string, options?: RequestOptions): Promise<Project[]> => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        return db.projects.filter(p => p.companyId === companyId) as Project[];
    },

    getProjectById: async (projectId: string, options?: RequestOptions): Promise<Project | null> => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        const project = db.projects.find(p => p.id === projectId);
        return project ? project as Project : null;
    },

    // Tasks/Todos
    getTodosByProjectIds: async (projectIds: string[], options?: RequestOptions): Promise<Todo[]> => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        return db.todos.filter(t => projectIds.includes(t.projectId!)) as Todo[];
    },

    // Timesheets
    getTimesheetsByCompany: async (companyId: string, userId?: string, options?: RequestOptions): Promise<Timesheet[]> => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        return db.timeEntries.map(te => ({...te, clockIn: new Date(te.clockIn!), clockOut: te.clockOut ? new Date(te.clockOut) : null })) as Timesheet[];
    },

    // Safety
    getSafetyIncidentsByCompany: async (companyId: string, options?: RequestOptions): Promise<SafetyIncident[]> => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        return db.safetyIncidents.filter(incident => resolveCompanyIdFromProject(incident.projectId) === companyId) as SafetyIncident[];
    },

    // Conversations
    getConversationsForUser: async (userId: string, options?: RequestOptions): Promise<Conversation[]> => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        return db.conversations.filter(c => c.participantIds?.includes(userId)) as Conversation[];
    },

    // Notifications
    getNotificationsForUser: async (userId: string, options?: RequestOptions): Promise<Notification[]> => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        return db.notifications.filter(n => n.userId === userId).map(n => ({...n, timestamp: new Date(n.timestamp!)})) as Notification[];
    },

    markNotificationAsRead: async (notificationId: string): Promise<void> => {
        await delay();
        const notification = db.notifications.find(n => n.id === notificationId);
        if (!notification) {
            throw new Error('Notification not found');
        }
        notification.isRead = true;
        notification.read = true;
        saveDb();
    },

    markAllNotificationsAsRead: async (userId: string): Promise<void> => {
        await delay();
        db.notifications.forEach(n => {
            if (n.userId === userId) { n.isRead = true; n.read = true; }
        });
        saveDb();
    },

    // Additional methods that are needed
    getUsersByCompany: async (companyId: string, options?: RequestOptions): Promise<User[]> => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        return db.users.filter(u => u.companyId === companyId) as User[];
    },

    getEquipmentByCompany: async (companyId: string, options?: RequestOptions): Promise<Equipment[]> => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        return db.equipment.filter(e => e.companyId === companyId) as Equipment[];
    },

    getDocumentsByCompany: async (companyId: string, options?: RequestOptions): Promise<Document[]> => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        return db.documents as Document[];
    },

    features: { 
        projectManagement: true, 
        timeTracking: true, 
        financials: true, 
        documents: true, 
        safety: true, 
        equipment: true, 
        reporting: true 
    }
};
