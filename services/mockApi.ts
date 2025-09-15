// A mock API using localStorage to simulate a backend.
// Supports offline queuing for write operations.

import { initialData } from './mockData';
import { User, Company, Project, Task, TimeEntry, SafetyIncident, Equipment, Client, Invoice, Expense, Notification, LoginCredentials, RegisterCredentials, TaskStatus, TaskPriority, TimeEntryStatus, IncidentSeverity, SiteUpdate, ProjectMessage, Weather, InvoiceStatus, Quote, FinancialKPIs, MonthlyFinancials, CostBreakdown, Role, TimesheetStatus, IncidentStatus, AuditLog, ResourceAssignment, Conversation, Message, CompanySettings, ProjectAssignment, ProjectTemplate, WhiteboardNote, BidPackage, RiskAnalysis, Grant, Timesheet, Todo, InvoiceLineItem, Document, UsageMetric, CompanyType, ExpenseStatus, TodoStatus, TodoPriority } from '../types';

const delay = (ms = 50) => new Promise(res => setTimeout(res, ms));

const JWT_SECRET = 'your-super-secret-key-for-mock-jwt';
const MOCK_ACCESS_TOKEN_LIFESPAN = 15 * 60 * 1000; // 15 minutes
const MOCK_REFRESH_TOKEN_LIFESPAN = 7 * 24 * 60 * 60 * 1000; // 7 days

const createToken = (payload: object, expiresIn: number): string => {
    const header = { alg: 'HS256', typ: 'JWT' };
    const extendedPayload = { ...payload, iat: Date.now(), exp: Math.floor((Date.now() + expiresIn) / 1000) };
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(extendedPayload));
    const signature = btoa(JWT_SECRET);
    return `${encodedHeader}.${encodedPayload}.${signature}`;
};

const decodeToken = (token: string): any => {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
            throw new Error("Token expired");
        }
        return payload;
    } catch (e) {
        return null;
    }
};

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
    register: async (credentials: Partial<RegisterCredentials & { companyName?: string; companyType?: CompanyType; companySelection?: 'create' | 'join', role?: Role }>): Promise<any> => {
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
    me: async (token: string): Promise<{ user: User, company: Company }> => {
        await delay();
        const decoded = decodeToken(token);
        if (!decoded) throw new Error("Invalid token");
        const user = db.users.find(u => u.id === decoded.userId) as User;
        const company = db.companies.find(c => c.id === decoded.companyId) as Company;
        if (!user || !company) throw new Error("User or company not found");
        return { user, company };
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
    getCompanySettings: async (companyId: string): Promise<CompanySettings> => {
        await delay();
        return {
            theme: 'light',
            accessibility: { highContrast: false },
            timeZone: 'GMT',
            dateFormat: 'DD/MM/YYYY',
            currency: 'GBP',
            workingHours: { start: '08:00', end: '17:00', workDays: [1,2,3,4,5] },
            features: { projectManagement: true, timeTracking: true, financials: true, documents: true, safety: true, equipment: true, reporting: true },
        };
    },
    getTimesheetsByCompany: async (companyId: string, userId?: string): Promise<Timesheet[]> => {
        await delay();
        return db.timeEntries.map(te => ({...te, clockIn: new Date(te.clockIn!), clockOut: te.clockOut ? new Date(te.clockOut) : null })) as Timesheet[];
    },
    getSafetyIncidentsByCompany: async (companyId: string): Promise<SafetyIncident[]> => {
        await delay();
        return db.safetyIncidents as SafetyIncident[];
    },
    getConversationsForUser: async (userId: string): Promise<Conversation[]> => {
        await delay();
        return db.conversations.filter(c => c.participantIds?.includes(userId)) as Conversation[];
    },
    getNotificationsForUser: async (userId: string): Promise<Notification[]> => {
        await delay();
        return db.notifications.filter(n => n.userId === userId).map(n => ({...n, timestamp: new Date(n.timestamp!)})) as Notification[];
    },
    markAllNotificationsAsRead: async (userId: string): Promise<void> => {
        await delay();
        db.notifications.forEach(n => {
            if (n.userId === userId) { n.isRead = true; n.read = true; }
        });
        saveDb();
    },
    getProjectsByManager: async (managerId: string): Promise<Project[]> => {
        await delay();
        return db.projects.filter(p => (p as any).managerId === managerId) as Project[];
    },
    getUsersByCompany: async (companyId: string): Promise<User[]> => {
        await delay();
        return db.users.filter(u => u.companyId === companyId) as User[];
    },
    getEquipmentByCompany: async (companyId: string): Promise<Equipment[]> => {
        await delay();
        return db.equipment.filter(e => e.companyId === companyId) as Equipment[];
    },
    getResourceAssignments: async (companyId: string): Promise<ResourceAssignment[]> => {
        await delay();
        return db.resourceAssignments as ResourceAssignment[];
    },
    getAuditLogsByCompany: async (companyId: string): Promise<AuditLog[]> => {
        await delay();
        return db.auditLogs as AuditLog[];
    },
    getTodosByProjectIds: async (projectIds: string[]): Promise<Todo[]> => {
        await delay();
        const idSet = new Set(projectIds);
        return db.todos.filter(t => idSet.has(t.projectId!)) as Todo[];
    },
    getDocumentsByProject: async (projectId: string): Promise<Document[]> => {
        await delay();
        return db.documents.filter(d => d.projectId === projectId) as Document[];
    },
    getUsersByProject: async (projectId: string): Promise<User[]> => {
        await delay();
        const assignments = db.projectAssignments.filter(pa => pa.projectId === projectId);
        const userIds = new Set(assignments.map(a => a.userId));
        return db.users.filter(u => userIds.has(u.id!)) as User[];
    },
    getExpensesByCompany: async (companyId: string): Promise<Expense[]> => {
        await delay();
        const projectIds = new Set(db.projects.filter(p => p.companyId === companyId).map(p => p.id));
        return db.expenses.filter(e => projectIds.has(e.projectId!)) as Expense[];
    },
    updateTodo: async (todoId: string, updates: Partial<Todo>, userId: string): Promise<Todo> => {
        await delay();
        const todoIndex = db.todos.findIndex(t => t.id === todoId);
        if (todoIndex === -1) throw new Error("Todo not found");
        db.todos[todoIndex] = { ...db.todos[todoIndex], ...updates, updatedAt: new Date().toISOString() };
        saveDb();
        return db.todos[todoIndex] as Todo;
    },
    getProjectsByUser: async (userId: string): Promise<Project[]> => {
        await delay();
        const assignments = db.projectAssignments.filter(pa => pa.userId === userId);
        const projectIds = new Set(assignments.map(a => a.projectId));
        return db.projects.filter(p => projectIds.has(p.id!)) as Project[];
    },
    updateEquipment: async (equipmentId: string, updates: Partial<Equipment>, userId: string): Promise<Equipment> => {
        await delay();
        const index = db.equipment.findIndex(e => e.id === equipmentId);
        if (index === -1) throw new Error("Equipment not found");
        db.equipment[index] = { ...db.equipment[index], ...updates };
        saveDb();
        return db.equipment[index] as Equipment;
    },
    createEquipment: async (data: Partial<Equipment>, userId: string): Promise<Equipment> => {
        await delay();
        const newEquipment: Partial<Equipment> = { ...data, id: String(Date.now()), companyId: db.users.find(u=>u.id===userId)?.companyId };
        db.equipment.push(newEquipment);
        saveDb();
        return newEquipment as Equipment;
    },
    createResourceAssignment: async (data: any, userId: string): Promise<ResourceAssignment> => {
        const newAssignment = { ...data, id: String(Date.now()) };
        db.resourceAssignments.push(newAssignment);
        saveDb();
        return newAssignment;
    },
    updateResourceAssignment: async (id: string, data: any, userId: string): Promise<ResourceAssignment> => {
        const index = db.resourceAssignments.findIndex(a => a.id === id);
        db.resourceAssignments[index] = { ...db.resourceAssignments[index], ...data };
        saveDb();
        return db.resourceAssignments[index] as ResourceAssignment;
    },
    deleteResourceAssignment: async (id: string, userId: string): Promise<void> => {
        db.resourceAssignments = db.resourceAssignments.filter(a => a.id !== id);
        saveDb();
    },
    uploadDocument: async (data: any, userId: string): Promise<Document> => {
        const newDoc = { ...data, id: String(Date.now()), uploadedBy: userId, version: 1, uploadedAt: new Date().toISOString() };
        db.documents.push(newDoc);
        saveDb();
        return newDoc as Document;
    },
    getDocumentsByCompany: async (companyId: string): Promise<Document[]> => {
        return db.documents as Document[];
    },
    getProjectsByCompany: async (companyId: string): Promise<Project[]> => {
        return db.projects.filter(p => p.companyId === companyId) as Project[];
    },
    findGrants: async (keywords: string, location: string): Promise<Grant[]> => {
        await delay(1000);
        return [{ id: 'g1', name: 'Green Retrofit Grant', agency: 'Gov UK', amount: '£50,000', description: 'For sustainable energy retrofits.', url: '#' }];
    },
    analyzeForRisks: async (text: string): Promise<RiskAnalysis> => {
        await delay(1000);
        return { summary: 'Low risk detected.', identifiedRisks: [{ severity: 'Low', description: 'Ambiguous payment terms.', recommendation: 'Clarify payment schedule before signing.' }]};
    },
    generateBidPackage: async (url: string, strengths: string, userId: string): Promise<BidPackage> => {
        await delay(1500);
        return { summary: 'Executive summary...', coverLetter: 'Dear Sir/Madam...', checklist: ['Form A', 'Form B'] };
    },
    generateSafetyAnalysis: async (incidents: SafetyIncident[], projectId: string, userId: string): Promise<{ report: string }> => {
        await delay(1500);
        return { report: `Analysis for project #${projectId}:\n- Common issue: Slips on wet surfaces (${incidents.length} incidents).\n- Recommendation: Increase signage and regular clean-up patrols.` };
    },
    getCompanies: async (): Promise<Company[]> => {
        return db.companies as Company[];
    },
    getPlatformUsageMetrics: async (): Promise<UsageMetric[]> => {
        return [
            { name: 'Active Users (24h)', value: db.users.length - 2, unit: 'users' },
            { name: 'API Calls (24h)', value: 12543, unit: 'calls' },
        ];
    },
    updateTimesheetEntry: async (id: string, data: any, userId: string): Promise<Timesheet> => {
        const index = db.timeEntries.findIndex(t => t.id === id);
        db.timeEntries[index] = { ...db.timeEntries[index], ...data };
        saveDb();
        return db.timeEntries[index] as Timesheet;
    },
    submitTimesheet: async (data: any, userId: string): Promise<Timesheet> => {
        const newTimesheet = { ...data, id: String(Date.now()), status: TimesheetStatus.PENDING };
        db.timeEntries.push(newTimesheet);
        saveDb();
        return newTimesheet as Timesheet;
    },
    updateTimesheetStatus: async (id: string, status: TimesheetStatus, userId: string, reason?: string): Promise<Timesheet> => {
        const index = db.timeEntries.findIndex(t => t.id === id);
        db.timeEntries[index]!.status = status;
        if (reason) (db.timeEntries[index] as any).rejectionReason = reason;
        saveDb();
        return db.timeEntries[index] as Timesheet;
    },
    generateDailySummary: async (projectId: string, date: Date, userId: string): Promise<string> => {
        await delay(1000);
        return `Summary for ${date.toDateString()}:\n- Task A completed.\n- Task B in progress.`;
    },
    getFinancialKPIsForCompany: async (companyId: string): Promise<FinancialKPIs> => { return { profitability: 15, projectMargin: 22, cashFlow: 120000, currency: 'GBP' } },
    getMonthlyFinancials: async (companyId: string): Promise<MonthlyFinancials[]> => { return [{month: 'Jan', revenue: 50000, profit: 8000}, {month: 'Feb', revenue: 75000, profit: 12000}] },
    getCostBreakdown: async (companyId: string): Promise<CostBreakdown[]> => { return [{category: 'Labor', amount: 40000}, {category: 'Materials', amount: 30000}] },
    getInvoicesByCompany: async (companyId: string): Promise<Invoice[]> => { return db.invoices as Invoice[] },
    getQuotesByCompany: async (companyId: string): Promise<Quote[]> => { return db.quotes as Quote[] },
    getClientsByCompany: async (companyId: string): Promise<Client[]> => { return db.clients as Client[] },
    updateClient: async (id:string, data:any, userId:string): Promise<Client> => {
        const index = db.clients.findIndex(c=>c.id === id);
        db.clients[index] = {...db.clients[index], ...data};
        saveDb();
        return db.clients[index] as Client;
    },
    createClient: async (data:any, userId:string): Promise<Client> => {
        const newClient = {...data, id: String(Date.now()), companyId: db.users.find(u=>u.id===userId)!.companyId};
        db.clients.push(newClient);
        saveDb();
        return newClient as Client;
    },
    updateInvoice: async (id: string, data: any, userId: string): Promise<Invoice> => {
        await delay();
        const index = db.invoices.findIndex(i => i.id === id);
        if (index === -1) throw new Error("Invoice not found");
        const oldStatus = db.invoices[index]?.status;
        db.invoices[index] = { ...db.invoices[index], ...data };
        if (oldStatus !== data.status) {
            addAuditLog(userId, `UPDATE_INVOICE_STATUS: ${oldStatus} -> ${data.status}`, { type: 'Invoice', id: id, name: data.invoiceNumber });
        } else {
            addAuditLog(userId, 'UPDATE_INVOICE', { type: 'Invoice', id: id, name: data.invoiceNumber });
        }
        saveDb();
        return db.invoices[index] as Invoice;
    },
    createInvoice: async (data: any, userId: string): Promise<Invoice> => {
        await delay();
        const companyId = db.users.find(u => u.id === userId)?.companyId;
        const newInvoice = { ...data, id: String(Date.now()), companyId };
        db.invoices.push(newInvoice);
        addAuditLog(userId, 'CREATE_INVOICE', { type: 'Invoice', id: newInvoice.id, name: newInvoice.invoiceNumber });
        saveDb();
        return newInvoice as Invoice;
    },
    recordPaymentForInvoice: async (id: string, data: any, userId: string): Promise<Invoice> => {
        await delay();
        const index = db.invoices.findIndex(i => i.id === id);
        if (index === -1) throw new Error("Invoice not found");
        const inv = db.invoices[index]!;
        if (!inv.payments) inv.payments = [];
        const newPayment = { ...data, id: String(Date.now()), createdBy: userId, date: new Date().toISOString(), invoiceId: id };
        inv.payments.push(newPayment);
        inv.amountPaid = (inv.amountPaid || 0) + data.amount;
        const balance = (inv.total || 0) - (inv.amountPaid || 0);
        inv.balance = balance;

        if (balance <= 0 && inv.status !== InvoiceStatus.CANCELLED) {
            inv.status = InvoiceStatus.PAID;
            addAuditLog(userId, `RECORD_PAYMENT (amount: ${data.amount})`, { type: 'Invoice', id: id, name: inv.invoiceNumber });
            addAuditLog(userId, `UPDATE_INVOICE_STATUS: ${InvoiceStatus.SENT} -> ${InvoiceStatus.PAID}`, { type: 'Invoice', id: id, name: inv.invoiceNumber });
        } else {
            addAuditLog(userId, `RECORD_PAYMENT (amount: ${data.amount})`, { type: 'Invoice', id: id, name: inv.invoiceNumber });
        }
        saveDb();
        return inv as Invoice;
    },
    submitExpense: async (data:any, userId:string): Promise<Expense> => {
        const newExpense = {...data, id: String(Date.now()), userId, status: ExpenseStatus.PENDING, submittedAt: new Date().toISOString()};
        db.expenses.push(newExpense);
        saveDb();
        return newExpense as Expense;
    },
    updateExpense: async (id:string, data:any, userId:string): Promise<Expense> => {
        const index = db.expenses.findIndex(e=>e.id === id);
        db.expenses[index] = {...db.expenses[index], ...data, status: ExpenseStatus.PENDING};
        saveDb();
        return db.expenses[index] as Expense;
    },
    clockIn: async (projectId: string, userId: string): Promise<Timesheet> => {
        const newEntry = { id: String(Date.now()), userId, projectId, clockIn: new Date(), clockOut: null, status: TimesheetStatus.DRAFT };
        db.timeEntries.push(newEntry);
        saveDb();
        return newEntry as Timesheet;
    },
    clockOut: async (userId: string): Promise<Timesheet> => {
        const entry = db.timeEntries.find(t => t.userId === userId && t.clockOut === null);
        if(!entry) throw new Error("Not clocked in");
        entry.clockOut = new Date();
        entry.status = TimesheetStatus.PENDING;
        saveDb();
        return entry as Timesheet;
    },
    getTimesheetsByUser: async (userId: string): Promise<Timesheet[]> => {
        return db.timeEntries.filter(t => t.userId === userId).map(te => ({...te, clockIn: new Date(te.clockIn!), clockOut: te.clockOut ? new Date(te.clockOut) : null })) as Timesheet[];
    },
    createSafetyIncident: async (data: any, userId: string): Promise<SafetyIncident> => {
        const newIncident = { ...data, id: String(Date.now()), reportedById: userId, timestamp: new Date().toISOString(), status: IncidentStatus.REPORTED };
        db.safetyIncidents.push(newIncident);
        saveDb();
        return newIncident as SafetyIncident;
    },
    updateSafetyIncidentStatus: async (id: string, status: IncidentStatus, userId: string): Promise<SafetyIncident> => {
        const index = db.safetyIncidents.findIndex(i => i.id === id);
        db.safetyIncidents[index]!.status = status;
        saveDb();
        return db.safetyIncidents[index] as SafetyIncident;
    },
    createProject: async (data: any, templateId: number | null, userId: string): Promise<Project> => {
        const companyId = db.users.find(u=>u.id===userId)?.companyId;
        const newProject = { ...data, id: String(Date.now()), companyId, status: 'PLANNING', actualCost: 0 };
        db.projects.push(newProject);
        db.projectAssignments.push({ userId, projectId: newProject.id });
        saveDb();
        return newProject as Project;
    },
    updateProject: async (id: string, data: any, userId: string): Promise<Project> => {
        const index = db.projects.findIndex(p => p.id === id);
        db.projects[index] = { ...db.projects[index], ...data };
        saveDb();
        return db.projects[index] as Project;
    },
    getProjectTemplates: async (companyId: string): Promise<ProjectTemplate[]> => {
        return db.projectTemplates as ProjectTemplate[];
    },
    createProjectTemplate: async (data: any, userId: string): Promise<ProjectTemplate> => {
        const newTemplate = { ...data, id: String(Date.now()) };
        db.projectTemplates.push(newTemplate);
        saveDb();
        return newTemplate as ProjectTemplate;
    },
    getProjectAssignmentsByCompany: async (companyId: string): Promise<ProjectAssignment[]> => {
        return db.projectAssignments as ProjectAssignment[];
    },
    getUserPerformanceMetrics: async (userId: string): Promise<{totalHours: number, tasksCompleted: number}> => {
        return { totalHours: 120, tasksCompleted: 15 };
    },
    createUser: async (data: any, userId: string): Promise<User> => {
        const newUser = { ...data, id: String(Date.now()), companyId: db.users.find(u=>u.id===userId)?.companyId };
        db.users.push(newUser);
        saveDb();
        return newUser as User;
    },
    updateUser: async (id: string, data: Partial<User>, projectIds: (string|number)[] | undefined, userId: string): Promise<User> => {
        const index = db.users.findIndex(u=>u.id === id);
        if (index === -1) throw new Error("User not found");
        
        // Merge existing user data with updates
        db.users[index] = { ...db.users[index], ...data };
        
        // Only update project assignments if the projectIds array is explicitly passed
        // This allows for profile-only updates by omitting the projectIds argument
        if (projectIds !== undefined) {
            db.projectAssignments = db.projectAssignments.filter(pa => pa.userId !== id);
            projectIds.forEach(pid => db.projectAssignments.push({userId: id, projectId: String(pid)}));
        }
        
        saveDb();
        return db.users[index] as User;
    },
    prioritizeTasks: async (tasks: Todo[], projects: Project[], userId: string): Promise<{prioritizedTaskIds: string[]}> => {
        await delay(1000);
        return { prioritizedTaskIds: tasks.sort((a,b) => (b.priority === TodoPriority.HIGH ? 1 : -1) - (a.priority === TodoPriority.HIGH ? 1 : -1)).map(t=>t.id) };
    },
    getMessagesForConversation: async (conversationId: string, userId: string): Promise<Message[]> => {
        return db.messages.filter(m => m.conversationId === conversationId).map(m=>({...m, timestamp: new Date(m.timestamp!)})) as Message[];
    },
    sendMessage: async (senderId: string, recipientId: string, content: string, conversationId?: string): Promise<{conversation: Conversation, message: Message}> => {
        let convo = conversationId ? db.conversations.find(c => c.id === conversationId) : db.conversations.find(c => c.participantIds?.includes(senderId) && c.participantIds?.includes(recipientId));
        if(!convo) {
            convo = { id: String(Date.now()), participantIds: [senderId, recipientId], lastMessage: null };
            db.conversations.push(convo);
        }
        const newMessage = { id: String(Date.now()), conversationId: convo.id, senderId, content, timestamp: new Date(), isRead: false };
        db.messages.push(newMessage);
        convo.lastMessage = newMessage as Message;
        saveDb();
        return { conversation: convo as Conversation, message: newMessage as Message };
    },
    getWhiteboardNotesByProject: async (projectId: string): Promise<WhiteboardNote[]> => {
        return db.whiteboardNotes.filter(n => n.projectId === projectId) as WhiteboardNote[];
    },
    createWhiteboardNote: async (data: any, userId: string): Promise<WhiteboardNote> => {
        const newNote = { ...data, id: String(Date.now()) };
        db.whiteboardNotes.push(newNote);
        saveDb();
        return newNote as WhiteboardNote;
    },
    updateWhiteboardNote: async (id: string, data: any, userId: string): Promise<WhiteboardNote> => {
        const index = db.whiteboardNotes.findIndex(n => n.id === id);
        db.whiteboardNotes[index] = { ...db.whiteboardNotes[index], ...data };
        saveDb();
        return db.whiteboardNotes[index] as WhiteboardNote;
    },
    deleteWhiteboardNote: async (id: string, userId: string): Promise<void> => {
        db.whiteboardNotes = db.whiteboardNotes.filter(n => n.id !== id);
        saveDb();
    },
    createTodo: async (data: Partial<Todo>, userId: string): Promise<Todo> => {
        const newTodo = { ...data, id: String(Date.now()), status: TodoStatus.TODO, createdAt: new Date().toISOString() };
        db.todos.push(newTodo);
        saveDb();
        return newTodo as Todo;
    },
    bulkUpdateTodos: async (ids: (string|number)[], updates: Partial<Todo>, userId: string): Promise<void> => {
        const idSet = new Set(ids.map(String));
        db.todos.forEach(t => {
            if (idSet.has(t.id!)) {
                Object.assign(t, updates);
            }
        });
        saveDb();
    },
    getSiteUpdatesByProject: async (projectId: string): Promise<SiteUpdate[]> => {
        return db.siteUpdates.filter(s => s.projectId === projectId) as SiteUpdate[];
    },
    getProjectMessages: async (projectId: string): Promise<ProjectMessage[]> => {
        return db.projectMessages.filter(p => p.projectId === projectId) as ProjectMessage[];
    },
    getWeatherForLocation: async (lat: number, lng: number): Promise<Weather> => {
        return { temperature: 18, condition: 'Sunny', windSpeed: 10, icon: '☀️' };
    },
    createSiteUpdate: async (data: any, userId: string): Promise<SiteUpdate> => {
        const newUpdate = { ...data, id: String(Date.now()), userId, timestamp: new Date().toISOString() };
        db.siteUpdates.push(newUpdate);
        saveDb();
        return newUpdate as SiteUpdate;
    },
    sendProjectMessage: async (data: any, userId: string): Promise<ProjectMessage> => {
        const newMessage = { ...data, id: String(Date.now()), senderId: userId, timestamp: new Date().toISOString() };
        db.projectMessages.push(newMessage);
        saveDb();
        return newMessage as ProjectMessage;
    }
};
