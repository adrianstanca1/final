import { getEnvironment } from '../config/environment';

export type ProjectEnvironment = 'primary' | 'secondary';

export interface ProjectConfig {
  id: string;
  name: string;
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey?: string;
  databaseUrl?: string;
  directUrl?: string;
}

export class MultiProjectManager {
  private static instance: MultiProjectManager;
  private currentProject: ProjectEnvironment = 'primary';
  private configs: Record<ProjectEnvironment, ProjectConfig>;

  private constructor() {
    const env = getEnvironment();
    
    this.configs = {
      primary: {
        id: 'main',
        name: 'ASAgents Main',
        supabaseUrl: env.supabaseUrl || '',
        anonKey: env.supabaseAnonKey || '',
        serviceRoleKey: this.getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
        databaseUrl: this.getEnvVar('DATABASE_URL'),
        directUrl: this.getEnvVar('DIRECT_URL')
      },
      secondary: {
        id: 'secondary',
        name: 'ASAgents Secondary',
        supabaseUrl: this.getEnvVar('VITE_SUPABASE_URL_SECONDARY') || '',
        anonKey: this.getEnvVar('VITE_SUPABASE_ANON_KEY_SECONDARY') || '',
        serviceRoleKey: this.getEnvVar('SUPABASE_SERVICE_ROLE_KEY_SECONDARY'),
        databaseUrl: this.getEnvVar('DATABASE_URL_SECONDARY'),
        directUrl: this.getEnvVar('DIRECT_URL_SECONDARY')
      }
    };
  }

  static getInstance(): MultiProjectManager {
    if (!MultiProjectManager.instance) {
      MultiProjectManager.instance = new MultiProjectManager();
    }
    return MultiProjectManager.instance;
  }

  private getEnvVar(key: string): string | undefined {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env[key];
    }
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
    return undefined;
  }

  getCurrentProject(): ProjectEnvironment {
    return this.currentProject;
  }

  getCurrentConfig(): ProjectConfig {
    return this.configs[this.currentProject];
  }

  getConfig(project: ProjectEnvironment): ProjectConfig {
    return this.configs[project];
  }

  switchProject(project: ProjectEnvironment): void {
    this.currentProject = project;
    
    // Store in localStorage for persistence
    try {
      localStorage.setItem('asagents:current-project', project);
    } catch (error) {
      console.warn('Failed to persist project selection:', error);
    }

    // Dispatch event for components to react
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('project-switch', { detail: project }));
    }
  }

  initializeFromStorage(): void {
    try {
      const stored = localStorage.getItem('asagents:current-project') as ProjectEnvironment;
      if (stored && (stored === 'primary' || stored === 'secondary')) {
        this.currentProject = stored;
      }
    } catch (error) {
      console.warn('Failed to read project selection from storage:', error);
    }
  }

  isProjectConfigured(project: ProjectEnvironment): boolean {
    const config = this.configs[project];
    return !!(config.supabaseUrl && config.anonKey);
  }

  getAvailableProjects(): Array<{ key: ProjectEnvironment; config: ProjectConfig; configured: boolean }> {
    return Object.entries(this.configs).map(([key, config]) => ({
      key: key as ProjectEnvironment,
      config,
      configured: this.isProjectConfigured(key as ProjectEnvironment)
    }));
  }
}

// Create singleton instance
export const multiProjectManager = MultiProjectManager.getInstance();

// Initialize from storage on module load
if (typeof window !== 'undefined') {
  multiProjectManager.initializeFromStorage();
}