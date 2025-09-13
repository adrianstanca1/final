// full contents of services/mockApi.ts

import {
  User, Project, Todo, Document, SafetyIncident, Timesheet, Equipment,
  Company, CompanySettings, Permission, Role, Conversation, ChatMessage,
  Client, Invoice, Quote, ProjectTemplate, ResourceAssignment, AISearchResult, AuditLog,
  FinancialKPIs, MonthlyFinancials, CostBreakdown, Grant, RiskAnalysis, BidPackage, TimesheetStatus,
  EquipmentStatus, ProjectAssignment, TodoPriority, TodoStatus, ProjectHealth, DocumentCategory, DocumentStatus,
  UsageMetric, PendingApproval, CompanyHealthStats, EquipmentHistory, Expense, ExpenseStatus, InvoiceStatus, Payment,
  DocumentFolder, DocumentVersion, Comment, Notification
} from '../types';
import { db } from './mockData';
import { hasPermission } from './auth';
import { GoogleGenAI, Type, GenerateContentResponse } from '@google/genai';

const LATENCY = 300; // ms

const simulateNetwork = <T>(data: T): Promise<T> => {
  return new Promise(resolve => {
    setTimeout(() => resolve(JSON.parse(JSON.stringify(data))), LATENCY);
  });
};

const createNotification = (notification: Omit<Notification, 'id'>) => {
    const newNotification: Notification = {
        ...notification,
        id: Date.now() + Math.random(),
    };
    db.notifications.unshift(newNotification);
};

const logAction = (companyId: number | null, actorId: number, action: string, target?: AuditLog['target']) => {
    if (companyId === null) return;
    const newLog: AuditLog = {
        id: Date.now() + Math.random(),
        companyId,
        actorId,
        action,
        target,
        timestamp: new Date(),
    };
    db.auditLogs.unshift(newLog);
};

export const api = {
  // FIX: Exported logAction to make it accessible to components that need to log user actions.
  logAction,
  // User & Auth
  getUsersByCompany: (companyId?: number): Promise<User[]> => {
    if (companyId === 0) return simulateNetwork(db.users.filter(u => u.role === Role.PRINCIPAL_ADMIN));
    if (companyId) return simulateNetwork(db.users.filter(u => u.companyId === companyId));
    return simulateNetwork(db.users);
  },
  updateUserProfile: (userId: number, updates: Partial<User>): Promise<User> => {
    const userIndex = db.users.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error("User not found");
    const updatedUser = { ...db.users[userIndex], ...updates };
    db.users[userIndex] = updatedUser;
    logAction(updatedUser.companyId, userId, 'updated_own_profile');
    return simulateNetwork(updatedUser);
  },
  updateUserAvatar: (userId: number, file: File): Promise<User> => {
    const userIndex = db.users.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error("User not found");
    // In a real app, this would upload to a storage service. Here, we'll just assign a new random avatar.
    db.users[userIndex].avatarUrl = `https://i.pravatar.cc/150?u=${userId}&t=${Date.now()}`;
    logAction(db.users[userIndex].companyId, userId, 'updated_avatar');
    return simulateNetwork(db.users[userIndex]);
  },
  changePassword: (userId: number, currentPassword: string, newPassword: string): Promise<{ success: boolean }> => {
    // This is a mock. In a real app, you'd have password hashing and validation.
    console.log(`Password change requested for user ${userId}. Current: ${currentPassword}, New: ${newPassword}`);
    const user = db.users.find(u => u.id === userId);
    if (user) {
        logAction(user.companyId, userId, 'changed_password');
    }
    return simulateNetwork({ success: true });
  },

  // Company
  getCompanies: (): Promise<Company[]> => simulateNetwork(db.companies),
  getCompanySettings: (companyId: number): Promise<CompanySettings | null> => simulateNetwork(db.companySettings.find(cs => cs.companyId === companyId) || null),
  updateCompanySettings: (companyId: number, settings: CompanySettings, actorId: number): Promise<CompanySettings> => {
    const index = db.companySettings.findIndex(cs => cs.companyId === companyId);
    if (index !== -1) {
      db.companySettings[index] = settings;
    } else {
      // If no settings exist, create them. This makes the system more robust.
      db.companySettings.push(settings);
    }
    logAction(companyId, actorId, 'updated_company_settings');
    return simulateNetwork(settings);
  },
    getCompanyHealthStats: (companyId: number): Promise<CompanyHealthStats> => {
        const company = db.companies.find(c => c.id === companyId);
        if (!company) throw new Error("Company not found");

        const totalUsers = db.users.filter(u => u.companyId === companyId).length;
        const activeProjects = db.projects.filter(p => p.companyId === companyId && p.status === 'Active').length;
        
        let storageCapacityGB = 10; // Basic plan
        if (company.subscriptionPlan === 'Pro') storageCapacityGB = 50;
        if (company.subscriptionPlan === 'Enterprise') storageCapacityGB = 200;

        return simulateNetwork({
            totalUsers,
            activeProjects,
            storageUsageGB: company.storageUsageGB,
            storageCapacityGB,
        });
    },

    getPendingApprovals: (companyId: number, actorId: number): Promise<PendingApproval[]> => {
        const user = db.users.find(u => u.id === actorId);
        if(!user) return simulateNetwork([]);

        const approvals: PendingApproval[] = [];

        if (hasPermission(user, Permission.MANAGE_TIMESHEETS)) {
            const pendingTimesheets = db.timesheets.filter(t => {
                const tsUser = db.users.find(u => u.id === t.userId);
                return tsUser?.companyId === companyId && t.status === TimesheetStatus.PENDING;
            });
            approvals.push(...pendingTimesheets.map(t => {
                const u = db.users.find(u => u.id === t.userId);
                const hours = t.clockOut ? ((new Date(t.clockOut).getTime() - new Date(t.clockIn).getTime()) / 3600000).toFixed(1) : 'Ongoing';
                return {
                    id: t.id,
                    type: 'Timesheet' as const,
                    description: `${hours} hrs for ${u?.name || 'Unknown'} on ${new Date(t.clockIn).toLocaleDateString()}`,
                    timesheetId: t.id,
                };
            }));
        }

        if(hasPermission(user, Permission.MANAGE_EXPENSES)) {
            const pendingExpenses = db.expenses.filter(e => {
                 const eUser = db.users.find(u => u.id === e.userId);
                 return eUser?.companyId === companyId && e.status === ExpenseStatus.PENDING;
            });
             approvals.push(...pendingExpenses.map(e => {
                const u = db.users.find(u => u.id === e.userId);
                return {
                    id: e.id + 10000, // avoid key collision
                    type: 'Expense' as const,
                    description: `£${e.amount} expense from ${u?.name || 'Unknown'} for ${e.category}`,
                    expenseId: e.id,
                };
            }));
        }

        return simulateNetwork(approvals);
    },

  // Projects
  getProjectsByCompany: (companyId: number): Promise<Project[]> => simulateNetwork(db.projects.filter(p => p.companyId === companyId)),
  getProjectsByUser: (userId: number): Promise<Project[]> => {
    const assignments = db.projectAssignments.filter(a => a.userId === userId);
    const projectIds = assignments.map(a => a.projectId);
    return simulateNetwork(db.projects.filter(p => projectIds.includes(p.id)));
  },
  getProjectsByManager: (userId: number): Promise<Project[]> => {
      const user = db.users.find(u => u.id === userId);
      if (user?.role !== Role.PM) return simulateNetwork([]);
      // In a real app, projects would have a managerId. Here we'll just give them a subset.
      return simulateNetwork(db.projects.filter(p => p.companyId === user.companyId).slice(0,3));
  },
   createProject: (projectData: Omit<Project, 'id' | 'companyId' | 'actualCost' | 'status'>, templateId: number | null, actorId: number): Promise<Project> => {
    const actor = db.users.find(u => u.id === actorId);
    if (!actor?.companyId) throw new Error("User has no companyId");

    const newProject: Project = {
        ...projectData,
        id: Date.now(),
        companyId: actor.companyId,
        actualCost: 0,
        status: 'Active',
    };
    db.projects.push(newProject);
    logAction(actor.companyId, actorId, 'created_project', { type: 'Project', id: newProject.id, name: newProject.name });

    if (templateId) {
        const template = db.projectTemplates.find(t => t.id === templateId);
        if (template) {
            template.templateTasks.forEach(taskTemplate => {
                const newTodo: Todo = {
                    ...taskTemplate,
                    id: `${newProject.id}-${Date.now()}-${Math.random()}`,
                    projectId: newProject.id,
                    creatorId: actorId,
                    status: TodoStatus.TODO,
                } as Todo;
                db.todos.push(newTodo);
            });
        }
    }
    return simulateNetwork(newProject);
  },


  // Todos
  getTodosByProjectIds: (projectIds: number[]): Promise<Todo[]> => simulateNetwork(db.todos.filter(t => projectIds.includes(t.projectId))),
  updateTodo: (todoId: number | string, updates: Partial<Todo>, actorId: number): Promise<Todo> => {
    const index = db.todos.findIndex(t => t.id === todoId);
    if (index === -1) throw new Error("Todo not found");

    const originalTask = { ...db.todos[index] };
    const finalUpdates = { ...updates };
    
    if (updates.status === TodoStatus.DONE && originalTask.status !== TodoStatus.DONE) {
        finalUpdates.completedBy = actorId;
        finalUpdates.completedAt = new Date();
        const actor = db.users.find(u=>u.id === actorId);
        logAction(actor?.companyId, actorId, 'completed_task', { type: 'Todo', id: todoId, name: originalTask.text });
    }
    
    const updatedTodo = { ...originalTask, ...finalUpdates };
    db.todos[index] = updatedTodo;

    // Integration: Create notification if assignee changes
    if (updates.assigneeId && updates.assigneeId !== originalTask.assigneeId) {
        const actor = db.users.find(u => u.id === actorId);
        createNotification({
            userId: updates.assigneeId,
            actorId,
            type: 'TASK_ASSIGNED',
            message: `${actor?.name || 'Someone'} assigned you a new task: "${updatedTodo.text}"`,
            isRead: false,
            timestamp: new Date(),
            link: { view: 'all-tasks', targetId: updatedTodo.id },
        });
    }

    return simulateNetwork(updatedTodo);
  },
  prioritizeTasks: async (tasks: Todo[], projects: Project[], userId: number): Promise<{ prioritizedTaskIds: (number | string)[] }> => {
    if (!process.env.API_KEY) {
        console.warn("API_KEY not found. Returning simple sorted tasks.");
        const sortedTasks = [...tasks].sort((a, b) => {
            const dueDateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
            const dueDateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
            if (dueDateA !== dueDateB) return dueDateA - dueDateB;
            const priorityOrder = { [TodoPriority.HIGH]: 1, [TodoPriority.MEDIUM]: 2, [TodoPriority.LOW]: 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
        return simulateNetwork({ prioritizedTaskIds: sortedTasks.map(t => t.id) });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
        Given the following JSON data for projects and tasks assigned to a user, please act as an expert construction project manager. Analyze the tasks and return a JSON object with a single key "prioritizedTaskIds", which is an array of task IDs sorted in the order the user should complete them today.

        Consider the following factors for prioritization:
        1. Task Due Dates: Tasks with earlier due dates are more urgent. Today's date is ${new Date().toISOString()}.
        2. Task Priority: 'High' priority tasks should be done before 'Medium' and 'Low' priority ones.
        3. Project Status: Tasks in 'Active' projects are the main focus. Tasks in 'On Hold' projects are lowest priority.
        4. Task Dependencies: A task cannot be started until all tasks listed in its "dependsOn" array are completed (their status is 'Done'). Prioritize prerequisite tasks over the tasks that depend on them.
        5. Implied Dependencies: Analyze the task descriptions. For example, a task like "Install windows on 2nd floor" should come after "Frame window openings on 2nd floor". Prioritize foundational tasks first.

        Here is the data:
        Projects: ${JSON.stringify(projects.map(({ id, name, status, startDate }) => ({ id, name, status, startDate })))}
        Tasks: ${JSON.stringify(tasks.map(({ id, text, projectId, priority, dueDate, dependsOn, status }) => ({ id: String(id), text, projectId, priority, dueDate, dependsOn: dependsOn || [], status })))}

        Return only the JSON object containing the sorted task IDs. Do not include any other text or explanation.
    `;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        prioritizedTaskIds: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING,
                            }
                        }
                    },
                    required: ['prioritizedTaskIds']
                }
            }
        });

        const jsonStr = response.text;
        const result = JSON.parse(jsonStr);
        
        const originalIdTypes = new Map(tasks.map(t => [String(t.id), t.id]));
        const typedIds = result.prioritizedTaskIds.map((id: string) => originalIdTypes.get(id) || id);

        return { prioritizedTaskIds: typedIds };

    } catch (e) {
        console.error("AI prioritization failed:", e);
        throw new Error("AI failed to prioritize tasks.");
    }
  },

  // Documents
  getDocumentsByProjectIds: (projectIds: number[]): Promise<Document[]> => simulateNetwork(db.documents.filter(d => projectIds.includes(d.projectId) && d.folderId === null)),
  getFoldersByProject: (projectId: number): Promise<DocumentFolder[]> => simulateNetwork(db.documentFolders.filter(f => f.projectId === projectId)),
  getFolderContents: (folderId: number): Promise<{ folders: DocumentFolder[], documents: Document[] }> => {
      const folders = db.documentFolders.filter(f => f.parentId === folderId);
      const documents = db.documents.filter(d => d.folderId === folderId);
      return simulateNetwork({ folders, documents });
  },
  getDocumentDetails: (documentId: number): Promise<{ document: Document, versions: DocumentVersion[] }> => {
      const document = db.documents.find(d => d.id === documentId);
      if (!document) throw new Error("Document not found");
      const versions = db.documentVersions.filter(v => v.documentId === documentId).sort((a,b) => b.versionNumber - a.versionNumber);
      return simulateNetwork({ document, versions });
  },
  createFolder: (name: string, projectId: number, parentId: number | null, companyId: number): Promise<DocumentFolder> => {
      const newFolder: DocumentFolder = {
          id: Date.now(),
          name,
          projectId,
          parentId,
          companyId,
      };
      db.documentFolders.push(newFolder);
      return simulateNetwork(newFolder);
  },
  uploadDocument: (name: string, projectId: number, category: DocumentCategory, uploaderId: number, folderId: number | null): Promise<Document> => {
        const docId = Date.now();
        const now = new Date();
        const uploader = db.users.find(u => u.id === uploaderId);

        const newDoc: Document = {
            id: docId,
            name,
            projectId,
            folderId,
            category,
            latestVersionNumber: 1,
            status: DocumentStatus.DRAFT,
            updatedAt: now,
        };
        db.documents.push(newDoc);
        
        const newVersion: DocumentVersion = {
            id: docId + 1,
            documentId: docId,
            versionNumber: 1,
            url: '#', // Placeholder
            uploaderId: uploaderId,
            uploadedAt: now,
            status: DocumentStatus.DRAFT,
            changeNotes: 'Initial upload.',
        };
        db.documentVersions.push(newVersion);

        logAction(uploader?.companyId, uploaderId, 'uploaded_document', {type: 'Document', id: docId, name: name});
        return simulateNetwork(newDoc);
  },
  uploadNewVersion: (documentId: number, uploaderId: number, changeNotes: string): Promise<DocumentVersion> => {
      const docIndex = db.documents.findIndex(d => d.id === documentId);
      if (docIndex === -1) throw new Error("Document not found.");

      const document = db.documents[docIndex];
      const newVersionNumber = document.latestVersionNumber + 1;
      const now = new Date();

      const newVersion: DocumentVersion = {
          id: Date.now(),
          documentId: documentId,
          versionNumber: newVersionNumber,
          url: '#',
          uploaderId,
          uploadedAt: now,
          changeNotes,
          status: DocumentStatus.DRAFT,
      };
      db.documentVersions.push(newVersion);

      document.latestVersionNumber = newVersionNumber;
      document.status = DocumentStatus.DRAFT;
      document.updatedAt = now;
      
      const uploader = db.users.find(u => u.id === uploaderId);
      logAction(uploader?.companyId, uploaderId, 'uploaded_new_version', {type: 'Document', id: documentId, name: document.name});

      return simulateNetwork(newVersion);
  },
  updateDocumentVersionStatus: (versionId: number, status: DocumentStatus, actorId: number): Promise<DocumentVersion> => {
      const versionIndex = db.documentVersions.findIndex(v => v.id === versionId);
      if (versionIndex === -1) throw new Error("Version not found.");

      const version = db.documentVersions[versionIndex];
      version.status = status;
      
      const docIndex = db.documents.findIndex(d => d.id === version.documentId);
      if (docIndex !== -1) {
          const doc = db.documents[docIndex];
          if(doc.latestVersionNumber === version.versionNumber) {
              doc.status = status;
          }
           const actor = db.users.find(u => u.id === actorId);
           logAction(actor?.companyId, actorId, `${status.toLowerCase()}_document_version`, {type: 'Document', id: doc.id, name: doc.name});
      }

      return simulateNetwork(version);
  },
  addCommentToDocumentVersion: (versionId: number, text: string, actorId: number): Promise<DocumentVersion> => {
      const versionIndex = db.documentVersions.findIndex(v => v.id === versionId);
      if (versionIndex === -1) throw new Error("Document version not found");
      
      const newComment: Comment = {
          id: Date.now(),
          text,
          authorId: actorId,
          timestamp: new Date(),
      };

      const version = db.documentVersions[versionIndex];
      if (!version.comments) {
          version.comments = [];
      }
      version.comments.push(newComment);

      return simulateNetwork(version);
  },


    // Timesheets
    getTimesheetsByCompany: (companyId: number, actorId: number): Promise<Timesheet[]> => simulateNetwork(db.timesheets.filter(t => db.users.find(u => u.id === t.userId)?.companyId === companyId)),
    getTimesheetsByUser: (userId: number): Promise<Timesheet[]> => simulateNetwork(db.timesheets.filter(t => t.userId === userId)),
    getTimesheetsForManager: (managerId: number): Promise<Timesheet[]> => {
        // This is a simplification. A real app would check project assignments.
        const manager = db.users.find(u => u.id === managerId);
        if (!manager) return simulateNetwork([]);
        return simulateNetwork(db.timesheets.filter(t => db.users.find(u => u.id === t.userId)?.companyId === manager.companyId));
    },
    submitTimesheet: (timesheetData: Omit<Timesheet, 'id' | 'status'>, actorId: number): Promise<Timesheet> => {
      const newTimesheet: Timesheet = {
        ...timesheetData,
        id: Date.now(),
        status: TimesheetStatus.PENDING,
        lastModifiedBy: actorId,
      };
      db.timesheets.push(newTimesheet);
      
      // Integration: Notify managers
      const actor = db.users.find(u => u.id === actorId);
      const managers = db.users.filter(u => u.companyId === actor?.companyId && (u.role === Role.ADMIN || u.role === Role.PM));
      managers.forEach(manager => {
          createNotification({
              userId: manager.id,
              actorId: actorId,
              type: 'APPROVAL_REQUEST',
              message: `${actor?.name || 'An operative'} submitted a timesheet for your approval.`,
              isRead: false,
              timestamp: new Date(),
              link: { view: 'timesheets', targetId: newTimesheet.id }
          });
      });

      return simulateNetwork(newTimesheet);
    },
    updateTimesheetEntry: (timesheetId: number, updates: Partial<Timesheet>, actorId: number): Promise<Timesheet> => {
        const index = db.timesheets.findIndex(t => t.id === timesheetId);
        if (index === -1) throw new Error("Timesheet not found");
        if (db.timesheets[index].status !== TimesheetStatus.PENDING && db.timesheets[index].status !== TimesheetStatus.REJECTED) {
            throw new Error("Can only edit pending or rejected timesheets.");
        }
        
        const updatedTimesheet = { ...db.timesheets[index], ...updates, lastModifiedBy: actorId, status: TimesheetStatus.PENDING }; // Resubmit on edit
        db.timesheets[index] = updatedTimesheet;
        return simulateNetwork(updatedTimesheet);
    },
    updateTimesheetStatus: (timesheetId: number, status: TimesheetStatus, actorId: number, rejectionReason?: string): Promise<Timesheet> => {
        const index = db.timesheets.findIndex(t => t.id === timesheetId);
        if (index === -1) throw new Error("Timesheet not found");
        
        const updates: Partial<Timesheet> = {
            status,
            approverId: actorId,
            approvedAt: new Date(),
            rejectionReason: status === TimesheetStatus.REJECTED ? rejectionReason : undefined,
        };

        const updatedTimesheet = { ...db.timesheets[index], ...updates };
        db.timesheets[index] = updatedTimesheet;
        
        const actor = db.users.find(u => u.id === actorId);
        const targetUser = db.users.find(u => u.id === updatedTimesheet.userId);
        if (targetUser) {
            logAction(actor?.companyId, actorId, `${status.toLowerCase()}_timesheet`, { type: 'User', id: targetUser.id, name: targetUser.name });
        }

        return simulateNetwork(updatedTimesheet);
    },
    
  // Safety
  getSafetyIncidentsByCompany: (companyId: number): Promise<SafetyIncident[]> => simulateNetwork(db.safetyIncidents.filter(i => db.projects.find(p => p.id === i.projectId)?.companyId === companyId)),

  // Equipment
  getEquipmentByCompany: (companyId: number): Promise<Equipment[]> => simulateNetwork(db.equipment.filter(e => e.companyId === companyId)),
  getEquipmentHistory: (equipmentId: number): Promise<EquipmentHistory[]> => simulateNetwork(db.equipmentHistory.filter(h => h.equipmentId === equipmentId)),
  updateEquipmentStatus: (equipmentId: number, status: EquipmentStatus, actorId: number): Promise<Equipment> => {
      const index = db.equipment.findIndex(e => e.id === equipmentId);
      if (index === -1) throw new Error("Equipment not found");
      
      const oldStatus = db.equipment[index].status;
      db.equipment[index].status = status;
      db.equipment[index].projectId = status === EquipmentStatus.AVAILABLE ? null : db.equipment[index].projectId;

       db.equipmentHistory.push({
          id: Date.now(),
          equipmentId,
          action: 'Status Change',
          details: `Status changed from '${oldStatus}' to '${status}'`,
          actorId,
          timestamp: new Date()
      });

      return simulateNetwork(db.equipment[index]);
  },
  
  // Assignments
  getProjectAssignmentsByCompany: (companyId: number): Promise<ProjectAssignment[]> => {
      const companyProjects = new Set(db.projects.filter(p => p.companyId === companyId).map(p => p.id));
      return simulateNetwork(db.projectAssignments.filter(a => companyProjects.has(a.projectId)));
  },
  getResourceAssignments: (companyId: number): Promise<ResourceAssignment[]> => simulateNetwork(db.resourceAssignments.filter(a => a.companyId === companyId)),
  createResourceAssignment: (assignmentData: Omit<ResourceAssignment, 'id'>, actorId: number): Promise<ResourceAssignment> => {
      const newAssignment: ResourceAssignment = { ...assignmentData, id: Date.now() };
      db.resourceAssignments.push(newAssignment);
      
      if (assignmentData.resourceType === 'equipment') {
          const equipIndex = db.equipment.findIndex(e => e.id === assignmentData.resourceId);
          if (equipIndex !== -1) {
              db.equipment[equipIndex].status = EquipmentStatus.IN_USE;
              db.equipment[equipIndex].projectId = assignmentData.projectId;
          }
          const project = db.projects.find(p => p.id === assignmentData.projectId);
          db.equipmentHistory.push({
              id: Date.now(),
              equipmentId: assignmentData.resourceId,
              action: 'Assigned',
              details: `Assigned to ${project?.name || 'Unknown Project'}`,
              actorId: actorId,
              timestamp: new Date()
          });
      }
      return simulateNetwork(newAssignment);
  },
  deleteResourceAssignment: (assignmentId: number, actorId: number): Promise<{ success: true }> => {
      const index = db.resourceAssignments.findIndex(a => a.id === assignmentId);
      if (index === -1) throw new Error("Assignment not found");
      
      const assignment = db.resourceAssignments[index];
      if (assignment.resourceType === 'equipment') {
          const equipIndex = db.equipment.findIndex(e => e.id === assignment.resourceId);
          if (equipIndex !== -1) {
              db.equipment[equipIndex].status = EquipmentStatus.AVAILABLE;
              db.equipment[equipIndex].projectId = null;
          }
           db.equipmentHistory.push({
              id: Date.now(),
              equipmentId: assignment.resourceId,
              action: 'Unassigned',
              details: `Unassigned from project`,
              actorId: actorId,
              timestamp: new Date()
          });
      }
      
      db.resourceAssignments.splice(index, 1);
      return simulateNetwork({ success: true });
  },

  // Chat & Notifications
  getNotificationsForUser: (userId: number): Promise<Notification[]> => {
      return simulateNetwork(db.notifications.filter(n => n.userId === userId));
  },
  markNotificationAsRead: (notificationId: number, userId: number): Promise<{success: true}> => {
      const index = db.notifications.findIndex(n => n.id === notificationId && n.userId === userId);
      if(index !== -1) db.notifications[index].isRead = true;
      return simulateNetwork({success: true});
  },
  markAllNotificationsAsRead: (userId: number): Promise<{success: true}> => {
      db.notifications.forEach(n => {
          if (n.userId === userId) n.isRead = true;
      });
      return simulateNetwork({success: true});
  },
  getConversationsForUser: (userId: number): Promise<Conversation[]> => simulateNetwork(db.conversations.filter(c => c.participants.includes(userId))),
  getMessagesForConversation: (conversationId: number, readerId: number): Promise<ChatMessage[]> => {
      const conversation = db.conversations.find(c => c.id === conversationId);
      if (!conversation) return simulateNetwork([]);
      
      conversation.messages.forEach(msg => {
          if(msg.senderId !== readerId) msg.isRead = true;
      });
      if (conversation.lastMessage && conversation.lastMessage.senderId !== readerId) {
          conversation.lastMessage.isRead = true;
      }

      return simulateNetwork(conversation.messages);
  },
  sendMessage: (senderId: number, recipientId: number, content: string): Promise<{ message: ChatMessage, conversation: Conversation }> => {
        let conversation = db.conversations.find(c => c.type === 'dm' && c.participants.includes(senderId) && c.participants.includes(recipientId));
        if (!conversation) {
            conversation = {
                id: Date.now(),
                type: 'dm',
                participants: [senderId, recipientId],
                messages: [],
                lastMessage: null,
            };
            db.conversations.push(conversation);
        }

        const newMessage: ChatMessage = {
            id: Date.now() + 1,
            conversationId: conversation.id,
            senderId,
            content,
            timestamp: new Date(),
            isRead: false,
        };
        
        conversation.messages.push(newMessage);
        conversation.lastMessage = newMessage;

        // Integration: Create notification for recipient
        const sender = db.users.find(u => u.id === senderId);
        createNotification({
            userId: recipientId,
            actorId: senderId,
            type: 'NEW_MESSAGE',
            message: `You have a new message from ${sender?.name || 'Someone'}.`,
            isRead: false,
            timestamp: new Date(),
            link: { view: 'chat', targetId: conversation.id },
        });

        return simulateNetwork({ message: newMessage, conversation });
  },

  // Financials
  getClientsByCompany: (companyId: number): Promise<Client[]> => simulateNetwork(db.clients.filter(c => c.companyId === companyId)),
  getInvoicesByCompany: (companyId: number): Promise<Invoice[]> => {
    const projectIds = new Set(db.projects.filter(p => p.companyId === companyId).map(p => p.id));
    return simulateNetwork(db.invoices.filter(i => projectIds.has(i.projectId)));
  },
  getQuotesByCompany: (companyId: number): Promise<Quote[]> => {
    const projectIds = new Set(db.projects.filter(p => p.companyId === companyId).map(p => p.id));
    return simulateNetwork(db.quotes.filter(q => projectIds.has(q.projectId)));
  },
  getExpensesByCompany: (companyId: number): Promise<Expense[]> => {
    const userIds = new Set(db.users.filter(u => u.companyId === companyId).map(u => u.id));
    return simulateNetwork(db.expenses.filter(e => userIds.has(e.userId)));
  },
  createExpense: (expenseData: Omit<Expense, 'id' | 'status' | 'submittedAt'>): Promise<Expense> => {
      const newExpense: Expense = {
          ...expenseData,
          id: Date.now(),
          status: ExpenseStatus.PENDING,
          submittedAt: new Date(),
      };
      db.expenses.push(newExpense);
      return simulateNetwork(newExpense);
  },
  updateExpenseStatus: (expenseId: number, status: ExpenseStatus, actorId: number, rejectionReason?: string): Promise<Expense> => {
      const index = db.expenses.findIndex(e => e.id === expenseId);
      if(index === -1) throw new Error("Expense not found");
      const updatedExpense: Expense = {
          ...db.expenses[index],
          status,
          approverId: actorId,
          approvedAt: new Date(),
          rejectionReason: status === ExpenseStatus.REJECTED ? rejectionReason : undefined,
      };
      db.expenses[index] = updatedExpense;
      return simulateNetwork(updatedExpense);
  },
  recordPayment: (invoiceId: number, amount: number, paymentDate: Date, method: Payment['method'], actorId: number): Promise<Invoice> => {
      const invoiceIndex = db.invoices.findIndex(i => i.id === invoiceId);
      if(invoiceIndex === -1) throw new Error("Invoice not found");
      const newPayment: Payment = { id: Date.now(), invoiceId, amount, paymentDate, method };
      db.payments.push(newPayment);
      
      const invoice = db.invoices[invoiceIndex];
      invoice.amountPaid += amount;
      
      if (invoice.amountPaid >= invoice.total) {
          invoice.status = InvoiceStatus.PAID;
          invoice.paidAt = paymentDate;
      } else if (invoice.amountPaid > 0) {
          invoice.status = InvoiceStatus.PARTIALLY_PAID;
      }
      
      return simulateNetwork(invoice);
  },
  generateInvoiceFromProjectData: (projectId: number, actorId: number): Promise<Invoice> => {
      const project = db.projects.find(p => p.id === projectId);
      if(!project) throw new Error("Project not found");
      
      const unbilledTimesheets = db.timesheets.filter(t => t.projectId === projectId && !t.billedInInvoiceId && t.status === TimesheetStatus.APPROVED);
      if (unbilledTimesheets.length === 0) throw new Error("No approved, unbilled timesheets found for this project.");

      const newInvoiceId = Date.now();
      const lineItems = unbilledTimesheets.map((t, i) => {
          const user = db.users.find(u => u.id === t.userId);
          const hours = t.clockOut ? (new Date(t.clockOut).getTime() - new Date(t.clockIn).getTime()) / 3600000 : 0;
          const rate = user?.role === Role.FOREMAN ? 75 : 50; // Mock rates
          return {
              id: i,
              description: `Labor: ${user?.name} on ${new Date(t.clockIn).toLocaleDateString()}`,
              quantity: parseFloat(hours.toFixed(2)),
              unitPrice: rate,
              total: parseFloat((hours * rate).toFixed(2))
          };
      });

      const subtotal = lineItems.reduce((acc, item) => acc + item.total, 0);
      const taxAmount = subtotal * 0.20; // 20% VAT
      const total = subtotal + taxAmount;
      
      const newInvoice: Invoice = {
          id: newInvoiceId,
          invoiceNumber: `INV-${String(newInvoiceId).slice(-4)}`,
          clientId: 1, // Mock client
          projectId,
          status: InvoiceStatus.DRAFT,
          issuedAt: new Date(),
          dueAt: new Date(new Date().setDate(new Date().getDate() + 30)),
          lineItems,
          subtotal,
          taxAmount,
          total,
          amountPaid: 0,
      };

      db.invoices.push(newInvoice);
      // Mark timesheets as billed
      unbilledTimesheets.forEach(t => {
          const tsIndex = db.timesheets.findIndex(ts => ts.id === t.id);
          if (tsIndex !== -1) db.timesheets[tsIndex].billedInInvoiceId = newInvoiceId;
      });

      return simulateNetwork(newInvoice);
  },
  getFinancialKPIsForCompany: (companyId: number): Promise<FinancialKPIs> => simulateNetwork({ profitability: 12.5, projectMargin: 18.2, cashFlow: 1250340, currency: 'GBP' }),
  getMonthlyFinancials: (companyId: number): Promise<MonthlyFinancials[]> => simulateNetwork([
      { month: 'Jan', revenue: 350000, costs: 280000, profit: 70000 },
      { month: 'Feb', revenue: 420000, costs: 340000, profit: 80000 },
      { month: 'Mar', revenue: 380000, costs: 300000, profit: 80000 },
  ]),
  getCostBreakdown: (companyId: number): Promise<CostBreakdown[]> => simulateNetwork([
      { category: 'Labor', amount: 820000 },
      { category: 'Materials', amount: 1200000 },
      { category: 'Subcontractors', amount: 650000 },
      { category: 'Overheads', amount: 250000 },
  ]),

  // Templates
  getProjectTemplates: (companyId: number): Promise<ProjectTemplate[]> => simulateNetwork(db.projectTemplates.filter(t => t.companyId === companyId)),
  
  // Audit & Dashboard
  getAuditLogsByCompany: (companyId: number): Promise<AuditLog[]> => {
    const settings = db.companySettings.find(s => s.companyId === companyId);
    const retentionDays = settings?.dataRetention.retentionPeriodDays || -1;
    
    if (retentionDays === -1) {
        return simulateNetwork(db.auditLogs.filter(log => log.companyId === companyId));
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const filteredLogs = db.auditLogs.filter(log => log.companyId === companyId && new Date(log.timestamp) >= cutoffDate);
    return simulateNetwork(filteredLogs);
  },
  // FIX: Added missing getAuditLogsByActorId function required by the TeamView component.
  getAuditLogsByActorId: (actorId: number): Promise<AuditLog[]> => {
    return simulateNetwork(db.auditLogs.filter(log => log.actorId === actorId));
  },
  getDashboardActivityLogs: (companyId: number): Promise<AuditLog[]> => {
    return simulateNetwork(db.auditLogs.filter(log => log.companyId === companyId).slice(0, 10));
  },

  // AI & GenAI Tools
   searchAcrossDocuments: async (query: string, projectIds: number[], userId: number): Promise<AISearchResult> => {
    // This is a mock. In a real app, you would use an embedding-based search or send documents to a GenAI model.
    await new Promise(resolve => setTimeout(resolve, 1500));
    const docsToSearch = db.documents.filter(d => projectIds.includes(d.projectId));
    if (docsToSearch.length === 0) return { summary: "No relevant documents found to search.", sources: [] };

    return {
      summary: `Based on the documents for the selected projects, the rebar specification requires Grade B500B steel, and the deadline for the structural inspection is set for the 15th of next month. The primary safety procedure mentioned is the 'Lock-out/Tag-out' protocol for all machinery.`,
      sources: [
        { documentId: docsToSearch[0].id, snippet: "...the B500B grade steel must be used for all primary structural rebar..." },
        { documentId: docsToSearch[1].id, snippet: "...ensure all personnel follow the Lock-out/Tag-out protocol..." },
      ]
    };
  },
   generateDailySummary: async (projectId: number, date: Date, userId: number): Promise<string> => {
       await new Promise(resolve => setTimeout(resolve, 1500));
       const project = db.projects.find(p => p.id === projectId);
       return `**Daily Summary for ${project?.name} - ${date.toLocaleDateString()}**\n\n- **Progress:** Completed foundation work for Block C. Started steel frame erection on Block B.\n- **Issues:** Delay in concrete delivery (2 hours) due to traffic. No major impact.\n- **Safety:** One minor incident reported (scraped hand), first aid administered. Daily safety briefing completed.\n- **Next Steps:** Continue steel frame erection. Begin plumbing rough-in on Block C.`
   },
   findGrants: async(keywords: string, location: string): Promise<Grant[]> => {
       await new Promise(resolve => setTimeout(resolve, 1500));
       return [
            { id: 1, name: "Green Construction Grant", agency: "Gov.uk", amount: "£50,000 - £250,000", description: "For projects utilizing sustainable materials and green energy solutions.", url: "#" },
            { id: 2, name: "SME Builders Fund", agency: "National Builders Association", amount: "Up to £20,000", description: "A fund to help small and medium-sized construction companies adopt new technology.", url: "#" },
       ]
   },
   analyzeForRisks: async (text: string): Promise<RiskAnalysis> => {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return {
            summary: "The text contains a potential financial risk related to an uncapped materials cost clause and a compliance risk due to ambiguous wording around waste disposal regulations.",
            identifiedRisks: [
                { severity: 'Medium', description: "Materials cost clause 'at current market rates' is open to fluctuation.", recommendation: "Amend clause to include a 'not to exceed' limit or a fixed price." },
                { severity: 'Low', description: "Mention of 'standard waste disposal' may not meet new environmental regulations.", recommendation: "Specify compliance with ISO 14001 or local equivalent." },
            ]
        }
   },
   generateBidPackage: async (tenderUrl: string, companyStrengths: string, userId: number): Promise<BidPackage> => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
            summary: `This bid is for the Downtown Tower Renovation. Our company, ConstructCo, offers a competitive advantage through our expertise in ${companyStrengths}. We propose a timeline of 18 months with a focus on safety and quality.`,
            coverLetter: `Dear Sir/Madam,\n\nPlease find enclosed our bid for the Downtown Tower Renovation. With our experience in ${companyStrengths}, we are confident we can deliver this project on time and within budget.\n\nSincerely,\nAlice Admin`,
            checklist: ["Completed Form of Tender", "Pricing Summary", "Project Timeline", "Proof of Insurance", "Safety Policy Document"],
        }
   },
    generateSafetyAnalysis: async (incidents: SafetyIncident[], projectId: number, userId: number): Promise<{ report: string }> => {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return { report: `**Safety Analysis for Project ${projectId}**\n\n**Trend Identified:** A recurring theme of minor slips and trips has been noted, particularly around scaffolding areas.\n\n**Recommendation:** Implement mandatory daily cleanup rota for these zones and conduct a toolbox talk on housekeeping.`}
    },
   getPlatformUsageMetrics: async (): Promise<UsageMetric[]> => {
       return simulateNetwork([
           { name: "Active Projects", value: db.projects.filter(p => p.status === 'Active').length, unit: "projects" },
           { name: "Documents Stored", value: db.documents.length, unit: "files" },
           { name: "Timesheets Processed (Last 30d)", value: 483, unit: "timesheets" },
       ])
   },
    getProjectHealth: async (project: Project, overdueTaskCount: number): Promise<ProjectHealth> => {
        const progress = project.budget > 0 ? (project.actualCost / project.budget) * 100 : 0;
        let status: ProjectHealth['status'] = 'Good';
        let summary = 'Project is on track and within budget.';

        if (progress > 100) {
            status = 'At Risk';
            summary = 'Project is over budget.';
        } else if (progress > 90 || overdueTaskCount > 5) {
            status = 'Needs Attention';
            summary = 'Project is nearing budget limits or has several overdue tasks.';
        } else if (overdueTaskCount > 0) {
            summary = 'A few tasks are overdue, but budget is healthy.'
        }
        
        return simulateNetwork({ status, summary });
    }
};