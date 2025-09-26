import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { multiProjectManager, ProjectConfig } from '../services/multiProjectManager';

class SupabaseManager {
  private static instance: SupabaseManager;
  private clients: Map<string, SupabaseClient> = new Map();
  private adminClients: Map<string, SupabaseClient> = new Map();

  private constructor() {}

  static getInstance(): SupabaseManager {
    if (!SupabaseManager.instance) {
      SupabaseManager.instance = new SupabaseManager();
    }
    return SupabaseManager.instance;
  }

  private createClientForProject(config: ProjectConfig, useServiceRole = false): SupabaseClient | null {
    if (!config.supabaseUrl || !config.anonKey) {
      console.warn(`Supabase configuration missing for project ${config.id}`);
      return null;
    }

    const key = useServiceRole ? config.serviceRoleKey : config.anonKey;
    if (!key) {
      console.warn(`${useServiceRole ? 'Service role' : 'Anonymous'} key missing for project ${config.id}`);
      return null;
    }

    try {
      return createClient(config.supabaseUrl, key, {
        auth: {
          persistSession: !useServiceRole,
          autoRefreshToken: !useServiceRole,
          detectSessionInUrl: !useServiceRole
        }
      });
    } catch (error) {
      console.error(`Failed to create Supabase client for project ${config.id}:`, error);
      return null;
    }
  }

  getClient(): SupabaseClient | null {
    const config = multiProjectManager.getCurrentConfig();
    const clientKey = config.id;

    if (!this.clients.has(clientKey)) {
      const client = this.createClientForProject(config, false);
      if (client) {
        this.clients.set(clientKey, client);
      }
    }

    return this.clients.get(clientKey) || null;
  }

  getAdminClient(): SupabaseClient | null {
    const config = multiProjectManager.getCurrentConfig();
    const clientKey = `${config.id}-admin`;

    if (!this.adminClients.has(clientKey)) {
      const client = this.createClientForProject(config, true);
      if (client) {
        this.adminClients.set(clientKey, client);
      }
    }

    return this.adminClients.get(clientKey) || null;
  }

  getClientForProject(projectId: string): SupabaseClient | null {
    const availableProjects = multiProjectManager.getAvailableProjects();
    const project = availableProjects.find(p => p.config.id === projectId);
    
    if (!project) {
      console.warn(`Project ${projectId} not found`);
      return null;
    }

    const clientKey = projectId;
    if (!this.clients.has(clientKey)) {
      const client = this.createClientForProject(project.config, false);
      if (client) {
        this.clients.set(clientKey, client);
      }
    }

    return this.clients.get(clientKey) || null;
  }

  clearClients(): void {
    this.clients.clear();
    this.adminClients.clear();
  }

  isConfigured(): boolean {
    const config = multiProjectManager.getCurrentConfig();
    return !!(config.supabaseUrl && config.anonKey);
  }
}

// Create singleton instance
export const supabaseManager = SupabaseManager.getInstance();

// Export convenience functions
export const supabase = () => supabaseManager.getClient();
export const supabaseAdmin = () => supabaseManager.getAdminClient();

// Export the manager for advanced usage
export { SupabaseManager };

// Listen for project switches and clear clients
if (typeof window !== 'undefined') {
  window.addEventListener('project-switch', () => {
    supabaseManager.clearClients();
  });
}