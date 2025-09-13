// full contents of types.ts

export type View =
  | 'dashboard'
  | 'my-day'
  | 'projects'
  | 'documents'
  | 'safety'
  | 'timesheets'
  | 'time'
  | 'settings'
  | 'users'
  | 'chat'
  | 'tools'
  | 'financials'
  | 'equipment'
  | 'templates'
  | 'all-tasks'
  | 'map'
  | 'principal-dashboard'
  | 'foreman-dashboard'
  | 'audit-log';

export enum Role {
  PRINCIPAL_ADMIN = 'Principal Admin',
  ADMIN = 'Company Admin',
  PM = 'Project Manager',
  FOREMAN = 'Foreman',
  OPERATIVE = 'Operative',
}

export enum UserStatus {
    ON_SITE = 'On Site',
    ON_BREAK = 'On Break',
    OFF_SITE = 'Off Site',
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  companyId: number | null;
  avatarUrl?: string;
  phone?: string;
  status?: UserStatus;
  twoFactorEnabled?: boolean;
  presence?: 'online' | 'away' | 'offline';
}

export interface Company {
  id: number;
  name: string;
  status: 'Active' | 'Suspended' | 'Pending';
  subscriptionPlan: 'Basic' | 'Pro' | 'Enterprise';
  storageUsageGB: number;
}

export interface Location {
  address: string;
  lat: number;
  lng: number;
}

export interface Project {
  id: number;
  companyId: number;
  name: string;
  location: Location;
  budget: number;
  actualCost: number;
  startDate: Date;
  status: 'Active' | 'On Hold' | 'Completed';
  imageUrl: string;
  projectType: string;
  workClassification: string;
  geofenceRadius?: number;
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

export interface SubTask {
  id: number;
  text: string;
  isCompleted: boolean;
}

export interface Comment {
  id: number;
  text: string;
  authorId: number;
  timestamp: Date;
}

export interface Todo {
  id: number | string;
  text: string;
  projectId: number;
  assigneeId: number | null;
  creatorId: number;
  status: TodoStatus;
  priority: TodoPriority;
  dueDate: Date | null;
  subTasks?: SubTask[];
  comments?: Comment[];
  dependsOn?: (number | string)[]; // Array of Todo IDs
  reminderAt?: Date;
  completedBy?: number;
  completedAt?: Date;
}

export enum DocumentStatus {
    DRAFT = 'Draft',
    PENDING_APPROVAL = 'Pending Approval',
    APPROVED = 'Approved',
    CHANGES_REQUESTED = 'Changes Requested',
    ARCHIVED = 'Archived',
}

export enum DocumentCategory {
  PLANS = 'Plans',
  PERMITS = 'Permits',
  INVOICES = 'Invoices',
  REPORTS = 'Reports',
  PHOTOS = 'Photos',
}

export interface DocumentVersion {
    id: number;
    documentId: number;
    versionNumber: number;
    url: string;
    uploaderId: number;
    uploadedAt: Date;
    changeNotes?: string;
    status: DocumentStatus;
    comments?: Comment[];
}

export interface Document {
  id: number;
  name: string;
  projectId: number;
  folderId: number | null;
  category: DocumentCategory;
  latestVersionNumber: number;
  status: DocumentStatus; // Status of the latest version
  updatedAt: Date; // Timestamp of the latest version
}

export interface DocumentFolder {
    id: number;
    name: string;
    projectId: number;
    parentId: number | null;
    companyId: number;
}

export enum IncidentSeverity {
  CRITICAL = 'Critical',
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

export enum IncidentStatus {
  REPORTED = 'Reported',
  UNDER_REVIEW = 'Under Review',
  RESOLVED = 'Resolved',
}

export interface SafetyIncident {
  id: number;
  description: string;
  projectId: number;
  reporterId: number;
  timestamp: Date;
  severity: IncidentSeverity;
  status: IncidentStatus;
  investigationNotes?: string;
  rootCause?: string;
  correctiveActions?: string[];
}

export enum TimesheetStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  FLAGGED = 'Flagged',
}

export interface Timesheet {
  id: number;
  userId: number;
  projectId: number;
  clockIn: Date;
  clockOut: Date | null;
  status: TimesheetStatus;
  notes?: string;
  rejectionReason?: string;
  approverId?: number | null;
  approvedAt?: Date | null;
  lastModifiedBy?: number | null;
  billedInInvoiceId?: number | null;
}

export enum EquipmentStatus {
    AVAILABLE = 'Available',
    IN_USE = 'In Use',
    MAINTENANCE = 'Maintenance',
}

export interface Equipment {
    id: number;
    companyId: number;
    name: string;
    type: string;
    status: EquipmentStatus;
    projectId: number | null;
    lastAssignedDate?: Date | null;
    maintenanceStartDate?: Date | null;
    estimatedAvailableDate?: Date | null;
}

export interface EquipmentHistory {
    id: number;
    equipmentId: number;
    action: 'Assigned' | 'Unassigned' | 'Status Change';
    details: string;
    actorId: number;
    timestamp: Date;
}

export interface ProjectAssignment {
  id: number;
  userId: number;
  projectId: number;
}

export interface ResourceAssignment {
    id: number;
    companyId: number;
    projectId: number;
    resourceId: number;
    resourceType: 'user' | 'equipment';
    startDate: Date;
    endDate: Date;
}

export interface ChatMessage {
    id: number;
    conversationId: number;
    senderId: number;
    content: string;
    timestamp: Date;
    isRead: boolean;
    attachment?: { name: string; url: string; type: 'image' | 'file' };
    reactions?: { emoji: string; userIds: number[] }[];
}

export interface Conversation {
    id: number;
    type: 'dm' | 'channel';
    name?: string; // For channels
    projectId?: number; // For channels
    participants: number[];
    messages: ChatMessage[];
    lastMessage: ChatMessage | null;
    typing?: number[]; // Array of user IDs currently typing
}

export interface AISearchResult {
    summary: string;
    sources: {
        documentId: number;
        snippet: string;
    }[];
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
    costs: number;
    profit: number;
}

export interface CostBreakdown {
    category: string;
    amount: number;
}


export interface NotificationPreferences {
    projectUpdates: boolean;
    timeReminders: boolean;
    photoRequirements: boolean;
}

export interface LocationPreferences {
    backgroundTracking: boolean;
    gpsAccuracy: 'standard' | 'high';
}

export interface LocalizationPreferences {
    timezone: string;
    language: 'en-GB' | 'en-US' | 'es-ES';
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY';
}

export interface UploadPreferences {
    autoStart: boolean;
}

export interface AccessibilityPreferences {
    highContrast: boolean;
}

export interface DeveloperPreferences {
    accessibilityAudit: boolean;
}

export interface DataRetentionPreferences {
    retentionPeriodDays: 90 | 180 | 365 | -1; // -1 for forever
}

export interface CompanySettings {
    companyId: number;
    theme: 'light' | 'dark';
    notificationPreferences: NotificationPreferences;
    locationPreferences: LocationPreferences;
    localization: LocalizationPreferences;
    uploadPreferences: UploadPreferences;
    accessibility: AccessibilityPreferences;
    developer: DeveloperPreferences;
    dataRetention: DataRetentionPreferences;
}

export interface Grant {
    id: number;
    name: string;
    agency: string;
    amount: string;
    description: string;
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

export interface Client {
    id: number;
    name: string;
    companyId: number;
    createdAt: Date;
    contactEmail: string;
    contactPhone: string;
}

export enum InvoiceStatus {
    PAID = 'Paid',
    SENT = 'Sent',
    OVERDUE = 'Overdue',
    DRAFT = 'Draft',
    VOID = 'Void',
    PARTIALLY_PAID = 'Partially Paid',
}

export interface InvoiceLineItem {
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface Invoice {
    id: number;
    invoiceNumber: string;
    clientId: number;
    projectId: number;
    status: InvoiceStatus;
    issuedAt: Date;
    dueAt: Date;
    lineItems: InvoiceLineItem[];
    subtotal: number;
    taxAmount: number;
    total: number;
    amountPaid: number;
    paidAt?: Date | null;
    notes?: string;
}

export enum QuoteStatus {
    ACCEPTED = 'Accepted',
    SENT = 'Sent',
    REJECTED = 'Rejected',
    DRAFT = 'Draft',
}

export interface QuoteLineItem {
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface Quote {
    id: number;
    quoteNumber: string;
    clientId: number;
    projectId: number;
    status: QuoteStatus;
    issuedAt: Date;
    validUntil: Date;
    lineItems: QuoteLineItem[];
    subtotal: number;
    taxAmount: number;
    total: number;
    notes?: string;
}

export enum ExpenseCategory {
    TRAVEL = 'Travel',
    MATERIALS = 'Materials',
    EQUIPMENT_RENTAL = 'Equipment Rental',
    SUBCONTRACTOR = 'Subcontractor',
    OTHER = 'Other',
}

export enum ExpenseStatus {
    PENDING = 'Pending',
    APPROVED = 'Approved',
    REJECTED = 'Rejected',
}

export interface Expense {
    id: number;
    userId: number;
    projectId: number;
    amount: number;
    currency: 'GBP' | 'USD' | 'EUR';
    category: ExpenseCategory;
    description: string;
    status: ExpenseStatus;
    submittedAt: Date;
    approverId?: number | null;
    approvedAt?: Date | null;
    rejectionReason?: string;
}

export interface Payment {
    id: number;
    invoiceId: number;
    amount: number;
    paymentDate: Date;
    method: 'Bank Transfer' | 'Credit Card' | 'Check';
}

export interface ProjectTemplate {
    id: number;
    companyId: number;
    name: string;
    description: string;
    templateTasks: Partial<Todo>[];
    documentCategories: DocumentCategory[];
}

export interface AuditLog {
    id: number;
    actorId: number;
    action: string;
    target?: {
        type: string;
        id: number | string;
        name: string;
    };
    timestamp: Date;
    companyId: number;
}

export interface SafetyInspectionChecklistItem {
    id: number;
    text: string;
    isChecked: boolean;
    notes?: string;
}

export interface SafetyInspection {
    id: number;
    projectId: number;
    inspectorId: number;
    date: Date;
    status: 'Scheduled' | 'In Progress' | 'Completed' | 'Overdue';
    checklist: SafetyInspectionChecklistItem[];
}

export interface RiskAssessment {
    id: number;
    projectId: number;
    description: string;
    severity: IncidentSeverity;
    probability: 'Low' | 'Medium' | 'High';
    mitigationPlan: string;
    ownerId: number;
}

export interface TrainingRecord {
    id: number;
    userId: number;
    trainingName: string;
    issuedDate: Date;
    expiryDate: Date;
}

export type NotificationType =
  | 'APPROVAL_REQUEST'
  | 'TASK_ASSIGNED'
  | 'NEW_MESSAGE'
  | 'DOCUMENT_COMMENT'
  | 'SAFETY_ALERT';

export interface NotificationLink {
  view: View;
  targetId?: number | string;
  // e.g. for chat, targetId could be conversationId
}

export interface Notification {
  id: number;
  userId: number; // The user who should receive the notification
  type: NotificationType;
  message: string; // The text content of the notification
  isRead: boolean;
  timestamp: Date;
  link: NotificationLink;
  actorId?: number; // The user who triggered the notification
}


export interface PendingApproval { id: number; type: 'Timesheet' | 'Invoice' | 'Expense'; description: string; timesheetId?: number; expenseId?: number; }
export interface SystemHealth { status: 'OK' | 'DEGRADED' | 'DOWN'; message: string; }
export interface UsageMetric { name: string; value: number; unit: string; }
export interface PlatformSettings { maintenanceMode: boolean; }
export interface CompanyHealthStats {
    totalUsers: number;
    activeProjects: number;
    storageUsageGB: number;
    storageCapacityGB: number;
}


export enum Permission {
    VIEW_DASHBOARD = 'VIEW_DASHBOARD',
    VIEW_ALL_PROJECTS = 'VIEW_ALL_PROJECTS',
    VIEW_ASSIGNED_PROJECTS = 'VIEW_ASSIGNED_PROJECTS',
    MANAGE_PROJECTS = 'MANAGE_PROJECTS',
    VIEW_ALL_TASKS = 'VIEW_ALL_TASKS',
    MANAGE_TASKS = 'MANAGE_TASKS',
    SUBMIT_TIMESHEET = 'SUBMIT_TIMESHEET',
    VIEW_OWN_TIMESHEETS = 'VIEW_OWN_TIMESHEETS',
    MANAGE_TIMESHEETS = 'MANAGE_TIMESHEETS',
    VIEW_ALL_TIMESHEETS = 'VIEW_ALL_TIMESHEETS',
    SUBMIT_EXPENSE = 'SUBMIT_EXPENSE',
    MANAGE_EXPENSES = 'MANAGE_EXPENSES',
    VIEW_DOCUMENTS = 'VIEW_DOCUMENTS',
    UPLOAD_DOCUMENTS = 'UPLOAD_DOCUMENTS',
    MANAGE_DOCUMENTS = 'MANAGE_DOCUMENTS',
    VIEW_SAFETY_REPORTS = 'VIEW_SAFETY_REPORTS',
    SUBMIT_SAFETY_REPORT = 'SUBMIT_SAFETY_REPORT',
    MANAGE_SAFETY_REPORTS = 'MANAGE_SAFETY_REports',
    MANAGE_SAFETY_INSPECTIONS = 'MANAGE_SAFETY_INSPECTIONS',
    MANAGE_RISK_ASSESSMENTS = 'MANAGE_RISK_ASSESSMENTS',
    VIEW_FINANCES = 'VIEW_FINANCES',
    MANAGE_FINANCES = 'MANAGE_FINANCES',
    VIEW_TEAM = 'VIEW_TEAM',
    MANAGE_TEAM = 'MANAGE_TEAM',
    MANAGE_EQUIPMENT = 'MANAGE_EQUIPMENT',
    MANAGE_PROJECT_TEMPLATES = 'MANAGE_PROJECT_TEMPLATES',
    ACCESS_ALL_TOOLS = 'ACCESS_ALL_TOOLS',
    SEND_DIRECT_MESSAGE = 'SEND_DIRECT_MESSAGE',
    VIEW_NOTIFICATIONS = 'VIEW_NOTIFICATIONS',
    VIEW_AUDIT_LOG = 'VIEW_AUDIT_LOG',
}

export interface ProjectHealth {
    status: 'Good' | 'Needs Attention' | 'At Risk';
    summary: string;
}

export const RolePermissions: Record<Role, Set<Permission>> = {
    [Role.PRINCIPAL_ADMIN]: new Set(Object.values(Permission)), // Has all permissions implicitly
    [Role.ADMIN]: new Set([
        Permission.VIEW_DASHBOARD,
        Permission.VIEW_ALL_PROJECTS,
        Permission.MANAGE_PROJECTS,
        Permission.VIEW_ALL_TASKS,
        Permission.MANAGE_TASKS,
        Permission.MANAGE_TIMESHEETS,
        Permission.VIEW_ALL_TIMESHEETS,
        Permission.SUBMIT_EXPENSE,
        Permission.MANAGE_EXPENSES,
        Permission.MANAGE_DOCUMENTS,
        Permission.VIEW_DOCUMENTS,
        Permission.UPLOAD_DOCUMENTS,
        Permission.MANAGE_SAFETY_REPORTS,
        Permission.VIEW_SAFETY_REPORTS,
        Permission.SUBMIT_SAFETY_REPORT,
        Permission.MANAGE_SAFETY_INSPECTIONS,
        Permission.MANAGE_RISK_ASSESSMENTS,
        Permission.VIEW_FINANCES,
        Permission.MANAGE_FINANCES,
        Permission.VIEW_TEAM,
        Permission.MANAGE_TEAM,
        Permission.MANAGE_EQUIPMENT,
        Permission.MANAGE_PROJECT_TEMPLATES,
        Permission.ACCESS_ALL_TOOLS,
        Permission.SEND_DIRECT_MESSAGE,
        Permission.VIEW_NOTIFICATIONS,
        Permission.VIEW_AUDIT_LOG,
    ]),
    [Role.PM]: new Set([
        Permission.VIEW_DASHBOARD,
        Permission.VIEW_ASSIGNED_PROJECTS,
        Permission.MANAGE_PROJECTS, // Can manage their own projects
        Permission.VIEW_ALL_TASKS, // Within their projects
        Permission.MANAGE_TASKS,
        Permission.MANAGE_TIMESHEETS, // For their project teams
        Permission.VIEW_ALL_TIMESHEETS, // For their projects
        Permission.SUBMIT_EXPENSE,
        Permission.MANAGE_EXPENSES, // For their project teams
        Permission.VIEW_DOCUMENTS,
        Permission.UPLOAD_DOCUMENTS,
        Permission.VIEW_SAFETY_REPORTS,
        Permission.SUBMIT_SAFETY_REPORT,
        Permission.MANAGE_SAFETY_REPORTS,
        Permission.MANAGE_SAFETY_INSPECTIONS,
        Permission.MANAGE_RISK_ASSESSMENTS,
        Permission.VIEW_FINANCES, // Can view finances for their projects
        Permission.MANAGE_FINANCES, // Can manage finances for their projects
        Permission.VIEW_TEAM, // Can view their project teams
        Permission.SEND_DIRECT_MESSAGE,
        Permission.VIEW_NOTIFICATIONS,
    ]),
    [Role.FOREMAN]: new Set([
        Permission.VIEW_DASHBOARD,
        Permission.VIEW_ASSIGNED_PROJECTS,
        Permission.VIEW_ALL_TASKS, // Within their projects
        Permission.MANAGE_TASKS, // Can manage tasks for their crew
        Permission.SUBMIT_TIMESHEET,
        Permission.VIEW_OWN_TIMESHEETS,
        Permission.MANAGE_TIMESHEETS, // Approve for their crew
        Permission.SUBMIT_EXPENSE,
        Permission.VIEW_DOCUMENTS,
        Permission.UPLOAD_DOCUMENTS,
        Permission.SUBMIT_SAFETY_REPORT,
        Permission.VIEW_SAFETY_REPORTS,
        Permission.VIEW_TEAM, // View their crew
        Permission.SEND_DIRECT_MESSAGE,
        Permission.VIEW_NOTIFICATIONS,
    ]),
    [Role.OPERATIVE]: new Set([
        Permission.VIEW_DASHBOARD, // My Day view
        Permission.VIEW_ASSIGNED_PROJECTS,
        Permission.SUBMIT_TIMESHEET,
        Permission.VIEW_OWN_TIMESHEETS,
        Permission.SUBMIT_EXPENSE,
        Permission.VIEW_DOCUMENTS,
        Permission.SUBMIT_SAFETY_REPORT,
        Permission.SEND_DIRECT_MESSAGE,
        Permission.VIEW_NOTIFICATIONS,
    ]),
};