import { SupabaseClient } from '@supabase/supabase-js';
import { 
  User, Company, Project, Task, Invoice, Expense, Client, Equipment, 
  SafetyIncident, TimeEntry, Notification, ProjectTemplate, AuditLog,
  CompanySettings, Conversation, Message, ProjectAssignment, 
  FinancialKPIs, MonthlyFinancials, FinancialForecast,
  RequestOptions, Todo, QuoteStatus, InvoiceStatus, ExpenseStatus,
  Role, Permission, ProjectStatus, TodoStatus, TodoPriority
} from '../types';
import { SupabaseManager } from './supabaseClient';

// Interface matching the mock API structure
interface SupabaseApiInterface {
  // Authentication (handled by supabaseAuthService)
  // Company & Users
  getCompanySettings: (companyId: string) => Promise<CompanySettings>;
  getUsersByCompany: (companyId: string, options?: RequestOptions) => Promise<User[]>;
  
  // Projects
  getProjectsByManager: (managerId: string, options?: RequestOptions) => Promise<Project[]>;
  getProjectById: (projectId: string, options?: RequestOptions) => Promise<Project | null>;
  getProjectsByCompany: (companyId: string, options?: RequestOptions) => Promise<Project[]>;
  createProject: (project: Partial<Project>) => Promise<Project>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  
  // Tasks/Todos
  getTodosByProject: (projectId: string, options?: RequestOptions) => Promise<Todo[]>;
  getTodosByUser: (userId: string, options?: RequestOptions) => Promise<Todo[]>;
  createTodo: (todo: Partial<Todo>) => Promise<Todo>;
  updateTodo: (todoId: string, updates: Partial<Todo>) => Promise<Todo>;
  deleteTodo: (todoId: string) => Promise<void>;
  
  // Clients
  getClientsByCompany: (companyId: string, options?: RequestOptions) => Promise<Client[]>;
  createClient: (client: Partial<Client>) => Promise<Client>;
  updateClient: (clientId: string, updates: Partial<Client>) => Promise<Client>;
  deleteClient: (clientId: string) => Promise<void>;
  
  // Invoices
  getInvoicesByCompany: (companyId: string, options?: RequestOptions) => Promise<Invoice[]>;
  createInvoice: (invoice: Partial<Invoice>) => Promise<Invoice>;
  updateInvoice: (invoiceId: string, updates: Partial<Invoice>) => Promise<Invoice>;
  deleteInvoice: (invoiceId: string) => Promise<void>;
  
  // Expenses
  getExpensesByCompany: (companyId: string, options?: RequestOptions) => Promise<Expense[]>;
  createExpense: (expense: Partial<Expense>) => Promise<Expense>;
  updateExpense: (expenseId: string, updates: Partial<Expense>) => Promise<Expense>;
  deleteExpense: (expenseId: string) => Promise<void>;
  
  // Equipment
  getEquipmentByCompany: (companyId: string, options?: RequestOptions) => Promise<Equipment[]>;
  createEquipment: (equipment: Partial<Equipment>) => Promise<Equipment>;
  updateEquipment: (equipmentId: string, updates: Partial<Equipment>) => Promise<Equipment>;
  deleteEquipment: (equipmentId: string) => Promise<void>;
  
  // Safety
  getSafetyIncidentsByCompany: (companyId: string, options?: RequestOptions) => Promise<SafetyIncident[]>;
  createSafetyIncident: (incident: Partial<SafetyIncident>) => Promise<SafetyIncident>;
  
  // Time Tracking
  getTimeEntriesByUser: (userId: string, options?: RequestOptions) => Promise<TimeEntry[]>;
  createTimeEntry: (timeEntry: Partial<TimeEntry>) => Promise<TimeEntry>;
  updateTimeEntry: (timeEntryId: string, updates: Partial<TimeEntry>) => Promise<TimeEntry>;
  
  // Notifications
  getNotificationsForUser: (userId: string, options?: RequestOptions) => Promise<Notification[]>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: (userId: string) => Promise<void>;
  
  // Audit Log
  getAuditLogsByCompany: (companyId: string, options?: RequestOptions) => Promise<AuditLog[]>;
}

class SupabaseApiService implements SupabaseApiInterface {
  private supabaseManager: SupabaseManager;
  
  constructor() {
    this.supabaseManager = SupabaseManager.getInstance();
  }

  private getClient(): SupabaseClient {
    const client = this.supabaseManager.getClient();
    if (!client) {
      throw new Error('Supabase client not available');
    }
    return client;
  }

  private handleError(error: any, operation: string): never {
    console.error(`Supabase API Error [${operation}]:`, error);
    throw new Error(error.message || `${operation} failed`);
  }

  // Helper method to check for cancellation
  private ensureNotAborted(signal?: AbortSignal): void {
    if (signal?.aborted) {
      throw new Error('Request aborted');
    }
  }

  // Company & Users
  async updateCompanySettings(
    companyId: string,
    updates: Partial<CompanySettings>,
    updatedBy: string
  ): Promise<CompanySettings> {
    try {
      const dbUpdates = this.mapCompanySettingsToDB(updates);
      
      const { data, error } = await this.client
        .from('companies')
        .update({
          ...dbUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', companyId)
        .select('*')
        .single();

      if (error) throw error;
      
      return this.mapCompanySettingsFromDB(data);
    } catch (error) {
      throw wrapError(error, 'Failed to update company settings');
    }
  }

  async getUsersByCompany(companyId: string, options?: RequestOptions): Promise<User[]> {
    try {
      this.ensureNotAborted(options?.signal);
      
      const { data, error } = await this.getClient()
        .from('profiles')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (error) throw error;

      return (data || []).map(profile => ({
        id: profile.id,
        firstName: profile.first_name,
        lastName: profile.last_name,
        email: profile.email,
        phone: profile.phone || '',
        avatar: profile.avatar || '',
        role: profile.role as Role,
        permissions: [], // TODO: Implement role-based permissions
        companyId: profile.company_id,
        departmentId: profile.department_id || '',
        position: profile.position || '',
        isActive: profile.is_active,
        isEmailVerified: profile.is_email_verified,
        lastLogin: profile.last_login,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
        preferences: profile.preferences || {},
        skills: profile.skills || [],
        availability: profile.availability || 'AVAILABLE'
      }));
    } catch (error) {
      this.handleError(error, 'getUsersByCompany');
    }
  }

  // Projects
  async getProjectsByCompany(companyId: string, options?: RequestOptions): Promise<Project[]> {
    try {
      this.ensureNotAborted(options?.signal);
      
      const { data, error } = await this.getClient()
        .from('projects')
        .select(`
          *,
          client:clients(*),
          manager:profiles(*)
        `)
        .eq('company_id', companyId);

      if (error) throw error;

      return (data || []).map(project => ({
        id: project.id,
        name: project.name,
        description: project.description || '',
        status: project.status as ProjectStatus,
        budget: Number(project.budget || 0),
        spent: Number(project.spent || 0),
        actualCost: Number(project.actual_cost || 0),
        startDate: project.start_date,
        endDate: project.end_date,
        location: {
          latitude: Number(project.latitude || 0),
          longitude: Number(project.longitude || 0),
          address: project.address || ''
        },
        clientId: project.client_id,
        managerId: project.manager_id,
        imageUrl: project.image_url,
        projectType: project.project_type || '',
        workClassification: project.work_classification || '',
        progress: project.progress || 0,
        companyId: project.company_id,
        geofenceRadius: project.geofence_radius,
        createdAt: project.created_at,
        updatedAt: project.updated_at
      }));
    } catch (error) {
      this.handleError(error, 'getProjectsByCompany');
    }
  }

  async getProjectById(projectId: string, options?: RequestOptions): Promise<Project | null> {
    try {
      this.ensureNotAborted(options?.signal);
      
      const projects = await this.getProjectsByCompany('', options);
      return projects.find(p => p.id === projectId) || null;
    } catch (error) {
      this.handleError(error, 'getProjectById');
    }
  }

  async getProjectsByManager(managerId: string, options?: RequestOptions): Promise<Project[]> {
    try {
      this.ensureNotAborted(options?.signal);
      
      const { data, error } = await this.getClient()
        .from('projects')
        .select('*')
        .eq('manager_id', managerId);

      if (error) throw error;

      // Transform to match Project interface
      return (data || []).map(project => ({
        id: project.id,
        name: project.name,
        description: project.description || '',
        status: project.status as ProjectStatus,
        budget: Number(project.budget || 0),
        spent: Number(project.spent || 0),
        actualCost: Number(project.actual_cost || 0),
        startDate: project.start_date,
        endDate: project.end_date,
        location: {
          latitude: Number(project.latitude || 0),
          longitude: Number(project.longitude || 0),
          address: project.address || ''
        },
        clientId: project.client_id,
        managerId: project.manager_id,
        imageUrl: project.image_url,
        projectType: project.project_type || '',
        workClassification: project.work_classification || '',
        progress: project.progress || 0,
        companyId: project.company_id,
        geofenceRadius: project.geofence_radius,
        createdAt: project.created_at,
        updatedAt: project.updated_at
      }));
    } catch (error) {
      this.handleError(error, 'getProjectsByManager');
    }
  }

  async createProject(project: Partial<Project>): Promise<Project> {
    try {
      const projectData = {
        name: project.name,
        description: project.description,
        status: project.status || 'PLANNING',
        budget: project.budget || 0,
        spent: project.spent || 0,
        actual_cost: project.actualCost || 0,
        start_date: project.startDate,
        end_date: project.endDate,
        latitude: project.location?.latitude,
        longitude: project.location?.longitude,
        address: project.location?.address,
        client_id: project.clientId,
        manager_id: project.managerId,
        company_id: project.companyId,
        image_url: project.imageUrl,
        project_type: project.projectType,
        work_classification: project.workClassification,
        progress: project.progress || 0,
        geofence_radius: project.geofenceRadius
      };

      const { data, error } = await this.getClient()
        .from('projects')
        .insert([projectData])
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        description: data.description || '',
        status: data.status as ProjectStatus,
        budget: Number(data.budget || 0),
        spent: Number(data.spent || 0),
        actualCost: Number(data.actual_cost || 0),
        startDate: data.start_date,
        endDate: data.end_date,
        location: {
          latitude: Number(data.latitude || 0),
          longitude: Number(data.longitude || 0),
          address: data.address || ''
        },
        clientId: data.client_id,
        managerId: data.manager_id,
        imageUrl: data.image_url,
        projectType: data.project_type || '',
        workClassification: data.work_classification || '',
        progress: data.progress || 0,
        companyId: data.company_id,
        geofenceRadius: data.geofence_radius,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      this.handleError(error, 'createProject');
    }
  }

  async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
    try {
      const updateData = {
        name: updates.name,
        description: updates.description,
        status: updates.status,
        budget: updates.budget,
        spent: updates.spent,
        actual_cost: updates.actualCost,
        start_date: updates.startDate,
        end_date: updates.endDate,
        latitude: updates.location?.latitude,
        longitude: updates.location?.longitude,
        address: updates.location?.address,
        client_id: updates.clientId,
        manager_id: updates.managerId,
        image_url: updates.imageUrl,
        project_type: updates.projectType,
        work_classification: updates.workClassification,
        progress: updates.progress,
        geofence_radius: updates.geofenceRadius
      };

      // Remove undefined values
      const cleanedUpdates = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );

      const { data, error } = await this.getClient()
        .from('projects')
        .update(cleanedUpdates)
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        description: data.description || '',
        status: data.status as ProjectStatus,
        budget: Number(data.budget || 0),
        spent: Number(data.spent || 0),
        actualCost: Number(data.actual_cost || 0),
        startDate: data.start_date,
        endDate: data.end_date,
        location: {
          latitude: Number(data.latitude || 0),
          longitude: Number(data.longitude || 0),
          address: data.address || ''
        },
        clientId: data.client_id,
        managerId: data.manager_id,
        imageUrl: data.image_url,
        projectType: data.project_type || '',
        workClassification: data.work_classification || '',
        progress: data.progress || 0,
        companyId: data.company_id,
        geofenceRadius: data.geofence_radius,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      this.handleError(error, 'updateProject');
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    try {
      const { error } = await this.getClient()
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
    } catch (error) {
      this.handleError(error, 'deleteProject');
    }
  }

  // Clients
  async getClientsByCompany(companyId: string, options?: RequestOptions): Promise<Client[]> {
    try {
      this.ensureNotAborted(options?.signal);
      
      const { data, error } = await this.getClient()
        .from('clients')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (error) throw error;

      return (data || []).map(client => ({
        id: client.id,
        name: client.name,
        contactPerson: client.contact_person || '',
        contactEmail: client.contact_email || '',
        contactPhone: client.contact_phone || '',
        companyEmail: client.company_email || '',
        companyPhone: client.company_phone || '',
        billingAddress: client.billing_address || '',
        companyId: client.company_id,
        isActive: client.is_active,
        createdAt: client.created_at,
        updatedAt: client.updated_at
      }));
    } catch (error) {
      this.handleError(error, 'getClientsByCompany');
    }
  }

  async createClient(client: Partial<Client>): Promise<Client> {
    try {
      const clientData = {
        name: client.name,
        contact_person: client.contactPerson,
        contact_email: client.contactEmail,
        contact_phone: client.contactPhone,
        company_email: client.companyEmail,
        company_phone: client.companyPhone,
        billing_address: client.billingAddress,
        company_id: client.companyId,
        is_active: client.isActive !== false
      };

      const { data, error } = await this.getClient()
        .from('clients')
        .insert([clientData])
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        contactPerson: data.contact_person || '',
        contactEmail: data.contact_email || '',
        contactPhone: data.contact_phone || '',
        companyEmail: data.company_email || '',
        companyPhone: data.company_phone || '',
        billingAddress: data.billing_address || '',
        companyId: data.company_id,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      this.handleError(error, 'createClient');
    }
  }

  async updateClient(clientId: string, updates: Partial<Client>): Promise<Client> {
    try {
      const updateData = {
        name: updates.name,
        contact_person: updates.contactPerson,
        contact_email: updates.contactEmail,
        contact_phone: updates.contactPhone,
        company_email: updates.companyEmail,
        company_phone: updates.companyPhone,
        billing_address: updates.billingAddress,
        is_active: updates.isActive
      };

      const cleanedUpdates = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );

      const { data, error } = await this.getClient()
        .from('clients')
        .update(cleanedUpdates)
        .eq('id', clientId)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        contactPerson: data.contact_person || '',
        contactEmail: data.contact_email || '',
        contactPhone: data.contact_phone || '',
        companyEmail: data.company_email || '',
        companyPhone: data.company_phone || '',
        billingAddress: data.billing_address || '',
        companyId: data.company_id,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      this.handleError(error, 'updateClient');
    }
  }

  async deleteClient(clientId: string): Promise<void> {
    try {
      const { error } = await this.getClient()
        .from('clients')
        .update({ is_active: false })
        .eq('id', clientId);

      if (error) throw error;
    } catch (error) {
      this.handleError(error, 'deleteClient');
    }
  }

  // TODO: Implement remaining methods (Todos, Invoices, Expenses, Equipment, Safety, Time Tracking, Notifications, Audit Log)
  // For now, these will throw "not implemented" errors to maintain interface compatibility

  async getTodosByProject(projectId: string, options?: RequestOptions): Promise<Todo[]> {
    throw new Error('getTodosByProject not implemented yet');
  }

  async getTodosByUser(userId: string, options?: RequestOptions): Promise<Todo[]> {
    throw new Error('getTodosByUser not implemented yet');
  }

  async createTodo(todo: Partial<Todo>): Promise<Todo> {
    throw new Error('createTodo not implemented yet');
  }

  async updateTodo(todoId: string, updates: Partial<Todo>): Promise<Todo> {
    throw new Error('updateTodo not implemented yet');
  }

  async deleteTodo(todoId: string): Promise<void> {
    throw new Error('deleteTodo not implemented yet');
  }

  async getInvoicesByCompany(companyId: string, options?: RequestOptions): Promise<Invoice[]> {
    throw new Error('getInvoicesByCompany not implemented yet');
  }

  async createInvoice(invoice: Partial<Invoice>): Promise<Invoice> {
    throw new Error('createInvoice not implemented yet');
  }

  async updateInvoice(invoiceId: string, updates: Partial<Invoice>): Promise<Invoice> {
    throw new Error('updateInvoice not implemented yet');
  }

  async deleteInvoice(invoiceId: string): Promise<void> {
    throw new Error('deleteInvoice not implemented yet');
  }

  async getExpensesByCompany(companyId: string, options?: RequestOptions): Promise<Expense[]> {
    throw new Error('getExpensesByCompany not implemented yet');
  }

  async createExpense(expense: Partial<Expense>): Promise<Expense> {
    throw new Error('createExpense not implemented yet');
  }

  async updateExpense(expenseId: string, updates: Partial<Expense>): Promise<Expense> {
    throw new Error('updateExpense not implemented yet');
  }

  async deleteExpense(expenseId: string): Promise<void> {
    throw new Error('deleteExpense not implemented yet');
  }

  async getEquipmentByCompany(companyId: string, options?: RequestOptions): Promise<Equipment[]> {
    throw new Error('getEquipmentByCompany not implemented yet');
  }

  async createEquipment(equipment: Partial<Equipment>): Promise<Equipment> {
    throw new Error('createEquipment not implemented yet');
  }

  async updateEquipment(equipmentId: string, updates: Partial<Equipment>): Promise<Equipment> {
    throw new Error('updateEquipment not implemented yet');
  }

  async deleteEquipment(equipmentId: string): Promise<void> {
    throw new Error('deleteEquipment not implemented yet');
  }

  async getSafetyIncidentsByCompany(companyId: string, options?: RequestOptions): Promise<SafetyIncident[]> {
    throw new Error('getSafetyIncidentsByCompany not implemented yet');
  }

  async createSafetyIncident(incident: Partial<SafetyIncident>): Promise<SafetyIncident> {
    throw new Error('createSafetyIncident not implemented yet');
  }

  async getTimeEntriesByUser(userId: string, options?: RequestOptions): Promise<TimeEntry[]> {
    throw new Error('getTimeEntriesByUser not implemented yet');
  }

  async createTimeEntry(timeEntry: Partial<TimeEntry>): Promise<TimeEntry> {
    throw new Error('createTimeEntry not implemented yet');
  }

  async updateTimeEntry(timeEntryId: string, updates: Partial<TimeEntry>): Promise<TimeEntry> {
    throw new Error('updateTimeEntry not implemented yet');
  }

  async getNotificationsForUser(userId: string, options?: RequestOptions): Promise<Notification[]> {
    throw new Error('getNotificationsForUser not implemented yet');
  }

  // ========================
  // TODO CRUD OPERATIONS
  // ========================
  
  async getTodos(): Promise<Todo[]> {
    try {
      const { data, error } = await this.client
        .from('todos')
        .select(`
          *,
          project:project_id(id, name),
          assigned_user:assigned_to(id, name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data?.map(this.mapTodoFromDB) || [];
    } catch (error) {
      throw wrapError(error, 'Failed to fetch todos');
    }
  }

  async createTodo(todoData: Partial<Todo>): Promise<Todo> {
    try {
      const dbTodo = this.mapTodoToDB(todoData);
      
      const { data, error } = await this.client
        .from('todos')
        .insert(dbTodo)
        .select(`
          *,
          project:project_id(id, name),
          assigned_user:assigned_to(id, name, email)
        `)
        .single();

      if (error) throw error;
      
      return this.mapTodoFromDB(data);
    } catch (error) {
      throw wrapError(error, 'Failed to create todo');
    }
  }

  async updateTodo(id: string, updates: Partial<Todo>): Promise<Todo> {
    try {
      const dbUpdates = this.mapTodoToDB(updates);
      
      const { data, error } = await this.client
        .from('todos')
        .update({
          ...dbUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          project:project_id(id, name),
          assigned_user:assigned_to(id, name, email)
        `)
        .single();

      if (error) throw error;
      
      return this.mapTodoFromDB(data);
    } catch (error) {
      throw wrapError(error, 'Failed to update todo');
    }
  }

  async deleteTodo(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('todos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      throw wrapError(error, 'Failed to delete todo');
    }
  }

  // ========================
  // INVOICE CRUD OPERATIONS  
  // ========================

  async getInvoices(): Promise<Invoice[]> {
    try {
      const { data, error } = await this.client
        .from('invoices')
        .select(`
          *,
          project:project_id(id, name),
          client:client_id(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data?.map(this.mapInvoiceFromDB) || [];
    } catch (error) {
      throw wrapError(error, 'Failed to fetch invoices');
    }
  }

  async createInvoice(invoiceData: Partial<Invoice>): Promise<Invoice> {
    try {
      const dbInvoice = this.mapInvoiceToDB(invoiceData);
      
      const { data, error } = await this.client
        .from('invoices')
        .insert(dbInvoice)
        .select(`
          *,
          project:project_id(id, name),
          client:client_id(id, name)
        `)
        .single();

      if (error) throw error;
      
      return this.mapInvoiceFromDB(data);
    } catch (error) {
      throw wrapError(error, 'Failed to create invoice');
    }
  }

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    try {
      const dbUpdates = this.mapInvoiceToDB(updates);
      
      const { data, error } = await this.client
        .from('invoices')
        .update({
          ...dbUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          project:project_id(id, name),
          client:client_id(id, name)
        `)
        .single();

      if (error) throw error;
      
      return this.mapInvoiceFromDB(data);
    } catch (error) {
      throw wrapError(error, 'Failed to update invoice');
    }
  }

  async deleteInvoice(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      throw wrapError(error, 'Failed to delete invoice');
    }
  }

  // ========================
  // EXPENSE CRUD OPERATIONS  
  // ========================

  async getExpenses(): Promise<Expense[]> {
    try {
      const { data, error } = await this.client
        .from('expenses')
        .select(`
          *,
          project:project_id(id, name)
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      
      return data?.map(this.mapExpenseFromDB) || [];
    } catch (error) {
      throw wrapError(error, 'Failed to fetch expenses');
    }
  }

  async createExpense(expenseData: Partial<Expense>): Promise<Expense> {
    try {
      const dbExpense = this.mapExpenseToDB(expenseData);
      
      const { data, error } = await this.client
        .from('expenses')
        .insert(dbExpense)
        .select(`
          *,
          project:project_id(id, name)
        `)
        .single();

      if (error) throw error;
      
      return this.mapExpenseFromDB(data);
    } catch (error) {
      throw wrapError(error, 'Failed to create expense');
    }
  }

  async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
    try {
      const dbUpdates = this.mapExpenseToDB(updates);
      
      const { data, error } = await this.client
        .from('expenses')
        .update({
          ...dbUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          project:project_id(id, name)
        `)
        .single();

      if (error) throw error;
      
      return this.mapExpenseFromDB(data);
    } catch (error) {
      throw wrapError(error, 'Failed to update expense');
    }
  }

  async deleteExpense(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      throw wrapError(error, 'Failed to delete expense');
    }
  }

  // ========================
  // EQUIPMENT CRUD OPERATIONS  
  // ========================

  async getEquipment(): Promise<Equipment[]> {
    try {
      const { data, error } = await this.client
        .from('equipment')
        .select('*')
        .order('name');

      if (error) throw error;
      
      return data?.map(this.mapEquipmentFromDB) || [];
    } catch (error) {
      throw wrapError(error, 'Failed to fetch equipment');
    }
  }

  async createEquipment(equipmentData: Partial<Equipment>): Promise<Equipment> {
    try {
      const dbEquipment = this.mapEquipmentToDB(equipmentData);
      
      const { data, error } = await this.client
        .from('equipment')
        .insert(dbEquipment)
        .select('*')
        .single();

      if (error) throw error;
      
      return this.mapEquipmentFromDB(data);
    } catch (error) {
      throw wrapError(error, 'Failed to create equipment');
    }
  }

  async updateEquipment(id: string, updates: Partial<Equipment>): Promise<Equipment> {
    try {
      const dbUpdates = this.mapEquipmentToDB(updates);
      
      const { data, error } = await this.client
        .from('equipment')
        .update({
          ...dbUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      
      return this.mapEquipmentFromDB(data);
    } catch (error) {
      throw wrapError(error, 'Failed to update equipment');
    }
  }

  async deleteEquipment(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('equipment')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      throw wrapError(error, 'Failed to delete equipment');
    }
  }

  // ========================
  // TIME TRACKING OPERATIONS  
  // ========================

  async getTimeEntries(): Promise<TimeEntry[]> {
    try {
      const { data, error } = await this.client
        .from('time_tracking_entries')
        .select(`
          *,
          user:user_id(id, name, email),
          project:project_id(id, name)
        `)
        .order('start_time', { ascending: false });

      if (error) throw error;
      
      return data?.map(this.mapTimeEntryFromDB) || [];
    } catch (error) {
      throw wrapError(error, 'Failed to fetch time entries');
    }
  }

  async createTimeEntry(entryData: Partial<TimeEntry>): Promise<TimeEntry> {
    try {
      const dbEntry = this.mapTimeEntryToDB(entryData);
      
      const { data, error } = await this.client
        .from('time_tracking_entries')
        .insert(dbEntry)
        .select(`
          *,
          user:user_id(id, name, email),
          project:project_id(id, name)
        `)
        .single();

      if (error) throw error;
      
      return this.mapTimeEntryFromDB(data);
    } catch (error) {
      throw wrapError(error, 'Failed to create time entry');
    }
  }

  async updateTimeEntry(id: string, updates: Partial<TimeEntry>): Promise<TimeEntry> {
    try {
      const dbUpdates = this.mapTimeEntryToDB(updates);
      
      const { data, error } = await this.client
        .from('time_tracking_entries')
        .update({
          ...dbUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          user:user_id(id, name, email),
          project:project_id(id, name)
        `)
        .single();

      if (error) throw error;
      
      return this.mapTimeEntryFromDB(data);
    } catch (error) {
      throw wrapError(error, 'Failed to update time entry');
    }
  }

  async deleteTimeEntry(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('time_tracking_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      throw wrapError(error, 'Failed to delete time entry');
    }
  }

  // ========================
  // SAFETY INCIDENT OPERATIONS  
  // ========================

  async getSafetyIncidents(): Promise<SafetyIncident[]> {
    try {
      const { data, error } = await this.client
        .from('safety_incidents')
        .select(`
          *,
          project:project_id(id, name),
          reported_by_user:reported_by(id, name, email)
        `)
        .order('incident_date', { ascending: false });

      if (error) throw error;
      
      return data?.map(this.mapSafetyIncidentFromDB) || [];
    } catch (error) {
      throw wrapError(error, 'Failed to fetch safety incidents');
    }
  }

  async createSafetyIncident(incidentData: Partial<SafetyIncident>): Promise<SafetyIncident> {
    try {
      const dbIncident = this.mapSafetyIncidentToDB(incidentData);
      
      const { data, error } = await this.client
        .from('safety_incidents')
        .insert(dbIncident)
        .select(`
          *,
          project:project_id(id, name),
          reported_by_user:reported_by(id, name, email)
        `)
        .single();

      if (error) throw error;
      
      return this.mapSafetyIncidentFromDB(data);
    } catch (error) {
      throw wrapError(error, 'Failed to create safety incident');
    }
  }

  async updateSafetyIncident(id: string, updates: Partial<SafetyIncident>): Promise<SafetyIncident> {
    try {
      const dbUpdates = this.mapSafetyIncidentToDB(updates);
      
      const { data, error } = await this.client
        .from('safety_incidents')
        .update({
          ...dbUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          project:project_id(id, name),
          reported_by_user:reported_by(id, name, email)
        `)
        .single();

      if (error) throw error;
      
      return this.mapSafetyIncidentFromDB(data);
    } catch (error) {
      throw wrapError(error, 'Failed to update safety incident');
    }
  }

  async deleteSafetyIncident(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('safety_incidents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      throw wrapError(error, 'Failed to delete safety incident');
    }
  }

  // ========================
  // NOTIFICATION OPERATIONS  
  // ========================

  async getNotifications(): Promise<Notification[]> {
    try {
      const { data, error } = await this.client
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data?.map(this.mapNotificationFromDB) || [];
    } catch (error) {
      throw wrapError(error, 'Failed to fetch notifications');
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('notifications')
        .update({ 
          read: true,
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      throw wrapError(error, 'Failed to mark notification as read');
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('notifications')
        .update({ 
          read: true,
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
    } catch (error) {
      throw wrapError(error, 'Failed to mark all notifications as read');
    }
  }

  async getAuditLogsByCompany(companyId: string, options?: RequestOptions): Promise<AuditLog[]> {
    try {
      const { data, error } = await this.client
        .from('audit_logs')
        .select(`
          *,
          user:user_id(id, name, email)
        `)
        .eq('company_id', companyId)
        .order('timestamp', { ascending: false })
        .limit(options?.limit || 50);

      if (error) throw error;
      
      return data?.map(this.mapAuditLogFromDB) || [];
    } catch (error) {
      throw wrapError(error, 'Failed to fetch audit logs');
    }
  }

  // ========================
  // DATA MAPPING METHODS
  // ========================

  private mapTodoFromDB(dbTodo: any): Todo {
    return {
      id: dbTodo.id,
      title: dbTodo.title,
      description: dbTodo.description,
      status: dbTodo.status,
      priority: dbTodo.priority,
      projectId: dbTodo.project_id,
      assignedTo: dbTodo.assigned_to,
      dueDate: dbTodo.due_date,
      completed: dbTodo.completed || false,
      createdAt: dbTodo.created_at,
      updatedAt: dbTodo.updated_at,
      project: dbTodo.project ? { 
        id: dbTodo.project.id, 
        name: dbTodo.project.name 
      } : undefined,
      assignedUser: dbTodo.assigned_user ? {
        id: dbTodo.assigned_user.id,
        name: dbTodo.assigned_user.name,
        email: dbTodo.assigned_user.email
      } : undefined
    };
  }

  private mapTodoToDB(todo: Partial<Todo>): any {
    const mapped: any = {};
    if (todo.title !== undefined) mapped.title = todo.title;
    if (todo.description !== undefined) mapped.description = todo.description;
    if (todo.status !== undefined) mapped.status = todo.status;
    if (todo.priority !== undefined) mapped.priority = todo.priority;
    if (todo.projectId !== undefined) mapped.project_id = todo.projectId;
    if (todo.assignedTo !== undefined) mapped.assigned_to = todo.assignedTo;
    if (todo.dueDate !== undefined) mapped.due_date = todo.dueDate;
    if (todo.completed !== undefined) mapped.completed = todo.completed;
    return mapped;
  }

  private mapInvoiceFromDB(dbInvoice: any): Invoice {
    return {
      id: dbInvoice.id,
      number: dbInvoice.number,
      clientId: dbInvoice.client_id,
      projectId: dbInvoice.project_id,
      amount: dbInvoice.amount,
      status: dbInvoice.status,
      dueDate: dbInvoice.due_date,
      issueDate: dbInvoice.issue_date,
      description: dbInvoice.description,
      lineItems: dbInvoice.line_items || [],
      createdAt: dbInvoice.created_at,
      updatedAt: dbInvoice.updated_at,
      project: dbInvoice.project ? { 
        id: dbInvoice.project.id, 
        name: dbInvoice.project.name 
      } : undefined,
      client: dbInvoice.client ? { 
        id: dbInvoice.client.id, 
        name: dbInvoice.client.name 
      } : undefined
    };
  }

  private mapInvoiceToDB(invoice: Partial<Invoice>): any {
    const mapped: any = {};
    if (invoice.number !== undefined) mapped.number = invoice.number;
    if (invoice.clientId !== undefined) mapped.client_id = invoice.clientId;
    if (invoice.projectId !== undefined) mapped.project_id = invoice.projectId;
    if (invoice.amount !== undefined) mapped.amount = invoice.amount;
    if (invoice.status !== undefined) mapped.status = invoice.status;
    if (invoice.dueDate !== undefined) mapped.due_date = invoice.dueDate;
    if (invoice.issueDate !== undefined) mapped.issue_date = invoice.issueDate;
    if (invoice.description !== undefined) mapped.description = invoice.description;
    if (invoice.lineItems !== undefined) mapped.line_items = invoice.lineItems;
    return mapped;
  }

  private mapExpenseFromDB(dbExpense: any): Expense {
    return {
      id: dbExpense.id,
      description: dbExpense.description,
      amount: dbExpense.amount,
      category: dbExpense.category,
      date: dbExpense.date,
      projectId: dbExpense.project_id,
      receipt: dbExpense.receipt,
      createdAt: dbExpense.created_at,
      updatedAt: dbExpense.updated_at,
      project: dbExpense.project ? { 
        id: dbExpense.project.id, 
        name: dbExpense.project.name 
      } : undefined
    };
  }

  private mapExpenseToDB(expense: Partial<Expense>): any {
    const mapped: any = {};
    if (expense.description !== undefined) mapped.description = expense.description;
    if (expense.amount !== undefined) mapped.amount = expense.amount;
    if (expense.category !== undefined) mapped.category = expense.category;
    if (expense.date !== undefined) mapped.date = expense.date;
    if (expense.projectId !== undefined) mapped.project_id = expense.projectId;
    if (expense.receipt !== undefined) mapped.receipt = expense.receipt;
    return mapped;
  }

  private mapEquipmentFromDB(dbEquipment: any): Equipment {
    return {
      id: dbEquipment.id,
      name: dbEquipment.name,
      type: dbEquipment.type,
      status: dbEquipment.status,
      location: dbEquipment.location,
      lastMaintenance: dbEquipment.last_maintenance,
      nextMaintenance: dbEquipment.next_maintenance,
      notes: dbEquipment.notes,
      serialNumber: dbEquipment.serial_number,
      createdAt: dbEquipment.created_at,
      updatedAt: dbEquipment.updated_at
    };
  }

  private mapEquipmentToDB(equipment: Partial<Equipment>): any {
    const mapped: any = {};
    if (equipment.name !== undefined) mapped.name = equipment.name;
    if (equipment.type !== undefined) mapped.type = equipment.type;
    if (equipment.status !== undefined) mapped.status = equipment.status;
    if (equipment.location !== undefined) mapped.location = equipment.location;
    if (equipment.lastMaintenance !== undefined) mapped.last_maintenance = equipment.lastMaintenance;
    if (equipment.nextMaintenance !== undefined) mapped.next_maintenance = equipment.nextMaintenance;
    if (equipment.notes !== undefined) mapped.notes = equipment.notes;
    if (equipment.serialNumber !== undefined) mapped.serial_number = equipment.serialNumber;
    return mapped;
  }

  private mapTimeEntryFromDB(dbEntry: any): TimeEntry {
    return {
      id: dbEntry.id,
      userId: dbEntry.user_id,
      projectId: dbEntry.project_id,
      startTime: dbEntry.start_time,
      endTime: dbEntry.end_time,
      duration: dbEntry.duration,
      description: dbEntry.description,
      createdAt: dbEntry.created_at,
      updatedAt: dbEntry.updated_at,
      user: dbEntry.user ? {
        id: dbEntry.user.id,
        name: dbEntry.user.name,
        email: dbEntry.user.email
      } : undefined,
      project: dbEntry.project ? { 
        id: dbEntry.project.id, 
        name: dbEntry.project.name 
      } : undefined
    };
  }

  private mapTimeEntryToDB(entry: Partial<TimeEntry>): any {
    const mapped: any = {};
    if (entry.userId !== undefined) mapped.user_id = entry.userId;
    if (entry.projectId !== undefined) mapped.project_id = entry.projectId;
    if (entry.startTime !== undefined) mapped.start_time = entry.startTime;
    if (entry.endTime !== undefined) mapped.end_time = entry.endTime;
    if (entry.duration !== undefined) mapped.duration = entry.duration;
    if (entry.description !== undefined) mapped.description = entry.description;
    return mapped;
  }

  private mapSafetyIncidentFromDB(dbIncident: any): SafetyIncident {
    return {
      id: dbIncident.id,
      title: dbIncident.title,
      description: dbIncident.description,
      severity: dbIncident.severity,
      status: dbIncident.status,
      incidentDate: dbIncident.incident_date,
      projectId: dbIncident.project_id,
      reportedBy: dbIncident.reported_by,
      location: dbIncident.location,
      createdAt: dbIncident.created_at,
      updatedAt: dbIncident.updated_at,
      project: dbIncident.project ? { 
        id: dbIncident.project.id, 
        name: dbIncident.project.name 
      } : undefined,
      reportedByUser: dbIncident.reported_by_user ? {
        id: dbIncident.reported_by_user.id,
        name: dbIncident.reported_by_user.name,
        email: dbIncident.reported_by_user.email
      } : undefined
    };
  }

  private mapSafetyIncidentToDB(incident: Partial<SafetyIncident>): any {
    const mapped: any = {};
    if (incident.title !== undefined) mapped.title = incident.title;
    if (incident.description !== undefined) mapped.description = incident.description;
    if (incident.severity !== undefined) mapped.severity = incident.severity;
    if (incident.status !== undefined) mapped.status = incident.status;
    if (incident.incidentDate !== undefined) mapped.incident_date = incident.incidentDate;
    if (incident.projectId !== undefined) mapped.project_id = incident.projectId;
    if (incident.reportedBy !== undefined) mapped.reported_by = incident.reportedBy;
    if (incident.location !== undefined) mapped.location = incident.location;
    return mapped;
  }

  private mapNotificationFromDB(dbNotification: any): Notification {
    return {
      id: dbNotification.id,
      title: dbNotification.title,
      message: dbNotification.message,
      type: dbNotification.type,
      userId: dbNotification.user_id,
      read: dbNotification.read || false,
      readAt: dbNotification.read_at,
      createdAt: dbNotification.created_at,
      updatedAt: dbNotification.updated_at
    };
  }

  private mapNotificationToDB(notification: Partial<Notification>): any {
    const mapped: any = {};
    if (notification.title !== undefined) mapped.title = notification.title;
    if (notification.message !== undefined) mapped.message = notification.message;
    if (notification.type !== undefined) mapped.type = notification.type;
    if (notification.userId !== undefined) mapped.user_id = notification.userId;
    if (notification.read !== undefined) mapped.read = notification.read;
    if (notification.readAt !== undefined) mapped.read_at = notification.readAt;
    return mapped;
  }

  private mapAuditLogFromDB(dbLog: any): AuditLog {
    return {
      id: dbLog.id,
      action: dbLog.action,
      resourceType: dbLog.resource_type,
      resourceId: dbLog.resource_id,
      userId: dbLog.user_id,
      companyId: dbLog.company_id,
      timestamp: dbLog.timestamp,
      details: dbLog.details || {},
      user: dbLog.user ? {
        id: dbLog.user.id,
        name: dbLog.user.name,
        email: dbLog.user.email
      } : undefined
    };
  }
}

// Export singleton instance
export const supabaseApi = new SupabaseApiService();
export default supabaseApi;