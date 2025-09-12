// full contents of services/mockData.ts

import {
  User, Project, Todo, Document, SafetyIncident, Timesheet, Equipment,
  Company, CompanySettings, Role, TodoStatus, TodoPriority, DocumentStatus,
  DocumentCategory, IncidentSeverity, IncidentStatus, TimesheetStatus, EquipmentStatus,
  UserStatus, ProjectAssignment, ResourceAssignment, Conversation, ChatMessage,
  Client, Invoice, InvoiceStatus, Quote, QuoteStatus, ProjectTemplate, AuditLog,
  Comment, EquipmentHistory, Expense, ExpenseCategory, ExpenseStatus, Payment, DocumentFolder, DocumentVersion,
  SafetyInspection, RiskAssessment, TrainingRecord, Notification
} from '../types';

let users: User[] = [
  // Platform Admin
  { id: 1, name: 'Platform Admin', email: 'platform@asagents.com', role: Role.PRINCIPAL_ADMIN, companyId: 0, twoFactorEnabled: true },
  // Company 1
  { id: 10, name: 'Alice Admin', email: 'alice@construction.com', role: Role.ADMIN, companyId: 1, avatarUrl: 'https://i.pravatar.cc/150?u=10', phone: '07123456780', twoFactorEnabled: true },
  { id: 11, name: 'Bob Manager', email: 'bob@construction.com', role: Role.PM, companyId: 1, avatarUrl: 'https://i.pravatar.cc/150?u=11', phone: '07123456781', twoFactorEnabled: false },
  { id: 12, name: 'Charlie Foreman', email: 'charlie@construction.com', role: Role.FOREMAN, companyId: 1, status: UserStatus.ON_SITE, avatarUrl: 'https://i.pravatar.cc/150?u=12', phone: '07123456782', twoFactorEnabled: false },
  { id: 13, name: 'Diana Operative', email: 'diana@construction.com', role: Role.OPERATIVE, companyId: 1, status: UserStatus.ON_SITE, avatarUrl: 'https://i.pravatar.cc/150?u=13', phone: '07123456783', twoFactorEnabled: true },
  { id: 14, name: 'Ethan Operative', email: 'ethan@construction.com', role: Role.OPERATIVE, companyId: 1, status: UserStatus.OFF_SITE, avatarUrl: 'https://i.pravatar.cc/150?u=14', phone: '07123456784', twoFactorEnabled: false },
  // Company 2
  { id: 20, name: 'Frank Admin', email: 'frank@builders.com', role: Role.ADMIN, companyId: 2, avatarUrl: 'https://i.pravatar.cc/150?u=20', phone: '07987654320' },
  { id: 21, name: 'Grace Manager', email: 'grace@builders.com', role: Role.PM, companyId: 2, avatarUrl: 'https://i.pravatar.cc/150?u=21', phone: '07987654321' },
  { id: 22, name: 'Heidi Foreman', email: 'heidi@builders.com', role: Role.FOREMAN, companyId: 2, status: UserStatus.ON_SITE, avatarUrl: 'https://i.pravatar.cc/150?u=22', phone: '07987654322' },
  { id: 23, name: 'Ivan Operative', email: 'ivan@builders.com', role: Role.OPERATIVE, companyId: 2, status: UserStatus.ON_BREAK, avatarUrl: 'https://i.pravatar.cc/150?u=23', phone: '07987654323' },
];

let companies: Company[] = [
  { id: 1, name: 'ConstructCo', status: 'Active', subscriptionPlan: 'Pro', storageUsageGB: 25.4 },
  { id: 2, name: 'Apex Builders', status: 'Active', subscriptionPlan: 'Basic', storageUsageGB: 8.1 },
  { id: 3, name: 'Horizon Developers', status: 'Suspended', subscriptionPlan: 'Enterprise', storageUsageGB: 150.8 },
];

let companySettings: CompanySettings[] = [
  { companyId: 1, theme: 'light', notificationPreferences: { projectUpdates: true, timeReminders: true, photoRequirements: false }, locationPreferences: { backgroundTracking: true, gpsAccuracy: 'high' }, localization: { timezone: 'Europe/London', language: 'en-GB', dateFormat: 'DD/MM/YYYY' } },
  { companyId: 2, theme: 'dark', notificationPreferences: { projectUpdates: true, timeReminders: false, photoRequirements: true }, locationPreferences: { backgroundTracking: false, gpsAccuracy: 'standard' }, localization: { timezone: 'America/New_York', language: 'en-US', dateFormat: 'MM/DD/YYYY' } },
  { companyId: 3, theme: 'light', notificationPreferences: { projectUpdates: false, timeReminders: false, photoRequirements: false }, locationPreferences: { backgroundTracking: true, gpsAccuracy: 'high' }, localization: { timezone: 'Europe/London', language: 'en-GB', dateFormat: 'DD/MM/YYYY' } },
];

let projects: Project[] = [
  { id: 101, companyId: 1, name: 'Downtown Tower Renovation', location: { address: '123 High Street, London', lat: 51.5074, lng: -0.1278 }, budget: 5000000, actualCost: 2300000, startDate: new Date('2023-01-15'), status: 'Active', imageUrl: 'https://picsum.photos/seed/tower/800/400', projectType: 'Commercial Renovation', workClassification: 'General Contracting', geofenceRadius: 150 },
  { id: 102, companyId: 1, name: 'Greenwood residential complex', location: { address: '456 Oak Avenue, Manchester', lat: 53.4808, lng: -2.2426 }, budget: 12000000, actualCost: 12500000, startDate: new Date('2022-06-01'), status: 'Completed', imageUrl: 'https://picsum.photos/seed/complex/800/400', projectType: 'Residential Construction', workClassification: 'Design-Build' },
  { id: 103, companyId: 1, name: 'City general Hospital Wing', location: { address: '789 Elm Road, London', lat: 51.5171, lng: -0.1062 }, budget: 8500000, actualCost: 4000000, startDate: new Date('2023-03-20'), status: 'Active', imageUrl: 'https://picsum.photos/seed/hospital/800/400', projectType: 'Healthcare Construction', workClassification: 'Construction Management' },
  { id: 201, companyId: 2, name: 'Oceanview Luxury Homes', location: { address: '101 Coastline Drive, Brighton', lat: 50.8225, lng: -0.1372 }, budget: 2500000, actualCost: 1200000, startDate: new Date('2023-05-10'), status: 'Active', imageUrl: 'https://picsum.photos/seed/ocean/800/400', projectType: 'Residential Construction', workClassification: 'General Contracting', geofenceRadius: 200 },
  { id: 202, companyId: 2, name: 'North Industrial Park Warehouse', location: { address: '222 Industrial Way, Liverpool', lat: 53.4084, lng: -2.9916 }, budget: 1800000, actualCost: 1950000, startDate: new Date('2022-11-01'), status: 'Completed', imageUrl: 'https://picsum.photos/seed/warehouse/800/400', projectType: 'Industrial Construction', workClassification: 'General Contracting' },
];

let todos: Todo[] = [
  // Project 101
  { id: 1, text: 'Finalize structural steel drawings', projectId: 101, assigneeId: 11, creatorId: 10, status: TodoStatus.DONE, priority: TodoPriority.HIGH, dueDate: new Date('2023-09-25'), completedAt: new Date('2023-09-24'), completedBy: 11 },
  { id: 2, text: 'Procure HVAC units', projectId: 101, assigneeId: 11, creatorId: 10, status: TodoStatus.IN_PROGRESS, priority: TodoPriority.HIGH, dueDate: new Date('2023-10-20'), dependsOn: [1] },
  { id: 3, text: 'Install 1st floor exterior windows', projectId: 101, assigneeId: 12, creatorId: 11, status: TodoStatus.TODO, priority: TodoPriority.MEDIUM, dueDate: new Date('2023-10-15'), subTasks: [{id:1, text:'West wall', isCompleted:false}, {id:2, text:'East wall', isCompleted:false}], comments: [{id: 1, text:'Weather delay expected on Friday.', authorId: 12, timestamp: new Date()}] },
  { id: 4, text: 'Daily site cleanup', projectId: 101, assigneeId: 13, creatorId: 12, status: TodoStatus.IN_PROGRESS, priority: TodoPriority.LOW, dueDate: null },
  { id: 5, text: 'Submit weekly progress report', projectId: 101, assigneeId: 11, creatorId: 10, status: TodoStatus.TODO, priority: TodoPriority.MEDIUM, dueDate: new Date(new Date().setDate(new Date().getDate() + 2))},
  // Project 103
  { id: 6, text: 'Complete foundation pouring', projectId: 103, assigneeId: 12, creatorId: 11, status: TodoStatus.DONE, priority: TodoPriority.HIGH, dueDate: new Date('2023-09-30'), completedAt: new Date('2023-09-29'), completedBy: 12 },
  { id: 7, text: 'Run electrical conduits on ground floor', projectId: 103, assigneeId: 13, creatorId: 12, status: TodoStatus.IN_PROGRESS, priority: TodoPriority.MEDIUM, dueDate: new Date('2023-10-10') },
  // Project 201
  { id: 8, text: 'Excavate for pool', projectId: 201, assigneeId: 22, creatorId: 21, status: TodoStatus.TODO, priority: TodoPriority.HIGH, dueDate: new Date('2023-10-05') },
];

// All other data arrays are initialized from here...
let documents: Document[] = [];
let documentFolders: DocumentFolder[] = [];
let documentVersions: DocumentVersion[] = [];
let comments: Comment[] = [];
let safetyIncidents: SafetyIncident[] = [];
let safetyInspections: SafetyInspection[] = [];
let riskAssessments: RiskAssessment[] = [];
let trainingRecords: TrainingRecord[] = [];
let timesheets: Timesheet[] = [
    { id: 1, userId: 13, projectId: 101, clockIn: new Date('2023-10-02T08:00:00'), clockOut: new Date('2023-10-02T16:30:00'), status: TimesheetStatus.APPROVED, approverId: 12, approvedAt: new Date('2023-10-03') },
    { id: 2, userId: 14, projectId: 101, clockIn: new Date('2023-10-02T08:05:00'), clockOut: new Date('2023-10-02T16:30:00'), status: TimesheetStatus.PENDING },
    { id: 3, userId: 12, projectId: 101, clockIn: new Date('2023-10-02T07:30:00'), clockOut: new Date('2023-10-02T17:00:00'), status: TimesheetStatus.APPROVED, approverId: 11, approvedAt: new Date('2023-10-03') },
    { id: 4, userId: 23, projectId: 201, clockIn: new Date('2023-10-02T09:00:00'), clockOut: new Date('2023-10-02T17:00:00'), status: TimesheetStatus.REJECTED, approverId: 22, rejectionReason: 'Incorrect project selected.' },
];
let equipment: Equipment[] = [];
let equipmentHistory: EquipmentHistory[] = [];
let projectAssignments: ProjectAssignment[] = [
    { id: 1, userId: 11, projectId: 101 }, { id: 2, userId: 11, projectId: 102 }, { id: 3, userId: 11, projectId: 103 },
    { id: 4, userId: 12, projectId: 101 }, { id: 5, userId: 12, projectId: 103 },
    { id: 6, userId: 13, projectId: 101 }, { id: 7, userId: 13, projectId: 103 },
    { id: 8, userId: 14, projectId: 101 },
    { id: 9, userId: 21, projectId: 201 }, { id: 10, userId: 21, projectId: 202 },
    { id: 11, userId: 22, projectId: 201 },
    { id: 12, userId: 23, projectId: 201 },
];
let resourceAssignments: ResourceAssignment[] = [];
let conversations: Conversation[] = [];
let chatMessages: ChatMessage[] = [];
let clients: Client[] = [];
let invoices: Invoice[] = [];
let quotes: Quote[] = [];
let projectTemplates: ProjectTemplate[] = [];
let auditLogs: AuditLog[] = [
    { id: 1, actorId: 12, action: 'completed_task', target: { type: 'Todo', id: 1, name: 'Finalize structural steel drawings' }, timestamp: new Date('2023-09-24T14:00:00Z') },
    { id: 2, actorId: 10, action: 'uploaded_document', target: { type: 'Document', id: 1, name: 'Q4 Financial Report' }, timestamp: new Date(Date.now() - 3600000 * 2) }, // 2 hours ago
    { id: 3, actorId: 22, action: 'reported_safety_incident', target: { type: 'SafetyIncident', id: 1, name: 'Minor slip on wet surface' }, timestamp: new Date(Date.now() - 3600000 * 5) },
    { id: 4, actorId: 11, action: 'approved_timesheet', target: { type: 'Timesheet', id: 1, name: 'Diana Operative - 8.5hrs' }, timestamp: new Date(Date.now() - 3600000 * 24) },
    { id: 5, actorId: 10, action: 'created_project', target: { type: 'Project', id: 103, name: 'City General Hospital Wing' }, timestamp: new Date(Date.now() - 3600000 * 72) },
];
let expenses: Expense[] = [];
let payments: Payment[] = [];
let notifications: Notification[] = [
    { id: 1, userId: 11, type: 'APPROVAL_REQUEST', message: "Ethan Operative submitted a timesheet for your approval.", isRead: false, timestamp: new Date(Date.now() - 3600000), link: { view: 'timesheets' }, actorId: 14 },
    { id: 2, userId: 10, type: 'APPROVAL_REQUEST', message: "Ethan Operative submitted a timesheet for your approval.", isRead: true, timestamp: new Date(Date.now() - 3600000), link: { view: 'timesheets' }, actorId: 14 },
    { id: 3, userId: 12, type: 'TASK_ASSIGNED', message: "You were assigned a new task: Install 1st floor exterior windows", isRead: false, timestamp: new Date(Date.now() - 3600000 * 4), link: { view: 'all-tasks', targetId: 3 }, actorId: 11 },
    { id: 4, userId: 10, type: 'NEW_MESSAGE', message: "Bob Manager sent you a new message.", isRead: false, timestamp: new Date(Date.now() - 60000 * 5), link: { view: 'chat', targetId: 1 }, actorId: 11 },
];


export const db = {
    users,
    companies,
    companySettings,
    projects,
    todos,
    documents,
    safetyIncidents,
    timesheets,
    equipment,
    projectAssignments,
    resourceAssignments,
    conversations,
    chatMessages,
    clients,
    invoices,
    quotes,
    projectTemplates,
    auditLogs,
    comments,
    equipmentHistory,
    expenses,
    payments,
    documentFolders,
    documentVersions,
    safetyInspections,
    riskAssessments,
    trainingRecords,
    notifications,
};