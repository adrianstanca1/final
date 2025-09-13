// FIX: Implemented mock API to resolve module not found errors.
import { initialData } from './mockData';
import { User, Company, Project, Todo, Timesheet, SafetyIncident, ResourceAssignment, Client, Grant, RiskAnalysis, BidPackage, FinancialKPIs, MonthlyFinancials, CostBreakdown, Invoice, Quote, Expense, ProjectTemplate, SystemHealth, UsageMetric, Notification, AuditLog, TimesheetStatus, Role, TodoStatus, TodoPriority, IncidentStatus, Permission, Message, Conversation, Document, ProjectAssignment, ExpenseStatus, CompanySettings, DocumentStatus, EquipmentStatus } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

// --- Offline Queue Logic ---

interface QueuedAction {
  id: number;
  action: string; // Using string to avoid circular dependency issue.
  payload: any[];
  timestamp: number;
  retries?: number;
  error?: string;
}

const OFFLINE_QUEUE_KEY = 'asagents_offline_queue';
const FAILED_QUEUE_KEY = 'asagents_failed_queue';
const MAX_RETRIES = 3;

// Helper functions for localStorage
const getQueue = (key: string): QueuedAction[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error(`Failed to parse queue ${key}:`, e);
    return [];
  }
};

const saveQueue = (key: string, queue: QueuedAction[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(queue));
  } catch (e) {
    console.error(`Failed to save queue ${key}:`, e);
  }
};


// This is a simplified in-memory "database"
let db = JSON.parse(JSON.stringify(initialData));

// Utility to simulate network delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const ai = new GoogleGenAI({apiKey: process.env.API_KEY});


export const processOfflineQueue = async (): Promise<{ successCount: number; movedToFailedCount: number }> => {
    let queue = getQueue(OFFLINE_QUEUE_KEY);
    if (queue.length === 0) return { successCount: 0, movedToFailedCount: 0 };

    console.log(`Processing ${queue.length} offline actions...`);

    let successCount = 0;
    let movedToFailedCount = 0;
    const remainingActions: QueuedAction[] = [];
    const failedActions = getQueue(FAILED_QUEUE_KEY);

    for (const action of queue) {
        try {
            // @ts-ignore - We trust the action string matches an API method.
            const result = await api[action.action](...action.payload, true); // Pass __isSyncing flag
            
            // --- ID RECONCILIATION LOGIC ---
            if (action.action === 'createProject' && action.payload[0]?.id && result.id) {
                const tempId = action.payload[0].id;
                const finalId = result.id;
                console.log(`Reconciling temp project ID ${tempId} to final ID ${finalId}`);

                // 1. Update the project itself in the local DB
                const projIndex = db.projects.findIndex((p: Project) => p.id === tempId);
                if (projIndex > -1) {
                    db.projects[projIndex].id = finalId;
                }

                // 2. Cascade update to all dependent items in the local DB
                db.todos.forEach((t: Todo) => { if (t.projectId === tempId) t.projectId = finalId; });
                db.documents.forEach((d: Document) => { if (d.projectId === tempId) d.projectId = finalId; });
                db.projectAssignments.forEach((pa: ProjectAssignment) => { if (pa.projectId === tempId) pa.projectId = finalId; });
                db.expenses.forEach((e: Expense) => { if (e.projectId === tempId) e.projectId = finalId; });
                db.safetyIncidents.forEach((si: SafetyIncident) => { if (si.projectId === tempId) si.projectId = finalId; });
                db.timesheets.forEach((ts: Timesheet) => { if (ts.projectId === tempId) ts.projectId = finalId; });
                
                // 3. IMPORTANT: Update any subsequent items in the *current offline queue*
                queue.forEach(queuedAction => {
                    // This handles creating a task for a project that was also created offline.
                    // The task creation action needs its projectId updated before it's sent to the server.
                    if (queuedAction.payload[0]?.projectId === tempId) {
                         console.log(`Cascading ID update in offline queue for action: ${queuedAction.action}`);
                         queuedAction.payload[0].projectId = finalId;
                    }
                });
            }
            // Add more reconciliation logic here for other types (tasks, docs, etc.)

            successCount++;
        } catch (e) {
            action.retries = (action.retries || 0) + 1;
            action.error = e instanceof Error ? e.message : String(e);
            action.timestamp = Date.now(); // Update timestamp on last failure

            if (action.retries >= MAX_RETRIES) {
                failedActions.push(action);
                movedToFailedCount++;
            } else {
                remainingActions.push(action); // Keep for the next attempt
            }
        }
    }

    saveQueue(OFFLINE_QUEUE_KEY, remainingActions);
    saveQueue(FAILED_QUEUE_KEY, failedActions);

    return { successCount, movedToFailedCount };
};

export const getFailedSyncActions = (): QueuedAction[] => {
    return getQueue(FAILED_QUEUE_KEY);
};

export const retryFailedAction = async (id: number) => {
    const failed = getQueue(FAILED_QUEUE_KEY);
    const actionToRetry = failed.find(a => a.id === id);
    if (actionToRetry) {
        const remainingFailed = failed.filter(a => a.id !== id);
        saveQueue(FAILED_QUEUE_KEY, remainingFailed);

        const mainQueue = getQueue(OFFLINE_QUEUE_KEY);
        actionToRetry.retries = 0; // Reset retries
        mainQueue.unshift(actionToRetry); // Add to the front for immediate processing
        saveQueue(OFFLINE_QUEUE_KEY, mainQueue);
        
        // Immediately try to process the queue again
        await processOfflineQueue();
    }
};

export const discardFailedAction = (id: number) => {
    const failed = getQueue(FAILED_QUEUE_KEY);
    const remaining = failed.filter(a => a.id !== id);
    saveQueue(FAILED_QUEUE_KEY, remaining);
};

export interface FailedActionForUI {
    id: number;
    summary: string;
    error: string;
    timestamp: string;
}

export const formatFailedActionForUI = (action: QueuedAction): FailedActionForUI => {
    // Basic formatting, can be improved to be more human-readable
    let summary = `Action: ${action.action}`;
    try {
        const payloadSummary = JSON.stringify(action.payload);
        if (payloadSummary.length > 100) {
            summary += `, Arguments: ${payloadSummary.substring(0, 100)}...`;
        } else {
            summary += `, Arguments: ${payloadSummary}`;
        }
    } catch {
        summary += ', Arguments: [Could not stringify]'
    }

    return {
        id: action.id,
        summary: summary,
        error: action.error || "Failed after multiple retries.",
        timestamp: new Date(action.timestamp).toLocaleString(),
    }
};

const addToOfflineQueue = (action: keyof typeof api, payload: any[]) => {
    const queue = getQueue(OFFLINE_QUEUE_KEY);
    queue.push({
        id: Date.now(),
        timestamp: Date.now(),
        action: action as string, // Cast to string to satisfy interface
        payload,
    });
    saveQueue(OFFLINE_QUEUE_KEY, queue);
};

const apiMethods = {
    // Company & User
    getCompanies: async (): Promise<Company[]> => { await delay(100); return db.companies; },
    getUsersByCompany: async (companyId?: number): Promise<User[]> => { 
        await delay(100); 
        if(companyId === undefined) return db.users;
        return db.users.filter((u: User) => u.companyId === companyId || u.companyId === null);
    },
    getCompanySettings: async (companyId: number): Promise<CompanySettings> => { await delay(50); return { theme: 'light', accessibility: { highContrast: false } }; },
    
    // Projects
    getProjectsByCompany: async (companyId: number): Promise<Project[]> => { await delay(200); return db.projects.filter((p: Project) => p.companyId === companyId); },
    getProjectsByUser: async (userId: number): Promise<Project[]> => {
        await delay(200);
        const assignments = db.projectAssignments.filter((a: ProjectAssignment) => a.userId === userId);
        const projectIds = new Set(assignments.map((a: ProjectAssignment) => a.projectId));
        return db.projects.filter((p: Project) => projectIds.has(p.id));
    },
    getUsersByProject: async (projectId: number | string): Promise<User[]> => {
        await delay(100);
        const assignments = db.projectAssignments.filter((a: ProjectAssignment) => a.projectId == projectId);
        const userIds = new Set(assignments.map((a: ProjectAssignment) => a.userId));
        return db.users.filter((u: User) => userIds.has(u.id));
    },
    getProjectsByManager: async (userId: number): Promise<Project[]> => {
        await delay(200);
        const user = db.users.find((u: User) => u.id === userId);
        if (!user || !user.companyId) return [];
        return db.projects.filter((p: Project) => p.companyId === user.companyId);
    },
    createProject: async (projectData: Omit<Project, 'id' | 'companyId' | 'actualCost' | 'status'>, templateId: number | null, userId: number, __isSyncing = false): Promise<Project> => {
        const user = db.users.find((u: User) => u.id === userId);
        if (!user || !user.companyId) throw new Error("User not found");
        
        if (!navigator.onLine && !__isSyncing) {
            const tempId = `temp-project-${Date.now()}`;
            const optimisticProject: Project = {
                id: tempId,
                companyId: user.companyId,
                ...projectData,
                actualCost: 0,
                status: 'Planning',
            };
            db.projects.push(optimisticProject);
            // Include tempId in payload for reconciliation
            addToOfflineQueue('createProject', [{ ...projectData, id: tempId }, templateId, userId]);
            return optimisticProject;
        }

        await delay(300);
        const newProject: Project = {
            id: Date.now(), // Real ID from server
            companyId: user.companyId,
            ...projectData,
            actualCost: 0,
            status: 'Planning',
        };

        db.projects.push(newProject);
        db.projectAssignments.push({ id: Date.now(), projectId: newProject.id, userId });
        // In a real app, apply template tasks/docs here
        
        apiMethods.logAction(user.companyId, userId, 'project_created', { type: 'Project', id: newProject.id, name: newProject.name });
        return newProject;
    },
    updateProject: async (projectId: number | string, updates: Partial<Project>, userId: number, __isSyncing = false): Promise<Project> => {
        if (!navigator.onLine && !__isSyncing) {
            const index = db.projects.findIndex((p: Project) => p.id == projectId);
            if (index === -1) throw new Error("Project not found for optimistic update");
            
            const updatedProject = { ...db.projects[index], ...updates };
            db.projects[index] = updatedProject;
            
            addToOfflineQueue('updateProject', [projectId, updates, userId]);
            return updatedProject;
        }

        await delay(100);
        const index = db.projects.findIndex((p: Project) => p.id == projectId);
        if (index === -1) throw new Error("Project not found");
        
        const updatedProject = { ...db.projects[index], ...updates };
        db.projects[index] = updatedProject;
        
        apiMethods.logAction(db.projects[index].companyId, userId, 'project_updated', { type: 'Project', id: projectId, name: db.projects[index].name });

        return updatedProject;
    },
    deleteProject: async (projectId: number | string, userId: number, __isSyncing = false): Promise<void> => {
        const projectToDelete = db.projects.find((p: Project) => p.id == projectId);
        if (!projectToDelete) throw new Error("Project not found");

        if (!navigator.onLine && !__isSyncing) {
            // Optimistic delete and cascade
            db.projects = db.projects.filter((p: Project) => p.id != projectId);
            db.todos = db.todos.filter((t: Todo) => t.projectId != projectId);
            db.documents = db.documents.filter((d: Document) => d.projectId != projectId);
            db.projectAssignments = db.projectAssignments.filter((pa: ProjectAssignment) => pa.projectId != projectId);
            
            addToOfflineQueue('deleteProject', [projectId, userId]);
            return;
        }

        await delay(200);
        
        apiMethods.logAction(projectToDelete.companyId, userId, 'project_deleted', { type: 'Project', id: projectId, name: projectToDelete.name });
        
        // Actual delete and cascade
        db.projects = db.projects.filter((p: Project) => p.id != projectId);
        db.todos = db.todos.filter((t: Todo) => t.projectId != projectId);
        db.documents = db.documents.filter((d: Document) => d.projectId != projectId);
        db.projectAssignments = db.projectAssignments.filter((pa: ProjectAssignment) => pa.projectId != projectId);
    },

    // Todos
    getTodosByProjectIds: async (projectIds: (number|string)[]): Promise<Todo[]> => {
        await delay(300);
        const idSet = new Set(projectIds.map(String)); // Convert all to string for comparison
        return db.todos.filter((t: Todo) => idSet.has(String(t.projectId)));
    },
    updateTodo: async (todoId: string | number, updates: Partial<Todo>, userId: number, __isSyncing = false): Promise<Todo> => {
        if (!navigator.onLine && !__isSyncing) {
            const index = db.todos.findIndex((t: Todo) => t.id == todoId);
            if (index === -1) throw new Error("Todo not found for optimistic update");
            const originalTask = { ...db.todos[index] };
            db.todos[index] = { ...originalTask, ...updates, updatedAt: new Date() };
            addToOfflineQueue('updateTodo', [todoId, updates, userId]);
            return db.todos[index];
        }

        await delay(50);
        const index = db.todos.findIndex((t: Todo) => t.id == todoId);
        if (index === -1) throw new Error("Todo not found");
        db.todos[index] = { ...db.todos[index], ...updates, updatedAt: new Date() };
        return db.todos[index];
    },

    // Timesheets
    getTimesheetsByCompany: async (companyId: number, userId: number): Promise<Timesheet[]> => {
        await delay(200);
        return db.timesheets.filter((ts: Timesheet) => {
            const user = db.users.find((u: User) => u.id === ts.userId);
            return user && user.companyId === companyId;
        });
    },
    getTimesheetsForManager: async (managerId: number): Promise<Timesheet[]> => {
        await delay(200);
        const manager = db.users.find((u: User) => u.id === managerId);
        if (!manager || !manager.companyId) return [];
        return db.timesheets.filter((ts: Timesheet) => {
             const user = db.users.find((u: User) => u.id === ts.userId);
             return user && user.companyId === manager.companyId;
        });
    },
    getTimesheetsByUser: async(userId: number): Promise<Timesheet[]> => {
        await delay(100);
        return db.timesheets.filter((t: Timesheet) => t.userId === userId);
    },
    updateTimesheetStatus: async (id: number, status: TimesheetStatus, userId: number, reason?: string, __isSyncing = false): Promise<Timesheet> => {
        if (!navigator.onLine && !__isSyncing) {
            const index = db.timesheets.findIndex((t: Timesheet) => t.id === id);
            if (index === -1) throw new Error("Timesheet not found for optimistic update");
            db.timesheets[index].status = status;
            if (reason) db.timesheets[index].rejectionReason = reason;
            addToOfflineQueue('updateTimesheetStatus', [id, status, userId, reason]);
            return db.timesheets[index];
        }
        await delay(50);
        const index = db.timesheets.findIndex((t: Timesheet) => t.id === id);
        if (index === -1) throw new Error("Timesheet not found");
        db.timesheets[index].status = status;
        if (reason) db.timesheets[index].rejectionReason = reason;
        return db.timesheets[index];
    },
    submitTimesheet: async (data: any, userId: number, __isSyncing = false) => { await delay(50); /* ... */ },
    updateTimesheetEntry: async (id: number, data: any, userId: number, __isSyncing = false) => { await delay(50); /* ... */ },

    // Safety
    getSafetyIncidentsByCompany: async (companyId: number): Promise<SafetyIncident[]> => {
        await delay(150);
        return db.safetyIncidents.filter((i: SafetyIncident) => i.companyId === companyId);
    },

    // Resources
    getResourceAssignments: async (companyId: number): Promise<ResourceAssignment[]> => {
        await delay(100);
        return db.resourceAssignments.filter((r: ResourceAssignment) => r.companyId === companyId);
    },
    getEquipmentByCompany: async (companyId: number): Promise<any[]> => {
        await delay(100);
        return db.equipment.filter((e: any) => e.companyId === companyId);
    },

    // Clients
    getClientsByCompany: async (companyId: number): Promise<Client[]> => {
        await delay(150);
        return db.clients.filter((c: Client) => c.companyId === companyId);
    },

    // Documents
    getDocumentsByCompany: async (companyId: number): Promise<Document[]> => {
        await delay(150);
        return db.documents.filter((d: Document) => d.companyId === companyId);
    },
    getDocumentsByProject: async (projectId: number | string): Promise<Document[]> => {
        await delay(150);
        return db.documents.filter((d: Document) => d.projectId == projectId);
    },
    uploadDocument: async (docData: any, userId: number, __isSyncing = false): Promise<Document> => {
        const user = db.users.find((u: User) => u.id === userId);
        if (!user || !user.companyId) throw new Error("User not found");
        
        const newDoc: Document = {
            id: Date.now(),
            companyId: user.companyId,
            projectId: docData.projectId,
            name: docData.name,
            url: '#', // mock url
            category: docData.category,
            uploadedAt: new Date(),
            uploadedById: userId,
            version: 1,
        };

        if (!navigator.onLine && !__isSyncing) {
            addToOfflineQueue('uploadDocument', [docData, userId]);
            db.documents.push(newDoc);
            return newDoc;
        }

        await delay(500);
        db.documents.push(newDoc);
        return newDoc;
    },

    // Financials
    getFinancialKPIsForCompany: async (companyId: number): Promise<FinancialKPIs> => { await delay(400); return { profitability: 12.5, projectMargin: 22.3, cashFlow: 150340, currency: 'GBP' }; },
    getMonthlyFinancials: async (companyId: number): Promise<MonthlyFinancials[]> => { await delay(400); return [ { month: 'Jan', revenue: 120000, profit: 15000 }, { month: 'Feb', revenue: 150000, profit: 22000 }, { month: 'Mar', revenue: 135000, profit: 18000 }]; },
    getCostBreakdown: async (companyId: number): Promise<CostBreakdown[]> => { await delay(300); return [ { category: 'Labor', amount: 55000 }, { category: 'Materials', amount: 42000 }, { category: 'Overhead', amount: 18000 }]; },
    getInvoicesByCompany: async (companyId: number): Promise<Invoice[]> => { await delay(200); return db.invoices.filter((i: Invoice) => i.companyId === companyId); },
    getQuotesByCompany: async (companyId: number): Promise<Quote[]> => { await delay(200); return db.quotes.filter((q: Quote) => q.companyId === companyId); },
    getExpensesByCompany: async (companyId: number): Promise<Expense[]> => { await delay(200); return db.expenses.filter((e: Expense) => e.companyId === companyId); },
    updateExpenseStatus: async(expenseId: number | string, status: ExpenseStatus, userId: number, reason?: string, __isSyncing=false): Promise<void> => { 
        if (!navigator.onLine && !__isSyncing) {
            const index = db.expenses.findIndex((e: Expense) => e.id == expenseId);
            if (index > -1) {
                db.expenses[index].status = status;
            }
            addToOfflineQueue('updateExpenseStatus', [expenseId, status, userId, reason]);
            return;
        }
        await delay(50);
        const index = db.expenses.findIndex((e: Expense) => e.id == expenseId);
        if (index > -1) {
            db.expenses[index].status = status;
        }
    },

    // Templates
    getProjectTemplates: async(companyId: number): Promise<ProjectTemplate[]> => { await delay(100); return db.projectTemplates.filter((pt: ProjectTemplate) => pt.companyId === companyId); },

    // Platform Admin
    getPlatformUsageMetrics: async (): Promise<UsageMetric[]> => { await delay(300); return [ { name: 'Active Projects', value: db.projects.length, unit: 'projects' }, { name: 'Documents Stored', value: 12408, unit: 'files' }, { name: 'API Calls Today', value: 89234, unit: 'calls' } ]; },

    // Notifications & Logs
    getNotificationsForUser: async(userId: number): Promise<Notification[]> => { await delay(100); return db.notifications.filter((n: Notification) => n.userId === userId).sort((a:Notification,b:Notification) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) },
    markAllNotificationsAsRead: async(userId: number, __isSyncing=false): Promise<void> => { 
        if (!navigator.onLine && !__isSyncing) {
            db.notifications.forEach((n: Notification) => { if (n.userId === userId) n.isRead = true; });
            addToOfflineQueue('markAllNotificationsAsRead', [userId]);
            return;
        }
        await delay(50); 
        db.notifications.forEach((n: Notification) => { if (n.userId === userId) n.isRead = true; }); 
    },
    getAuditLogsByCompany: async(companyId: number): Promise<AuditLog[]> => { await delay(300); return db.auditLogs.filter((l: AuditLog) => l.companyId === companyId).sort((a:AuditLog,b:AuditLog) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) },
    getProjectAssignmentsByCompany: async(companyId: number): Promise<ProjectAssignment[]> => { await delay(100); const projects = db.projects.filter((p: Project) => p.companyId === companyId); const projectIds = new Set(projects.map((p: Project) => p.id)); return db.projectAssignments.filter((a: ProjectAssignment) => projectIds.has(a.projectId)); },
    logAction: async (companyId: number, actorId: number, action: string, target?: any, __isSyncing = false): Promise<void> => {
        if (!navigator.onLine && !__isSyncing) {
            addToOfflineQueue('logAction', [companyId, actorId, action, target]);
            return;
        }
        await delay(20);
        db.auditLogs.push({ id: Date.now(), companyId, actorId, action, timestamp: new Date(), target });
    },


    // Chat
    getConversationsForUser: async(userId: number): Promise<Conversation[]> => { await delay(50); return db.conversations.filter((c: Conversation) => c.participantIds.includes(userId)); },

    // AI Features (These are online-only)
    findGrants: async(keywords: string, location: string): Promise<Grant[]> => { return []; },
    analyzeForRisks: async(text: string): Promise<RiskAnalysis> => { return { summary: 'Mock analysis summary', identifiedRisks: [] }; },
    generateBidPackage: async(url: string, strengths: string, userId: number): Promise<BidPackage> => { return { summary: 'Mock bid package summary', coverLetter: 'Mock cover letter', checklist: [] }; },
    generateSafetyAnalysis: async (incidents: SafetyIncident[], projectId: number, userId: number): Promise<{ report: string }> => { return { report: "Based on the incidents, the primary concern is slip hazards. Recommend increasing signage and regular cleanup." }; },
    generateDailySummary: async (projectId: number, date: Date, userId: number): Promise<string> => { return `Daily summary for project ${projectId} on ${date.toDateString()}: Progress is steady.`; },
    prioritizeTasks: async (tasks: Todo[], projects: Project[], userId: number): Promise<{ prioritizedTaskIds: (string|number)[] }> => {
        const prompt = `
            You are a construction project management assistant. Prioritize the following tasks for a user.
            Your response MUST be a JSON object with a single key "prioritizedTaskIds".
            Consider these factors in strict order of importance:
            1. Dependencies: A task is BLOCKED and must be de-prioritized if any of its prerequisite tasks (listed in 'dependsOn') do not have the status 'Done'. A task that unblocks other tasks is more important than one that doesn't.
            2. Priority field: 'High' is more important than 'Medium', which is more important than 'Low'.
            3. Due Date: Tasks with closer due dates are more urgent. Overdue tasks are the most urgent.
            4. Project Status: Tasks in 'Active' projects are more important than those in 'Planning' or 'On Hold' projects.

            Here is the data:
            Projects: ${JSON.stringify(projects.map(p => ({ id: p.id, name: p.name, status: p.status })))}
            Tasks: ${JSON.stringify(tasks.map(t => ({ id: t.id, text: t.text, status: t.status, priority: t.priority, dueDate: t.dueDate, dependsOn: t.dependsOn, projectId: t.projectId })))}

            Return a JSON object with a single key "prioritizedTaskIds" which is an array of task IDs sorted from highest to lowest priority.
        `;
        
        try {
            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            prioritizedTaskIds: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING } 
                            }
                        }
                    }
                }
            });
            const jsonText = result.text.trim();
            const parsedResult = JSON.parse(jsonText);
            parsedResult.prioritizedTaskIds = parsedResult.prioritizedTaskIds.map((id: string) => {
                const numericId = parseInt(id, 10);
                return isNaN(numericId) ? id : numericId;
            });
            return parsedResult;

        } catch (error) {
            console.error("AI prioritization failed, falling back to simple sort.", error);
            return {
                prioritizedTaskIds: tasks
                    .sort((a, b) => {
                        const priorityMap = { [TodoPriority.HIGH]: 0, [TodoPriority.MEDIUM]: 1, [TodoPriority.LOW]: 2 };
                        if (priorityMap[a.priority] !== priorityMap[b.priority]) {
                            return priorityMap[a.priority] - priorityMap[b.priority];
                        }
                        const dueDateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                        const dueDateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                        return dueDateA - dueDateB;
                    })
                    .map(t => t.id)
            };
        }
    }
};

export const api = apiMethods;