// FIX: Implemented full type definitions for the application.

export type View =
  | 'dashboard'
  | 'my-day'
  | 'foreman-dashboard'
  | 'principal-dashboard'
  | 'projects'
  | 'all-tasks'
  | 'map'
  | 'time'
  | 'timesheets'
  | 'documents'
  | 'safety'
  | 'financials'
  | 'users'
  | 'equipment'
  | 'templates'
  | 'tools'
  | 'audit-log'
  | 'settings'
  | 'chat'
  | 'clients'
  | 'invoices';

export enum Role {
  PRINCIPAL_ADMIN = 'Principal Admin',
  ADMIN = 'Admin',
  PM = 'Project Manager',
  FOREMAN = 'Foreman',
  OPERATIVE = 'Operative',
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  companyId: number | null; // null for PRINCIPAL_ADMIN
  avatarUrl?: string;
}

export interface Company {
    id: number;
    name: string;
    status: 'Active' | 'Suspended';
    subscriptionPlan: 'Basic' | 'Pro' | 'Enterprise';
    storageUsageGB: number;
}

export interface Location {
  address: string;
  lat: number;
  lng: number;
}

export interface Project {
  // FIX: Changed id to `number | string` to support temporary string IDs for optimistic UI updates.
  id: number | string;
  companyId: number;
  name: string;
  location: Location;
  budget: number;
  actualCost: number;
  startDate: Date;
  status: 'Planning' | 'Active' | 'Completed' | 'On Hold';
  imageUrl: string;
  projectType: string;
  workClassification: string;
  geofenceRadius?: number; // in meters
}

export enum TodoStatus {
  TODO = 'To Do',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done',
}

export enum TodoPriority {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

export interface Todo {
  // FIX: Changed id to `number | string` to support temporary string IDs for optimistic UI updates.
  id: number | string;
  // FIX: Changed projectId to `number | string` to support temporary string IDs for optimistic UI updates.
  projectId: number | string;
  text: string;
  status: TodoStatus;
  priority: TodoPriority;
  assigneeId: number | null;
  dueDate: Date | null;
  completedAt?: Date;
  completedBy?: number;
  reminderAt?: Date;
  dependsOn?: (number | string)[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum TimesheetStatus {
    PENDING = 'Pending',
    APPROVED = 'Approved',
    REJECTED = 'Rejected',
    DRAFT = 'Draft',
}

export interface Timesheet {
    id: number;
    userId: number;
    // FIX: Changed projectId to `number | string` to support temporary string IDs for optimistic UI updates.
    projectId: number | string;
    clockIn: Date;
    clockOut: Date | null;
    status: TimesheetStatus;
    notes?: string;
    rejectionReason?: string;
}

export enum IncidentStatus {
    REPORTED = 'Reported',
    UNDER_INVESTIGATION = 'Under Investigation',
    RESOLVED = 'Resolved',
}

export enum IncidentSeverity {
    LOW = 'Low',
    MEDIUM = 'Medium',
    HIGH = 'High',
    CRITICAL = 'Critical',
}

export interface SafetyIncident {
    id: number;
    companyId: number;
    // FIX: Changed projectId to `number | string` to support temporary string IDs for optimistic UI updates.
    projectId: number | string;
    description: string;
    timestamp: Date;
    status: IncidentStatus;
    severity: IncidentSeverity;
    reportedById: number;
}

export enum Permission {
  // Projects
  VIEW_ALL_PROJECTS = 'VIEW_ALL_PROJECTS',
  VIEW_ASSIGNED_PROJECTS = 'VIEW_ASSIGNED_PROJECTS',
  CREATE_PROJECT = 'CREATE_PROJECT',
  MANAGE_PROJECT_DETAILS = 'MANAGE_PROJECT_DETAILS',
  MANAGE_PROJECT_TEMPLATES = 'MANAGE_PROJECT_TEMPLATES',
  
  // Tasks
  VIEW_ALL_TASKS = 'VIEW_ALL_TASKS',
  MANAGE_ALL_TASKS = 'MANAGE_ALL_TASKS',
  ASSIGN_TASKS = 'ASSIGN_TASKS',

  // Timesheets
  SUBMIT_TIMESHEET = 'SUBMIT_TIMESHEET',
  VIEW_ALL_TIMESHEETS = 'VIEW_ALL_TIMESHEETS',
  MANAGE_TIMESHEETS = 'MANAGE_TIMESHEETS',

  // Safety
  SUBMIT_SAFETY_REPORT = 'SUBMIT_SAFETY_REPORT',
  VIEW_SAFETY_REPORTS = 'VIEW_SAFETY_REPORTS',
  MANAGE_SAFETY_REPORTS = 'MANAGE_SAFETY_REPORTS',

  // Finances
  VIEW_FINANCES = 'VIEW_FINANCES',
  MANAGE_FINANCES = 'MANAGE_FINANCES',
  SUBMIT_EXPENSE = 'SUBMIT_EXPENSE',
  MANAGE_EXPENSES = 'MANAGE_EXPENSES',
  
  // Team
  VIEW_TEAM = 'VIEW_TEAM',
  MANAGE_TEAM = 'MANAGE_TEAM',

  // Documents
  VIEW_DOCUMENTS = 'VIEW_DOCUMENTS',
  UPLOAD_DOCUMENTS = 'UPLOAD_DOCUMENTS',
  MANAGE_DOCUMENTS = 'MANAGE_DOCUMENTS',

  // Equipment
  MANAGE_EQUIPMENT = 'MANAGE_EQUIPMENT',

  // Tools
  ACCESS_ALL_TOOLS = 'ACCESS_ALL_TOOLS',

  // System
  VIEW_AUDIT_LOG = 'VIEW_AUDIT_LOG',

  // Chat
  SEND_DIRECT_MESSAGE = 'SEND_DIRECT_MESSAGE',
}

export const RolePermissions: Record<Role, Set<Permission>> = {
  [Role.PRINCIPAL_ADMIN]: new Set<Permission>(), // Special case, has all permissions
  [Role.ADMIN]: new Set<Permission>([
    Permission.VIEW_ALL_PROJECTS,
    Permission.CREATE_PROJECT,
    Permission.MANAGE_PROJECT_DETAILS,
    Permission.MANAGE_PROJECT_TEMPLATES,
    Permission.VIEW_ALL_TASKS,
    Permission.MANAGE_ALL_TASKS,
    Permission.ASSIGN_TASKS,
    Permission.VIEW_ALL_TIMESHEETS,
    Permission.MANAGE_TIMESHEETS,
    Permission.VIEW_SAFETY_REPORTS,
    Permission.MANAGE_SAFETY_REPORTS,
    Permission.VIEW_FINANCES,
    Permission.MANAGE_FINANCES,
    Permission.MANAGE_EXPENSES,
    Permission.VIEW_TEAM,
    Permission.MANAGE_TEAM,
    Permission.VIEW_DOCUMENTS,
    Permission.MANAGE_DOCUMENTS,
    Permission.UPLOAD_DOCUMENTS,
    Permission.MANAGE_EQUIPMENT,
    Permission.ACCESS_ALL_TOOLS,
    Permission.VIEW_AUDIT_LOG,
    Permission.SEND_DIRECT_MESSAGE,
  ]),
  [Role.PM]: new Set<Permission>([
    Permission.VIEW_ALL_PROJECTS,
    Permission.CREATE_PROJECT,
    Permission.MANAGE_PROJECT_DETAILS,
    Permission.VIEW_ALL_TASKS,
    Permission.MANAGE_ALL_TASKS,
    Permission.ASSIGN_TASKS,
    Permission.VIEW_ALL_TIMESHEETS,
    Permission.MANAGE_TIMESHEETS,
    Permission.VIEW_SAFETY_REPORTS,
    Permission.MANAGE_SAFETY_REPORTS,
    Permission.VIEW_FINANCES,
    Permission.SUBMIT_EXPENSE,
    Permission.VIEW_TEAM,
    Permission.VIEW_DOCUMENTS,
    Permission.UPLOAD_DOCUMENTS,
    Permission.MANAGE_EQUIPMENT,
    Permission.ACCESS_ALL_TOOLS,
    Permission.SEND_DIRECT_MESSAGE,
  ]),
  [Role.FOREMAN]: new Set<Permission>([
    Permission.VIEW_ASSIGNED_PROJECTS,
    Permission.ASSIGN_TASKS,
    Permission.MANAGE_TIMESHEETS,
    Permission.SUBMIT_TIMESHEET,
    Permission.VIEW_SAFETY_REPORTS,
    Permission.SUBMIT_SAFETY_REPORT,
    Permission.SUBMIT_EXPENSE,
    Permission.VIEW_TEAM,
    Permission.VIEW_DOCUMENTS,
    Permission.SEND_DIRECT_MESSAGE,
  ]),
  [Role.OPERATIVE]: new Set<Permission>([
    Permission.VIEW_ASSIGNED_PROJECTS,
    Permission.SUBMIT_TIMESHEET,
    Permission.SUBMIT_SAFETY_REPORT,
    Permission.VIEW_DOCUMENTS,
    Permission.SEND_DIRECT_MESSAGE,
  ]),
};

export type EquipmentStatus = 'Available' | 'In Use' | 'Maintenance';

export interface Equipment {
  id: number;
  companyId: number;
  name: string;
  status: EquipmentStatus;
  // FIX: Changed projectId to `number | string | null` to support temporary string IDs for optimistic UI updates.
  projectId: number | string | null;
}

export interface ResourceAssignment {
  id: number;
  companyId: number;
  // FIX: Changed projectId to `number | string` to support temporary string IDs for optimistic UI updates.
  projectId: number | string;
  resourceId: number;
  resourceType: 'user' | 'equipment';
  startDate: Date;
  endDate: Date;
}

export interface Client {
  id: number;
  companyId: number;
  name: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: Date;
}

export interface Grant {
  id: string;
  name: string;
  agency: string;
  description: string;
  amount: string;
  url: string;
}

export interface RiskAnalysis {
  summary: string;
  identifiedRisks: {
    severity: 'Low' | 'Medium' | 'High';
    description: string;
    recommendation: string;
  }[];
}

export interface BidPackage {
  summary: string;
  coverLetter: string;
  checklist: string[];
}

export interface FinancialKPIs {
    profitability: number;
    projectMargin: number;
    cashFlow: number;
    currency: string;
}

export interface MonthlyFinancials {
    month: string;
    revenue: number;
    profit: number;
}

export interface CostBreakdown {
    category: string;
    amount: number;
}

export enum InvoiceStatus {
    DRAFT = 'Draft',
    SENT = 'Sent',
    PAID = 'Paid',
    OVERDUE = 'Overdue',
}

export interface Invoice {
    id: number;
    companyId: number;
    clientId: number;
    // FIX: Changed projectId to `number | string` to support temporary string IDs for optimistic UI updates.
    projectId: number | string;
    invoiceNumber: string;
    issuedAt: Date;
    dueAt: Date;
    total: number;
    amountPaid: number;
    status: InvoiceStatus;
}

export enum QuoteStatus {
    DRAFT = 'Draft',
    SENT = 'Sent',
    ACCEPTED = 'Accepted',
    REJECTED = 'Rejected',
}

export interface Quote {
    id: number;
    companyId: number;
    clientId: number;
    // FIX: Changed projectId to `number | string` to support temporary string IDs for optimistic UI updates.
    projectId: number | string;
    quoteNumber: string;
    issuedAt: Date;
    total: number;
    status: QuoteStatus;
}

export enum ExpenseCategory {
    MATERIALS = 'Materials',
    LABOR = 'Labor',
    EQUIPMENT = 'Equipment',
    TRAVEL = 'Travel',
    OTHER = 'Other',
}

export enum ExpenseStatus {
    PENDING = 'Pending',
    APPROVED = 'Approved',
    REJECTED = 'Rejected',
}

export interface Expense {
    // FIX: Changed id to `number | string` to support temporary string IDs for optimistic UI updates.
    id: number | string;
    companyId: number;
    userId: number;
    // FIX: Changed projectId to `number | string` to support temporary string IDs for optimistic UI updates.
    projectId: number | string;
    amount: number;
    currency: string;
    description: string;
    category: ExpenseCategory;
    status: ExpenseStatus;
    submittedAt: Date;
}

export interface ProjectTemplate {
    id: number;
    companyId: number;
    name: string;
    description: string;
    templateTasks: Partial<Todo>[];
    documentCategories: string[];
}

export interface SystemHealth {
    status: 'OK' | 'DEGRADED' | 'DOWN';
    message: string;
}

export interface UsageMetric {
    name: string;
    value: number;
    unit: string;
}

export enum NotificationType {
    APPROVAL_REQUEST = 'APPROVAL_REQUEST',
    TASK_ASSIGNED = 'TASK_ASSIGNED',
    NEW_MESSAGE = 'NEW_MESSAGE',
    DOCUMENT_COMMENT = 'DOCUMENT_COMMENT',
    SAFETY_ALERT = 'SAFETY_ALERT',
}

export interface Notification {
    id: number;
    userId: number;
    type: NotificationType;
    message: string;
    isRead: boolean;
    timestamp: Date;
    relatedEntity?: {
        type: string;
        id: number;
    };
}

export interface AuditLog {
    id: number;
    companyId: number;
    actorId: number;
    action: string;
    timestamp: Date;
    target?: {
        type: string;
        id: number | string;
        name: string;
    };
}

export interface Message {
    id: string;
    conversationId: string;
    senderId: number;
    content: string;
    timestamp: Date;
    isRead: boolean;
}

export interface Conversation {
    id: string;
    participantIds: number[];
    lastMessage: Message | null;
}

export interface Document {
    id: number;
    companyId: number;
    // FIX: Changed projectId to `number | string` to support temporary string IDs for optimistic UI updates.
    projectId: number | string;
    name: string;
    url: string;
    category: string;
    uploadedAt: Date;
    uploadedById: number;
    version: number;
}

export interface ProjectAssignment {
    id: number;
    // FIX: Changed projectId to `number | string` to support temporary string IDs for optimistic UI updates.
    projectId: number | string;
    userId: number;
}

// FIX: Added missing DocumentStatus enum.
export enum DocumentStatus {
    DRAFT = 'Draft',
    IN_REVIEW = 'In Review',
    APPROVED = 'Approved',
}

// FIX: Added missing CompanySettings interface.
export interface CompanySettings {
    theme: 'light' | 'dark';
    accessibility: {
        highContrast: boolean;
    };
}