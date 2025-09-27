// Enhanced backend API service for full integration
import { getEnvironment } from '../config/environment';
import type {
  User,
  Project,
  Task,
  Company,
  Expense,
  Invoice,
  Document,
  SafetyIncident,
  Equipment,
  TimeEntry,
  Notification,
  AuditLog,
  LoginCredentials,
  RegistrationPayload,
  AuthenticatedSession
} from '../types';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class BackendApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    const env = getEnvironment();
    this.baseUrl = env.apiUrl || 'http://localhost:4000/api';
    
    // Load token from storage
    this.token = localStorage.getItem('auth_token');
  }

  /**
   * Set authentication token
   */
  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  /**
   * Get authentication headers
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Make API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthenticatedSession>> {
    const response = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data?.tokens?.accessToken) {
      this.setToken(response.data.tokens.accessToken);
    }

    return response;
  }

  async register(payload: RegistrationPayload): Promise<ApiResponse<AuthenticatedSession>> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async logout(): Promise<ApiResponse<void>> {
    const response = await this.request('/auth/logout', {
      method: 'POST',
    });
    
    this.setToken(null);
    return response;
  }

  async refreshToken(): Promise<ApiResponse<{ accessToken: string }>> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      return { success: false, error: 'No refresh token available' };
    }

    return this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  // User methods
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request('/me');
  }

  async getUsers(): Promise<ApiResponse<User[]>> {
    return this.request('/users');
  }

  // Company methods
  async getCompanies(): Promise<ApiResponse<Company[]>> {
    return this.request('/companies');
  }

  async getCompany(id: string): Promise<ApiResponse<Company>> {
    return this.request(`/companies/${id}`);
  }

  async createCompany(company: Partial<Company>): Promise<ApiResponse<{ id: number }>> {
    return this.request('/companies', {
      method: 'POST',
      body: JSON.stringify(company),
    });
  }

  async updateCompany(id: string, company: Partial<Company>): Promise<ApiResponse<void>> {
    return this.request(`/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(company),
    });
  }

  async deleteCompany(id: string): Promise<ApiResponse<void>> {
    return this.request(`/companies/${id}`, {
      method: 'DELETE',
    });
  }

  // Project methods
  async getProjects(): Promise<ApiResponse<Project[]>> {
    return this.request('/projects');
  }

  async getProject(id: string): Promise<ApiResponse<Project>> {
    return this.request(`/projects/${id}`);
  }

  async createProject(project: Partial<Project>): Promise<ApiResponse<{ id: number }>> {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  }

  async updateProject(id: string, project: Partial<Project>): Promise<ApiResponse<void>> {
    return this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(project),
    });
  }

  async deleteProject(id: string): Promise<ApiResponse<void>> {
    return this.request(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Task methods
  async getTasks(filters?: {
    projectId?: string;
    assignedTo?: string;
    status?: string;
    priority?: string;
  }): Promise<ApiResponse<Task[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    
    const query = params.toString();
    return this.request(`/tasks${query ? `?${query}` : ''}`);
  }

  async getTask(id: string): Promise<ApiResponse<Task>> {
    return this.request(`/tasks/${id}`);
  }

  async createTask(task: Partial<Task>): Promise<ApiResponse<{ id: number }>> {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async updateTask(id: string, task: Partial<Task>): Promise<ApiResponse<void>> {
    return this.request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(task),
    });
  }

  async deleteTask(id: string): Promise<ApiResponse<void>> {
    return this.request(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // Expense methods
  async getExpenses(filters?: {
    projectId?: string;
    userId?: string;
    category?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<Expense[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    
    const query = params.toString();
    return this.request(`/expenses${query ? `?${query}` : ''}`);
  }

  async getExpense(id: string): Promise<ApiResponse<Expense>> {
    return this.request(`/expenses/${id}`);
  }

  async createExpense(expense: Partial<Expense>): Promise<ApiResponse<{ id: number }>> {
    return this.request('/expenses', {
      method: 'POST',
      body: JSON.stringify(expense),
    });
  }

  async updateExpense(id: string, expense: Partial<Expense>): Promise<ApiResponse<void>> {
    return this.request(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(expense),
    });
  }

  async approveExpense(id: string, status: 'approved' | 'rejected', notes?: string): Promise<ApiResponse<void>> {
    return this.request(`/expenses/${id}/approval`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  }

  async deleteExpense(id: string): Promise<ApiResponse<void>> {
    return this.request(`/expenses/${id}`, {
      method: 'DELETE',
    });
  }

  // Invoice methods
  async getInvoices(): Promise<ApiResponse<Invoice[]>> {
    return this.request('/invoices');
  }

  async getInvoice(id: string): Promise<ApiResponse<Invoice>> {
    return this.request(`/invoices/${id}`);
  }

  // Document methods
  async getDocuments(): Promise<ApiResponse<Document[]>> {
    return this.request('/documents');
  }

  async uploadDocument(file: File, projectId?: string): Promise<ApiResponse<{ id: number }>> {
    const formData = new FormData();
    formData.append('file', file);
    if (projectId) {
      formData.append('projectId', projectId);
    }

    try {
      const response = await fetch(`${this.baseUrl}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': this.token ? `Bearer ${this.token}` : '',
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  // System methods
  async getSystemHealth(): Promise<ApiResponse<{ status: string; database: boolean }>> {
    return this.request('/system/health');
  }
}

// Export singleton instance
export const backendApi = new BackendApiService();
