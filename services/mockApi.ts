import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { db } from './mockData';
import { 
    User, Project, Todo, Document, SafetyIncident, Timesheet, Equipment, Company, CompanySettings,
    TodoStatus, TimesheetStatus, IncidentStatus, Role, Permission, ProjectHealth, EquipmentStatus,
    ProjectAssignment, ResourceAssignment, Conversation, ChatMessage, Client, Invoice, Quote, ProjectTemplate,
    AuditLog, Comment, EquipmentHistory, Expense, Payment, DocumentFolder, DocumentVersion, SafetyInspection,
    RiskAssessment, TrainingRecord, Grant, RiskAnalysis, BidPackage, AISearchResult, FinancialKPIs,
    MonthlyFinancials, CostBreakdown, ExpenseStatus, Notification, SystemHealth, UsageMetric, PendingApproval,
    CompanyHealthStats,
    TodoPriority,
    DocumentStatus
} from '../types';

// --- Helper Functions ---
const simulateNetwork = <T>(data: T, delay: number = 500): Promise<T> => {
  return new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(data))), delay));
};

const formatCurrency = (amount: number, currency: string = 'GBP') => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};


// --- Offline Queue Logic ---
interface QueuedAction {
  id: number;
  action: string;
  payload: any[];
  retryCount?: number;
  error?: string;
  timestamp?: number;
}

const OFFLINE_QUEUE_KEY = 'asagents_offline_queue';
const FAILED_QUEUE_KEY = 'asagents_failed_queue';
const MAX_RETRIES = 3;

const getOfflineQueue = (): QueuedAction[] => {
  const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
  try { return raw ? JSON.parse(raw) : []; } catch { return []; }
};

const saveOfflineQueue = (queue: QueuedAction[]) => {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
};

const getFailedQueue = (): QueuedAction[] => {
  const raw = localStorage.getItem(FAILED_QUEUE_KEY);
  try { return raw ? JSON.parse(raw) : []; } catch { return []; }
};

const saveFailedQueue = (queue: QueuedAction[]) => {
  localStorage.setItem(FAILED_QUEUE_KEY, JSON.stringify(queue));
};

const addToOfflineQueue = (action: keyof typeof api, payload: any[]) => {
  const queue = getOfflineQueue();
  const newAction: QueuedAction = {
    id: Date.now(),
    action,
    payload,
    retryCount: 0
  };
  queue.push(newAction);
  saveOfflineQueue(queue);
};

export const processOfflineQueue = async (): Promise<{ successCount: number; movedToFailedCount: number }> => {
  let queue = getOfflineQueue();
  if (queue.length === 0) return { successCount: 0, movedToFailedCount: 0 };

  console.log(`Processing ${queue.length} offline actions...`);
  let successCount = 0;
  let movedToFailedCount = 0;
  
  let newQueue = [...queue];
  let failedQueue = getFailedQueue();

  for (const item of queue) {
    try {
        const actionName = item.action as keyof typeof api;
        
        // --- Special Handling for Temp IDs ---
        if (item.action === 'createProject') {
            const [projectData, templateId, actorId, tempId] = item.payload;
            const newProject = await (api.createProject as any)(projectData, templateId, actorId, true);
            
            const tempProjectId = tempId;
            const finalProjectId = newProject.id;
            
            const projIndex = db.projects.findIndex(p => p.id === tempProjectId);
            if(projIndex > -1) db.projects[projIndex].id = finalProjectId;

            db.todos.forEach(t => { if(t.projectId === tempProjectId) t.projectId = finalProjectId; });
            db.documents.forEach(d => { if(d.projectId === tempProjectId) d.projectId = finalProjectId; });
            db.projectAssignments.forEach(a => { if(a.projectId === tempProjectId) a.projectId = finalProjectId; });
            db.resourceAssignments.forEach(r => { if(r.projectId === tempProjectId) r.projectId = finalProjectId; });
            
        } else if (item.action === 'createTodo') {
            const [todoData, actorId, tempId] = item.payload;
            const newTodo = await (api.createTodo as any)(todoData, actorId, true);
            const finalId = newTodo.id;
            
            const todoIndex = db.todos.findIndex(t => t.id === tempId);
            if(todoIndex > -1) db.todos[todoIndex].id = finalId;
            
            db.todos.forEach(t => {
                if(t.dependsOn?.includes(tempId)) {
                    t.dependsOn = t.dependsOn.map(depId => depId === tempId ? finalId : depId);
                }
            });

        } else if (item.action === 'uploadDocument') {
            const [name, projectId, category, uploaderId, folderId, tempId] = item.payload;
            const newDoc = await (api.uploadDocument as any)(name, projectId, category, uploaderId, folderId, true);
            const finalId = newDoc.id;
            const docIndex = db.documents.findIndex(d => d.id === tempId);
            if (docIndex > -1) db.documents[docIndex].id = finalId;

        } else if (item.action === 'createSafetyIncident') {
            const [incidentData, tempId] = item.payload;
            const newIncident = await (api.createSafetyIncident as any)(incidentData, true);
            const finalId = newIncident.id;
            const incidentIndex = db.safetyIncidents.findIndex(i => i.id === tempId);
            if (incidentIndex > -1) db.safetyIncidents[incidentIndex].id = finalId;

        } else if (item.action === 'submitExpense') {
            const [expenseData, actorId, tempId] = item.payload;
            const newExpense = await (api.submitExpense as any)(expenseData, actorId, true);
            const finalId = newExpense.id;
            const expenseIndex = db.expenses.findIndex(e => e.id === tempId);
            if (expenseIndex > -1) db.expenses[expenseIndex].id = finalId;

        } else if (item.action === 'sendMessage') {
             const [senderId, recipientId, content, tempConvoId] = item.payload;
             const { conversation } = await (api.sendMessage as any)(senderId, recipientId, content, true);
             
             if (tempConvoId) {
                const convoIndex = db.conversations.findIndex(c => c.id === tempConvoId);
                if (convoIndex > -1) {
                    db.conversations[convoIndex] = conversation;
                }
             }

        } else {
            if (typeof api[actionName] === 'function') {
                await (api[actionName] as Function)(...item.payload, true);
            } else {
                throw new Error(`API method '${actionName}' not found.`);
            }
        }
      
      newQueue = newQueue.filter(q => q.id !== item.id);
      successCount++;
    } catch (err) {
      console.error(`Offline action '${item.action}' failed:`, err);
      const currentItemIndex = newQueue.findIndex(q => q.id === item.id);
      if (currentItemIndex > -1) {
          const currentItem = newQueue[currentItemIndex];
          currentItem.retryCount = (currentItem.retryCount || 0) + 1;
          currentItem.error = err instanceof Error ? err.message : String(err);
          currentItem.timestamp = Date.now();

          if (currentItem.retryCount >= MAX_RETRIES) {
              failedQueue.push(currentItem);
              newQueue.splice(currentItemIndex, 1);
              movedToFailedCount++;
          }
      }
    }
  }

  saveOfflineQueue(newQueue);
  saveFailedQueue(failedQueue);
  return { successCount, movedToFailedCount };
};

export const getFailedSyncActions = getFailedQueue;

export const retryFailedAction = (id: number): boolean => {
    const failedQueue = getFailedQueue();
    const actionIndex = failedQueue.findIndex(a => a.id === id);
    if (actionIndex > -1) {
        const [actionToRetry] = failedQueue.splice(actionIndex, 1);
        actionToRetry.retryCount = 0;
        actionToRetry.error = undefined;
        
        const offlineQueue = getOfflineQueue();
        offlineQueue.push(actionToRetry);
        
        saveFailedQueue(failedQueue);
        saveOfflineQueue(offlineQueue);
        return true;
    }
    return false;
};

export const discardFailedAction = (id: number): boolean => {
    let failedQueue = getFailedQueue();
    const initialLength = failedQueue.length;
    failedQueue = failedQueue.filter(a => a.id !== id);
    if (failedQueue.length < initialLength) {
        saveFailedQueue(failedQueue);
        return true;
    }
    return false;
};

export const formatFailedActionForUI = (action: QueuedAction) => {
    const { id, action: actionName, payload, timestamp } = action;
    let entitySummary = 'N/A';
    try {
        if (payload && payload.length > 0) {
             const firstArg = payload[0];
             if (typeof firstArg === 'object' && firstArg !== null) {
                entitySummary = firstArg.name || firstArg.text || `ID: ${firstArg.id || 'N/A'}`;
             } else if (typeof firstArg === 'number' || typeof firstArg === 'string') {
                const secondArg = payload[1];
                if (typeof secondArg === 'object' && secondArg !== null) {
                    entitySummary = secondArg.name || secondArg.text || `ID: ${firstArg}`;
                } else {
                    entitySummary = `ID: ${firstArg}`;
                }
             }
        }
    } catch {}

    return {
        id,
        actionType: actionName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        timestamp: timestamp ? new Date(timestamp).toLocaleString() : 'Unknown',
        entitySummary,
        payload,
    };
};


const fullyTypedApi = {
    // --- User & Company ---
    getUsersByCompany: async (companyId?: number): Promise<User[]> => {
        if (companyId === 0) return simulateNetwork(db.users.filter(u => u.role === Role.PRINCIPAL_ADMIN));
        if (companyId) return simulateNetwork(db.users.filter(u => u.companyId === companyId));
        return simulateNetwork(db.users);
    },
    getCompanies: async (): Promise<Company[]> => simulateNetwork(db.companies),
    getCompanySettings: async (companyId: number): Promise<CompanySettings> => {
        const settings = db.companySettings.find(s => s.companyId === companyId);
        if (!settings) throw new Error("Settings not found");
        return simulateNetwork(settings);
    },
    updateCompanySettings: async (settings: CompanySettings, actorId: number, __isSyncing = false): Promise<CompanySettings> => {
        if (!navigator.onLine && !__isSyncing) {
            addToOfflineQueue('updateCompanySettings', [settings, actorId]);
            const index = db.companySettings.findIndex(s => s.companyId === settings.companyId);
            if(index > -1) db.companySettings[index] = settings;
            return simulateNetwork(settings);
        }
        const index = db.companySettings.findIndex(s => s.companyId === settings.companyId);
        if (index === -1) throw new Error("Settings not found");
        db.companySettings[index] = settings;
        fullyTypedApi.logAction(settings.companyId, actorId, 'updated_company_settings');
        return simulateNetwork(db.companySettings[index]);
    },
    updateUserProfile: async (userId: number, updates: Partial<User>, actorId: number, __isSyncing = false): Promise<User> => {
        const userIndex = db.users.findIndex(u => u.id === userId);
        if (userIndex === -1) throw new Error("User not found");
        const user = db.users[userIndex];
        
        if (!navigator.onLine && !__isSyncing) {
            addToOfflineQueue('updateUserProfile', [userId, updates, actorId]);
            db.users[userIndex] = { ...user, ...updates };
            return simulateNetwork(db.users[userIndex]);
        }
        
        db.users[userIndex] = { ...user, ...updates };
        if (user.companyId) {
            fullyTypedApi.logAction(user.companyId, actorId, 'updated_profile', { type: 'User', id: userId, name: user.name });
        }
        return simulateNetwork(db.users[userIndex]);
    },

    // --- Projects ---
    getProjectsByCompany: async (companyId: number): Promise<Project[]> => simulateNetwork(db.projects.filter(p => p.companyId === companyId)),
    getProjectsByUser: async (userId: number): Promise<Project[]> => {
        const assignments = db.projectAssignments.filter(a => a.userId === userId);
        const projectIds = new Set(assignments.map(a => a.projectId));
        return simulateNetwork(db.projects.filter(p => projectIds.has(p.id)));
    },
    getProjectsByManager: async (managerId: number): Promise<Project[]> => {
        return fullyTypedApi.getProjectsByUser(managerId);
    },
    createProject: async (projectData: Omit<Project, 'id' | 'companyId' | 'actualCost' | 'status'>, templateId: number | null, actorId: number, __isSyncing = false): Promise<Project> => {
        const user = db.users.find(u => u.id === actorId);
        if (!user || !user.companyId) throw new Error("Invalid user for project creation.");

        if (!navigator.onLine && !__isSyncing) {
            const tempId = `temp_${Date.now()}`;
            const newProject: Project = { ...projectData, id: tempId, companyId: user.companyId, actualCost: 0, status: 'Active' };
            db.projects.push(newProject);
            addToOfflineQueue('createProject', [projectData, templateId, actorId, tempId]);
            return simulateNetwork(newProject);
        }
        
        const newProject: Project = {
            id: Date.now(),
            companyId: user.companyId,
            ...projectData,
            actualCost: 0,
            status: 'Active',
        };
        db.projects.push(newProject);

        if (templateId) {
            const template = db.projectTemplates.find(t => t.id === templateId);
            if (template) {
                template.templateTasks.forEach(taskTemplate => {
                    const newTask: Todo = {
                        id: Date.now() + Math.random(),
                        projectId: newProject.id,
                        creatorId: actorId,
                        assigneeId: null,
                        status: TodoStatus.TODO,
                        priority: TodoPriority.MEDIUM,
                        dueDate: null,
                        ...taskTemplate,
                        text: taskTemplate.text || "Untitled Task",
                    };
                    db.todos.push(newTask);
                });
            }
        }
        
        fullyTypedApi.logAction(newProject.companyId, actorId, 'created_project', { type: 'Project', id: newProject.id, name: newProject.name });
        return simulateNetwork(newProject);
    },
    updateProject: async (projectId: number | string, updates: Partial<Project>, actorId: number, __isSyncing = false): Promise<Project> => {
        const index = db.projects.findIndex(p => p.id === projectId);
        if (index === -1) throw new Error("Project not found");
        const project = db.projects[index];

        if (!navigator.onLine && !__isSyncing) {
             addToOfflineQueue('updateProject', [projectId, updates, actorId]);
             db.projects[index] = { ...project, ...updates };
             return simulateNetwork(db.projects[index]);
        }

        db.projects[index] = { ...project, ...updates };
        fullyTypedApi.logAction(project.companyId, actorId, 'updated_project', { type: 'Project', id: project.id, name: project.name });
        return simulateNetwork(db.projects[index]);
    },
    deleteProject: async (projectId: number | string, actorId: number, __isSyncing = false): Promise<{ success: boolean }> => {
        const index = db.projects.findIndex(p => p.id === projectId);
        if (index === -1) throw new Error("Project not found");
        const project = db.projects[index];
        
        if (!navigator.onLine && !__isSyncing) {
            addToOfflineQueue('deleteProject', [projectId, actorId]);
            db.projects.splice(index, 1);
            db.todos = db.todos.filter(t => t.projectId !== projectId);
            db.documents = db.documents.filter(d => d.projectId !== projectId);
            db.projectAssignments = db.projectAssignments.filter(a => a.projectId !== projectId);
            return simulateNetwork({ success: true });
        }
        
        db.projects.splice(index, 1);
        db.todos = db.todos.filter(t => t.projectId !== projectId);
        db.documents = db.documents.filter(d => d.projectId !== projectId);
        db.projectAssignments = db.projectAssignments.filter(a => a.projectId !== projectId);
        fullyTypedApi.logAction(project.companyId, actorId, 'deleted_project', { type: 'Project', id: project.id, name: project.name });
        return simulateNetwork({ success: true });
    },


    // --- Todos ---
    getTodosByProjectIds: async (projectIds: (number | string)[]): Promise<Todo[]> => {
        const idSet = new Set(projectIds.map(String));
        return simulateNetwork(db.todos.filter(t => idSet.has(String(t.projectId))));
    },
    createTodo: async (todoData: Omit<Todo, 'id' | 'creatorId' | 'status'>, actorId: number, __isSyncing = false): Promise<Todo> => {
        if (!navigator.onLine && !__isSyncing) {
            const tempId = `temp_${Date.now()}`;
            const newTodo: Todo = { ...todoData, id: tempId, creatorId: actorId, status: TodoStatus.TODO };
            db.todos.push(newTodo);
            addToOfflineQueue('createTodo', [todoData, actorId, tempId]);
            return simulateNetwork(newTodo);
        }
        
        const newTodo: Todo = {
            id: Date.now(),
            ...todoData,
            creatorId: actorId,
            status: TodoStatus.TODO
        };
        db.todos.push(newTodo);
        const project = db.projects.find(p => p.id === newTodo.projectId);
        if (project) {
            fullyTypedApi.logAction(project.companyId, actorId, 'created_task', { type: 'Todo', id: newTodo.id, name: newTodo.text });
        }
        return simulateNetwork(newTodo);
    },
    updateTodo: async (todoId: number | string, updates: Partial<Todo>, actorId: number, __isSyncing = false): Promise<Todo> => {
        const index = db.todos.findIndex(t => t.id === todoId);
        if (index === -1) throw new Error("Todo not found");
        
        const originalTodo = db.todos[index];
        if (updates.status === TodoStatus.DONE && originalTodo.status !== TodoStatus.DONE) {
            updates.completedAt = new Date();
            updates.completedBy = actorId;
        }

        if (!navigator.onLine && !__isSyncing) {
            addToOfflineQueue('updateTodo', [todoId, updates, actorId]);
            db.todos[index] = { ...originalTodo, ...updates };
            return simulateNetwork(db.todos[index]);
        }
        
        db.todos[index] = { ...originalTodo, ...updates };
        const project = db.projects.find(p => p.id === db.todos[index].projectId);
        if (project) {
            const action = updates.status === TodoStatus.DONE ? 'completed_task' : 'updated_task';
            fullyTypedApi.logAction(project.companyId, actorId, action, { type: 'Todo', id: db.todos[index].id, name: db.todos[index].text });
        }
        return simulateNetwork(db.todos[index]);
    },
    deleteTodo: async (todoId: number | string, actorId: number, __isSyncing = false): Promise<{ success: boolean }> => {
        const index = db.todos.findIndex(t => t.id === todoId);
        if (index === -1) throw new Error("Todo not found");
        const todo = db.todos[index];

        if (!navigator.onLine && !__isSyncing) {
            addToOfflineQueue('deleteTodo', [todoId, actorId]);
            db.todos.splice(index, 1);
            db.todos.forEach(t => {
                if (t.dependsOn?.includes(todoId)) {
                    t.dependsOn = t.dependsOn.filter(id => id !== todoId);
                }
            });
            return simulateNetwork({ success: true });
        }
        
        const project = db.projects.find(p => p.id === todo.projectId);
        if (project) {
            fullyTypedApi.logAction(project.companyId, actorId, 'deleted_task', { type: 'Todo', id: todo.id, name: todo.text });
        }
        db.todos.splice(index, 1);
        db.todos.forEach(t => {
            if (t.dependsOn?.includes(todoId)) {
                t.dependsOn = t.dependsOn.filter(id => id !== todoId);
            }
        });
        return simulateNetwork({ success: true });
    },
    addCommentToTask: async (todoId: number | string, text: string, authorId: number, __isSyncing = false): Promise<Comment> => {
        const todoIndex = db.todos.findIndex(t => t.id === todoId);
        if (todoIndex === -1) throw new Error("Todo not found");
        
        const newComment: Comment = { id: Date.now(), text, authorId, timestamp: new Date() };

        if (!navigator.onLine && !__isSyncing) {
            addToOfflineQueue('addCommentToTask', [todoId, text, authorId]);
            db.todos[todoIndex].comments = [...(db.todos[todoIndex].comments || []), newComment];
            return simulateNetwork(newComment);
        }
        
        db.todos[todoIndex].comments = [...(db.todos[todoIndex].comments || []), newComment];
        const todo = db.todos[todoIndex];
        const project = db.projects.find(p => p.id === todo.projectId);
        if (project) {
            fullyTypedApi.logAction(project.companyId, authorId, 'added_comment_to_task', { type: 'Todo', id: todo.id, name: todo.text });
        }
        return simulateNetwork(newComment);
    },

    // --- Documents ---
    getDocumentsByProjectIds: async (projectIds: (number | string)[]): Promise<Document[]> => {
        const idSet = new Set(projectIds.map(String));
        return simulateNetwork(db.documents.filter(d => idSet.has(String(d.projectId))));
    },
    uploadDocument: async (name: string, projectId: number | string, category: Document['category'], uploaderId: number, folderId: number | null, __isSyncing = false): Promise<Document> => {
        if (!navigator.onLine && !__isSyncing) {
            const tempId = `temp_${Date.now()}`;
            const newDoc: Document = { id: tempId, name, projectId, category, folderId, latestVersionNumber: 1, status: DocumentStatus.DRAFT, updatedAt: new Date() };
            db.documents.push(newDoc);
            addToOfflineQueue('uploadDocument', [name, projectId, category, uploaderId, folderId, tempId]);
            return simulateNetwork(newDoc);
        }
        
        const newDoc: Document = {
            id: Date.now(),
            name,
            projectId,
            category,
            folderId,
            latestVersionNumber: 1,
            status: DocumentStatus.PENDING_APPROVAL,
            updatedAt: new Date(),
        };
        db.documents.push(newDoc);
        const project = db.projects.find(p => p.id === projectId);
        if (project) {
            fullyTypedApi.logAction(project.companyId, uploaderId, 'uploaded_document', { type: 'Document', id: newDoc.id, name: newDoc.name });
        }
        return simulateNetwork(newDoc);
    },
    uploadNewVersion: async (documentId: number | string, uploaderId: number, changeNotes: string, __isSyncing = false): Promise<Document> => {
        const docIndex = db.documents.findIndex(d => d.id === documentId);
        if (docIndex === -1) throw new Error("Document not found");

        if (!navigator.onLine && !__isSyncing) {
             addToOfflineQueue('uploadNewVersion', [documentId, uploaderId, changeNotes]);
             db.documents[docIndex].latestVersionNumber += 1;
             db.documents[docIndex].updatedAt = new Date();
             db.documents[docIndex].status = DocumentStatus.DRAFT;
             return simulateNetwork(db.documents[docIndex]);
        }
        
        db.documents[docIndex].latestVersionNumber += 1;
        db.documents[docIndex].updatedAt = new Date();
        db.documents[docIndex].status = DocumentStatus.PENDING_APPROVAL;
        const doc = db.documents[docIndex];
        const project = db.projects.find(p => p.id === doc.projectId);
        if (project) {
            fullyTypedApi.logAction(project.companyId, uploaderId, 'uploaded_new_version', { type: 'Document', id: doc.id, name: doc.name });
        }
        return simulateNetwork(doc);
    },
    deleteDocument: async (documentId: number | string, actorId: number, __isSyncing = false): Promise<{ success: boolean }> => {
        const docIndex = db.documents.findIndex(d => d.id === documentId);
        if (docIndex === -1) throw new Error("Document not found");
        const doc = db.documents[docIndex];
        
        if (!navigator.onLine && !__isSyncing) {
            addToOfflineQueue('deleteDocument', [documentId, actorId]);
            db.documents.splice(docIndex, 1);
            return simulateNetwork({ success: true });
        }
        
        const project = db.projects.find(p => p.id === doc.projectId);
        if (project) {
            fullyTypedApi.logAction(project.companyId, actorId, 'deleted_document', { type: 'Document', id: doc.id, name: doc.name });
        }
        db.documents.splice(docIndex, 1);
        return simulateNetwork({ success: true });
    },
    getFoldersByProject: async (projectId: number | string): Promise<DocumentFolder[]> => simulateNetwork(db.documentFolders.filter(f => f.projectId === projectId)),
    getFolderContents: async (folderId: number): Promise<{ documents: Document[], folders: DocumentFolder[] }> => {
        const documents = db.documents.filter(d => d.folderId === folderId);
        const folders = db.documentFolders.filter(f => f.parentId === folderId);
        return simulateNetwork({ documents, folders });
    },

    // --- Timesheets ---
    getTimesheetsByCompany: async (companyId: number, requestingUserId: number): Promise<Timesheet[]> => simulateNetwork(db.timesheets.filter(ts => {
        const user = db.users.find(u => u.id === ts.userId);
        return user?.companyId === companyId;
    })),
    getTimesheetsByUser: async (userId: number): Promise<Timesheet[]> => simulateNetwork(db.timesheets.filter(ts => ts.userId === userId)),
    getTimesheetsForManager: async (managerId: number): Promise<Timesheet[]> => {
        const manager = db.users.find(u => u.id === managerId);
        if (!manager) return simulateNetwork([]);
        const managerProjects = db.projectAssignments.filter(a => a.userId === managerId).map(a => a.projectId);
        const projectUserIds = new Set(db.projectAssignments.filter(a => managerProjects.includes(a.projectId)).map(a => a.userId));
        return simulateNetwork(db.timesheets.filter(ts => projectUserIds.has(ts.userId)));
    },
    submitTimesheet: async (timesheetData: Omit<Timesheet, 'id' | 'status'>, actorId: number, __isSyncing = false): Promise<Timesheet> => {
        const newTimesheet: Timesheet = { id: Date.now(), ...timesheetData, status: TimesheetStatus.PENDING };
        
        if (!navigator.onLine && !__isSyncing) {
            addToOfflineQueue('submitTimesheet', [timesheetData, actorId]);
            db.timesheets.push(newTimesheet);
            return simulateNetwork(newTimesheet);
        }

        db.timesheets.push(newTimesheet);
        const project = db.projects.find(p => p.id === newTimesheet.projectId);
        if (project) {
            fullyTypedApi.logAction(project.companyId, actorId, 'submitted_timesheet');
        }
        return simulateNetwork(newTimesheet);
    },
    updateTimesheetStatus: async (timesheetId: number, status: TimesheetStatus, actorId: number, rejectionReason?: string, __isSyncing = false): Promise<Timesheet> => {
        const index = db.timesheets.findIndex(t => t.id === timesheetId);
        if (index === -1) throw new Error("Timesheet not found");

        if (!navigator.onLine && !__isSyncing) {
            addToOfflineQueue('updateTimesheetStatus', [timesheetId, status, actorId, rejectionReason]);
            const optimisticUpdate: Partial<Timesheet> = { status, approverId: actorId, approvedAt: status === TimesheetStatus.APPROVED ? new Date() : null, rejectionReason };
            db.timesheets[index] = { ...db.timesheets[index], ...optimisticUpdate };
            return simulateNetwork(db.timesheets[index]);
        }
        
        db.timesheets[index].status = status;
        db.timesheets[index].approverId = actorId;
        if (status === TimesheetStatus.APPROVED) db.timesheets[index].approvedAt = new Date();
        if (status === TimesheetStatus.REJECTED) db.timesheets[index].rejectionReason = rejectionReason;
        const timesheet = db.timesheets[index];
        const project = db.projects.find(p => p.id === timesheet.projectId);
        const user = db.users.find(u => u.id === timesheet.userId);
        if(project && user) {
            fullyTypedApi.logAction(project.companyId, actorId, status === TimesheetStatus.APPROVED ? 'approved_timesheet' : 'rejected_timesheet', { type: 'Timesheet', id: timesheet.id, name: `Timesheet for ${user.name}`});
        }
        return simulateNetwork(db.timesheets[index]);
    },
    updateTimesheetEntry: async (timesheetId: number, updates: Partial<Timesheet>, actorId: number, __isSyncing = false): Promise<Timesheet> => {
        const index = db.timesheets.findIndex(t => t.id === timesheetId);
        if (index === -1) throw new Error("Timesheet not found");
        
        if (!navigator.onLine && !__isSyncing) {
            addToOfflineQueue('updateTimesheetEntry', [timesheetId, updates, actorId]);
            db.timesheets[index] = { ...db.timesheets[index], ...updates, status: TimesheetStatus.PENDING }; // Re-submit for approval
            return simulateNetwork(db.timesheets[index]);
        }
        
        db.timesheets[index] = { ...db.timesheets[index], ...updates, status: TimesheetStatus.PENDING };
        return simulateNetwork(db.timesheets[index]);
    },
    

    // --- Safety ---
    getSafetyIncidentsByCompany: async (companyId: number): Promise<SafetyIncident[]> => {
        const projectIds = new Set(db.projects.filter(p => p.companyId === companyId).map(p => p.id));
        return simulateNetwork(db.safetyIncidents.filter(i => projectIds.has(i.projectId)));
    },
    createSafetyIncident: async (incidentData: Omit<SafetyIncident, 'id' | 'timestamp' | 'status'>, __isSyncing = false): Promise<SafetyIncident> => {
        if (!navigator.onLine && !__isSyncing) {
            const tempId = `temp_${Date.now()}`;
            const newIncident: SafetyIncident = { ...incidentData, id: tempId, timestamp: new Date(), status: IncidentStatus.REPORTED };
            db.safetyIncidents.push(newIncident);
            addToOfflineQueue('createSafetyIncident', [incidentData, tempId]);
            return simulateNetwork(newIncident);
        }
        
        const newIncident: SafetyIncident = { ...incidentData, id: Date.now(), timestamp: new Date(), status: IncidentStatus.REPORTED };
        db.safetyIncidents.push(newIncident);
        const project = db.projects.find(p => p.id === newIncident.projectId);
        if (project) {
            fullyTypedApi.logAction(project.companyId, incidentData.reporterId, 'reported_safety_incident', { type: 'SafetyIncident', id: newIncident.id, name: newIncident.description.substring(0, 30) });
        }
        return simulateNetwork(newIncident);
    },
     updateSafetyIncident: async (incidentId: number | string, updates: Partial<SafetyIncident>, actorId: number, __isSyncing = false): Promise<SafetyIncident> => {
        const index = db.safetyIncidents.findIndex(i => i.id === incidentId);
        if (index === -1) throw new Error("Safety incident not found");
        const incident = db.safetyIncidents[index];
        
        if (!navigator.onLine && !__isSyncing) {
            addToOfflineQueue('updateSafetyIncident', [incidentId, updates, actorId]);
            db.safetyIncidents[index] = { ...incident, ...updates };
            return simulateNetwork(db.safetyIncidents[index]);
        }

        db.safetyIncidents[index] = { ...incident, ...updates };
        return simulateNetwork(db.safetyIncidents[index]);
    },

    // --- Financials ---
    submitExpense: async (expenseData: Omit<Expense, 'id' | 'status' | 'submittedAt'>, actorId: number, __isSyncing = false): Promise<Expense> => {
        if (!navigator.onLine && !__isSyncing) {
            const tempId = `temp_${Date.now()}`;
            const newExpense: Expense = { ...expenseData, id: tempId, status: ExpenseStatus.PENDING, submittedAt: new Date() };
            db.expenses.push(newExpense);
            addToOfflineQueue('submitExpense', [expenseData, actorId, tempId]);
            return simulateNetwork(newExpense);
        }

        const newExpense: Expense = { ...expenseData, id: Date.now(), status: ExpenseStatus.PENDING, submittedAt: new Date() };
        db.expenses.push(newExpense);
        return simulateNetwork(newExpense);
    },
    updateExpenseStatus: async (expenseId: number | string, status: ExpenseStatus, actorId: number, rejectionReason?: string, __isSyncing = false): Promise<Expense> => {
        const index = db.expenses.findIndex(e => e.id === expenseId);
        if (index === -1) throw new Error("Expense not found");

        if (!navigator.onLine && !__isSyncing) {
            addToOfflineQueue('updateExpenseStatus', [expenseId, status, actorId, rejectionReason]);
            db.expenses[index] = { ...db.expenses[index], status, approverId: actorId, approvedAt: new Date(), rejectionReason };
            return simulateNetwork(db.expenses[index]);
        }
        
        db.expenses[index] = { ...db.expenses[index], status, approverId: actorId, approvedAt: new Date(), rejectionReason };
        return simulateNetwork(db.expenses[index]);
    },


    // --- Chat & Notifications ---
    getConversationsForUser: async (userId: number): Promise<Conversation[]> => simulateNetwork(db.conversations.filter(c => c.participants.includes(userId))),
    getMessagesForConversation: async (conversationId: number | string, userId: number): Promise<ChatMessage[]> => {
        const conversation = db.conversations.find(c => c.id === conversationId);
        if (!conversation) return simulateNetwork([]);
        
        conversation.messages.forEach(msg => {
            if (msg.senderId !== userId && !msg.isRead) {
                msg.isRead = true;
            }
        });
        if(conversation.lastMessage && conversation.lastMessage.senderId !== userId) {
            conversation.lastMessage.isRead = true;
        }

        return simulateNetwork(conversation.messages);
    },
    sendMessage: async (senderId: number, recipientId: number, content: string, __isSyncing = false): Promise<{ message: ChatMessage, conversation: Conversation }> => {
        if (!navigator.onLine && !__isSyncing) {
            let conversation = db.conversations.find(c => c.participants.includes(senderId) && c.participants.includes(recipientId));
            const tempMessageId = Date.now();
            let convoId = conversation?.id || `temp_${Date.now()}`;
            const newMessage: ChatMessage = { id: tempMessageId, conversationId: convoId, senderId, content, timestamp: new Date(), isRead: false };
            
            let tempConvoId: string | null = null;
            if (conversation) {
                conversation.messages.push(newMessage);
                conversation.lastMessage = newMessage;
            } else {
                tempConvoId = convoId as string;
                conversation = { id: tempConvoId, type: 'dm', participants: [senderId, recipientId], messages: [newMessage], lastMessage: newMessage };
                db.conversations.push(conversation);
            }
            addToOfflineQueue('sendMessage', [senderId, recipientId, content, tempConvoId]);
            return simulateNetwork({ message: newMessage, conversation });
        }
        
        let conversation = db.conversations.find(c => c.participants.includes(senderId) && c.participants.includes(recipientId));
        if (!conversation) {
            conversation = { id: Date.now(), type: 'dm', participants: [senderId, recipientId], messages: [], lastMessage: null };
            db.conversations.push(conversation);
        }
        const newMessage: ChatMessage = { id: Date.now(), conversationId: conversation.id, senderId, content, timestamp: new Date(), isRead: false };
        conversation.messages.push(newMessage);
        conversation.lastMessage = newMessage;
        return simulateNetwork({ message: newMessage, conversation });
    },
    getNotificationsForUser: async (userId: number): Promise<Notification[]> => simulateNetwork(db.notifications.filter(n => n.userId === userId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())),
    markNotificationAsRead: async (notificationId: number, userId: number, __isSyncing = false): Promise<{ success: boolean }> => {
        const notification = db.notifications.find(n => n.id === notificationId && n.userId === userId);
        if (!notification) throw new Error("Notification not found");

        if (!navigator.onLine && !__isSyncing) {
            addToOfflineQueue('markNotificationAsRead', [notificationId, userId]);
            notification.isRead = true;
            return simulateNetwork({ success: true });
        }

        notification.isRead = true;
        return simulateNetwork({ success: true });
    },
    markAllNotificationsAsRead: async (userId: number, __isSyncing = false): Promise<{ success: boolean }> => {
        if (!navigator.onLine && !__isSyncing) {
            addToOfflineQueue('markAllNotificationsAsRead', [userId]);
            db.notifications.forEach(n => { if (n.userId === userId) n.isRead = true; });
            return simulateNetwork({ success: true });
        }
        
        db.notifications.forEach(n => {
            if (n.userId === userId) n.isRead = true;
        });
        return simulateNetwork({ success: true });
    },

    // --- Audit Log ---
    logAction: async (companyId: number, actorId: number, action: string, target?: AuditLog['target'], __isSyncing = false): Promise<AuditLog> => {
        const newLog: AuditLog = { id: Date.now(), companyId, actorId, action, target, timestamp: new Date() };

        if (!navigator.onLine && !__isSyncing) {
            addToOfflineQueue('logAction', [companyId, actorId, action, target]);
            return simulateNetwork(newLog);
        }
        
        db.auditLogs.unshift(newLog);
        if (db.auditLogs.length > 200) db.auditLogs.pop();
        return simulateNetwork(newLog);
    },

    // --- Other ---
    getProjectAssignmentsByCompany: async (companyId: number): Promise<ProjectAssignment[]> => {
        const companyProjects = new Set(db.projects.filter(p => p.companyId === companyId).map(p => p.id));
        return simulateNetwork(db.projectAssignments.filter(a => companyProjects.has(a.projectId)));
    },
    createResourceAssignment: async (data: Omit<ResourceAssignment, 'id'>, actorId: number): Promise<ResourceAssignment> => {
        const newAssignment: ResourceAssignment = { id: Date.now(), ...data };
        db.resourceAssignments.push(newAssignment);
        if (data.resourceType === 'equipment') {
            const equipIndex = db.equipment.findIndex(e => e.id === data.resourceId);
            if (equipIndex > -1) {
                db.equipment[equipIndex].status = EquipmentStatus.IN_USE;
                db.equipment[equipIndex].projectId = data.projectId;
            }
        }
        return simulateNetwork(newAssignment);
    },
    deleteResourceAssignment: async (assignmentId: number, actorId: number): Promise<{ success: boolean }> => {
        const index = db.resourceAssignments.findIndex(a => a.id === assignmentId);
        if(index > -1) {
            const assignment = db.resourceAssignments[index];
            if (assignment.resourceType === 'equipment') {
                const equipIndex = db.equipment.findIndex(e => e.id === assignment.resourceId);
                 if (equipIndex > -1) {
                    db.equipment[equipIndex].status = EquipmentStatus.AVAILABLE;
                    db.equipment[equipIndex].projectId = null;
                }
            }
            db.resourceAssignments.splice(index, 1);
        }
        return simulateNetwork({ success: true });
    },

    // --- Unimplemented/Placeholder Functions to avoid errors ---
    getEquipmentByCompany: async (companyId: number): Promise<Equipment[]> => simulateNetwork(db.equipment.filter(e => e.companyId === companyId)),
    updateEquipmentStatus: async (equipmentId: number, status: EquipmentStatus, actorId: number): Promise<Equipment> => {
        const index = db.equipment.findIndex(e => e.id === equipmentId);
        if (index === -1) throw new Error("Equipment not found");
        db.equipment[index].status = status;
        if(status === 'Available') db.equipment[index].projectId = null;
        return simulateNetwork(db.equipment[index]);
    },
    getEquipmentHistory: async (equipmentId: number): Promise<EquipmentHistory[]> => simulateNetwork(db.equipmentHistory.filter(h => h.equipmentId === equipmentId)),
    getResourceAssignments: async (companyId: number): Promise<ResourceAssignment[]> => simulateNetwork(db.resourceAssignments.filter(r => r.companyId === companyId)),
    getClientsByCompany: async (companyId: number): Promise<Client[]> => simulateNetwork(db.clients.filter(c => c.companyId === companyId)),
    getInvoicesByCompany: async (companyId: number): Promise<Invoice[]> => {
        const companyProjects = new Set(db.projects.filter(p => p.companyId === companyId).map(p => p.id));
        return simulateNetwork(db.invoices.filter(i => companyProjects.has(i.projectId)));
    },
    getQuotesByCompany: async (companyId: number): Promise<Quote[]> => {
        const companyProjects = new Set(db.projects.filter(p => p.companyId === companyId).map(p => p.id));
        return simulateNetwork(db.quotes.filter(q => companyProjects.has(q.projectId)));
    },
    getProjectTemplates: async (companyId: number): Promise<ProjectTemplate[]> => simulateNetwork(db.projectTemplates.filter(t => t.companyId === companyId)),
    getAuditLogsByCompany: async (companyId: number): Promise<AuditLog[]> => simulateNetwork(db.auditLogs.filter(l => l.companyId === companyId)),
    getDashboardActivityLogs: async (companyId: number): Promise<AuditLog[]> => simulateNetwork(db.auditLogs.filter(l => l.companyId === companyId).slice(0, 10)),
    getCompanyHealthStats: async (companyId: number): Promise<CompanyHealthStats> => {
        const projects = db.projects.filter(p => p.companyId === companyId);
        const users = db.users.filter(u => u.companyId === companyId);
        return simulateNetwork({
            totalUsers: users.length,
            activeProjects: projects.filter(p => p.status === 'Active').length,
            storageUsageGB: 25.4,
            storageCapacityGB: 100
        });
    },
    getPendingApprovals: async (companyId: number, userId: number): Promise<PendingApproval[]> => {
        const timesheets = db.timesheets.filter(ts => ts.status === 'Pending').map(ts => ({ id: ts.id, type: 'Timesheet' as const, description: `Timesheet for ${db.users.find(u=>u.id===ts.userId)?.name || 'Unknown'}`, timesheetId: ts.id }));
        const expenses = db.expenses.filter(ex => ex.status === 'Pending').map(ex => ({ id: ex.id, type: 'Expense' as const, description: `Expense: ${ex.description}`, expenseId: ex.id }));
        return simulateNetwork([...timesheets, ...expenses]);
    },
    getAuditLogsByActorId: async (actorId: number): Promise<AuditLog[]> => simulateNetwork(db.auditLogs.filter(l => l.actorId === actorId)),
    getExpensesByCompany: async (companyId: number): Promise<Expense[]> => simulateNetwork(db.expenses.filter(e => {
        const user = db.users.find(u => u.id === e.userId);
        return user?.companyId === companyId;
    })),
    getPlatformUsageMetrics: async (): Promise<UsageMetric[]> => {
        return simulateNetwork([
            { name: 'API Calls Today', value: 125430, unit: 'requests' },
            { name: 'Active Users (24h)', value: 489, unit: 'users' },
            { name: 'AI Tokens Used (24h)', value: 2500000, unit: 'tokens' }
        ]);
    },

    // --- AI Functions ---
    prioritizeTasks: async (tasks: Todo[], projects: Project[], userId: number): Promise<{ prioritizedTaskIds: (number | string)[] }> => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const prompt = `Given these tasks: ${JSON.stringify(tasks.map(t => ({...t, comments: undefined, subTasks: undefined})))} and these projects: ${JSON.stringify(projects)}, prioritize the tasks for user ${userId}. Consider due dates, priority from the 'priority' field, project status, and task dependencies from the 'dependsOn' field. A task with an unmet dependency (a task in its 'dependsOn' array is not 'Done') should be deprioritized. A task that unblocks other tasks is more important. A task with an imminent due date on an active project is critical. Return a JSON object with a single key "prioritizedTaskIds" which is an array of task IDs in the correct order.`;
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text);
    },
    getProjectHealth: async (project: Project, overdueTaskCount: number): Promise<ProjectHealth> => {
        const progress = project.budget > 0 ? (project.actualCost / project.budget) * 100 : 0;
        const prompt = `Analyze the health of this construction project: ${JSON.stringify({ ...project, location: undefined, imageUrl: undefined })}. It has ${overdueTaskCount} overdue tasks and budget progress is ${progress.toFixed(0)}%. Provide a health status ('Good', 'Needs Attention', or 'At Risk') and a brief 1-sentence summary. Return a JSON object with keys "status" and "summary".`;
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text);
    },
    findGrants: async (keywords: string, location: string): Promise<Grant[]> => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const response: GenerateContentResponse = await ai.models.generateContent({
           model: "gemini-2.5-flash",
           contents: `Find construction-related grants for '${keywords}' in '${location}'. Provide up to 3 results.`,
           config: {
             responseMimeType: "application/json",
             responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.NUMBER },
                    name: { type: Type.STRING },
                    agency: { type: Type.STRING },
                    amount: { type: Type.STRING },
                    description: { type: Type.STRING },
                    url: { type: Type.STRING }
                  },
                },
              },
           },
        });
        const grants = JSON.parse(response.text);
        return grants.map((g: Grant, i: number) => ({ ...g, id: Date.now() + i }));
    },
    analyzeForRisks: async (text: string): Promise<RiskAnalysis> => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze the following text for financial and compliance risks in a construction context: "${text}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        identifiedRisks: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    severity: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
                                    description: { type: Type.STRING },
                                    recommendation: { type: Type.STRING }
                                }
                            }
                        }
                    }
                }
            }
        });
        return JSON.parse(response.text);
    },
    generateBidPackage: async (tenderUrl: string, companyStrengths: string, userId: number): Promise<BidPackage> => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Draft a bid package. Company strengths: ${companyStrengths}. Tender URL (for context, if provided): ${tenderUrl}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        coverLetter: { type: Type.STRING },
                        checklist: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        });
        return JSON.parse(response.text);
    },
    searchAcrossDocuments: async (query: string, projectIds: (number | string)[], userId: number): Promise<AISearchResult> => {
        const docs = db.documents.filter(d => projectIds.map(String).includes(String(d.projectId)));
        if (docs.length === 0) return simulateNetwork({ summary: "No relevant documents were found to search within.", sources: [] });
        return simulateNetwork({
            summary: `Based on available documents, the rebar specification requires Grade 60 steel. Safety procedures mandate hard hats in all zones, with weekly toolbox talks. The deadline for Phase 2 is October 25th.`,
            sources: [
                { documentId: docs[0].id, snippet: `...all structural rebar must be ASTM A615 Grade 60...`},
                { documentId: docs[0].id, snippet: `...Phase 2 completion is scheduled for no later than October 25th, 2023...`}
            ]
        }, 1500);
    },
    generateDailySummary: async (projectId: number | string, date: Date, userId: number): Promise<string> => {
        const project = db.projects.find(p => p.id === projectId);
        const projectTodos = db.todos.filter(t => t.projectId === projectId);
        return simulateNetwork(`**Daily Summary for ${project?.name} - ${date.toLocaleDateString()}**\n\n- **Completed Today:**\n  - Finalized structural steel drawings.\n- **In Progress:**\n  - Procurement of HVAC units continues.\n  - Daily site cleanup ongoing.\n- **Blockers:**\n  - None reported.\n- **Upcoming:**\n  - Installation of 1st floor exterior windows scheduled for tomorrow.`);
    },
    generateSafetyAnalysis: async (incidents: SafetyIncident[], projectId: number | string, userId: number): Promise<{ report: string }> => {
        return simulateNetwork({ report: `**Safety Analysis for Project #${projectId}**\n\n- **Trend:** Multiple 'minor slip' incidents have been reported, suggesting a need for improved housekeeping or water management on site.\n- **Recommendation:** Implement mandatory daily cleanup of walkways and ensure all spills are addressed immediately.` });
    },
    getFinancialKPIsForCompany: async (companyId: number): Promise<FinancialKPIs> => simulateNetwork({ profitability: 12.5, projectMargin: 18.2, cashFlow: 150340, currency: 'GBP' }),
    getMonthlyFinancials: async (companyId: number): Promise<MonthlyFinancials[]> => {
        return simulateNetwork([
            { month: 'Jan', revenue: 150, costs: 120, profit: 30 },
            { month: 'Feb', revenue: 180, costs: 140, profit: 40 },
            { month: 'Mar', revenue: 220, costs: 170, profit: 50 },
        ]);
    },
    getCostBreakdown: async (companyId: number): Promise<CostBreakdown[]> => {
        return simulateNetwork([
            { category: 'Labor', amount: 45000 },
            { category: 'Materials', amount: 75000 },
            { category: 'Subcontractors', amount: 30000 },
        ]);
    },
};

export const api = fullyTypedApi;