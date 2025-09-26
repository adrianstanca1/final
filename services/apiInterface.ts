/**
 * Unified API interface that defines all methods available in both Mock and Supabase APIs
 */
import {
  User,
  Project,
  Client,
  Todo,
  Invoice,
  Expense,
  Equipment,
  CompanySettings,
  TimeEntry,
  SafetyIncident,
  Notification,
  AuditLog,
  RequestOptions
} from '../types';

export interface ApiInterface {
  // Company Settings
  getCompanySettings: (companyId: string) => Promise<CompanySettings>;
  updateCompanySettings: (companyId: string, updates: Partial<CompanySettings>, updatedBy: string) => Promise<CompanySettings>;

  // User Management
  getUsersByCompany: (companyId: string, options?: RequestOptions) => Promise<User[]>;

  // Project Management
  getProjectsByCompany: (companyId: string, options?: RequestOptions) => Promise<Project[]>;
  getProjectById: (projectId: string, options?: RequestOptions) => Promise<Project>;
  createProject: (projectData: Partial<Project>) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;

  // Client Management
  getClientsByCompany: (companyId: string, options?: RequestOptions) => Promise<Client[]>;
  createClient: (clientData: Partial<Client>) => Promise<Client>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<Client>;
  deleteClient: (id: string) => Promise<void>;

  // Task Management
  getTodos: () => Promise<Todo[]>;
  createTodo: (todoData: Partial<Todo>) => Promise<Todo>;
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<Todo>;
  deleteTodo: (id: string) => Promise<void>;
  getTodosByProjectIds?: (projectIds: (string | number)[], options?: RequestOptions) => Promise<Todo[]>;

  // Financial Management
  getInvoices: () => Promise<Invoice[]>;
  createInvoice: (invoiceData: Partial<Invoice>) => Promise<Invoice>;
  updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<Invoice>;
  deleteInvoice: (id: string) => Promise<void>;

  getExpenses: () => Promise<Expense[]>;
  createExpense: (expenseData: Partial<Expense>) => Promise<Expense>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<void>;

  // Equipment Management
  getEquipment: () => Promise<Equipment[]>;
  createEquipment: (equipmentData: Partial<Equipment>) => Promise<Equipment>;
  updateEquipment: (id: string, updates: Partial<Equipment>) => Promise<Equipment>;
  deleteEquipment: (id: string) => Promise<void>;

  // Time Tracking
  getTimeEntries: () => Promise<TimeEntry[]>;
  createTimeEntry: (entryData: Partial<TimeEntry>) => Promise<TimeEntry>;
  updateTimeEntry: (id: string, updates: Partial<TimeEntry>) => Promise<TimeEntry>;
  deleteTimeEntry: (id: string) => Promise<void>;
  getTimesheetsByCompany?: (companyId: string, userId?: string, options?: RequestOptions) => Promise<TimeEntry[]>;

  // Safety Management
  getSafetyIncidents: () => Promise<SafetyIncident[]>;
  createSafetyIncident: (incidentData: Partial<SafetyIncident>) => Promise<SafetyIncident>;
  updateSafetyIncident: (id: string, updates: Partial<SafetyIncident>) => Promise<SafetyIncident>;
  deleteSafetyIncident: (id: string) => Promise<void>;
  getSafetyIncidentsByCompany?: (companyId: string, options?: RequestOptions) => Promise<SafetyIncident[]>;

  // Notifications
  getNotifications: () => Promise<Notification[]>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: (userId: string) => Promise<void>;
  getNotificationsForUser?: (userId: string, options?: RequestOptions) => Promise<Notification[]>;

  // Audit Logs
  getAuditLogsByCompany: (companyId: string, options?: RequestOptions) => Promise<AuditLog[]>;

  // Additional methods that may exist in mock API
  getConversationsForUser?: (userId: string, options?: RequestOptions) => Promise<any[]>;
  
  // Features flag
  features?: {
    realTimeUpdates: boolean;
    offlineSync: boolean;
    aiIntegration: boolean;
  };
}