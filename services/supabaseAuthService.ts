import { createClient, SupabaseClient, User as SupabaseUser, AuthError } from '@supabase/supabase-js';
import { User, Company, LoginCredentials, RegistrationPayload, AuthState, Permission, Role, RolePermissions } from '../types';
import { multiProjectManager } from './multiProjectManager';
import { hasPermission } from './auth';

export interface AuthenticatedSession {
  user: User;
  company: Company;
  session: any;
}

export interface SupabaseAuthError {
  message: string;
  status?: number;
}

class SupabaseAuthService {
  private static instance: SupabaseAuthService;
  private supabase: SupabaseClient | null = null;

  private constructor() {
    this.initializeClient();
  }

  static getInstance(): SupabaseAuthService {
    if (!SupabaseAuthService.instance) {
      SupabaseAuthService.instance = new SupabaseAuthService();
    }
    return SupabaseAuthService.instance;
  }

  private initializeClient() {
    try {
      const config = multiProjectManager.getCurrentConfig();
      console.log('Initializing Supabase client with config:', {
        hasUrl: !!config.supabaseUrl,
        hasAnonKey: !!config.anonKey,
        url: config.supabaseUrl
      });
      
      if (config.supabaseUrl && config.anonKey) {
        this.supabase = createClient(config.supabaseUrl, config.anonKey, {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
          }
        });
        console.log('Supabase client initialized successfully');
      } else {
        console.warn('Supabase configuration incomplete:', {
          supabaseUrl: config.supabaseUrl,
          hasAnonKey: !!config.anonKey
        });
      }
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
    }
  }

  private async getSupabaseClient(): Promise<SupabaseClient> {
    if (!this.supabase) {
      this.initializeClient();
    }
    if (!this.supabase) {
      throw new Error('Supabase client not initialized. Please check your configuration.');
    }
    return this.supabase;
  }

  /**
   * Register a new user with Supabase Auth
   */
  async register(payload: RegistrationPayload): Promise<AuthenticatedSession> {
    const supabase = await this.getSupabaseClient();
    
    try {
      // Step 1: Create company if needed
      let companyId = payload.companyId;
      
      if (payload.companySelection === 'create' && payload.companyName) {
        const companyData = {
          name: payload.companyName,
          type: payload.companyType || 'GENERAL_CONTRACTOR',
          email: payload.companyEmail || payload.email,
          phone: payload.companyPhone || payload.phone || '',
          website: payload.companyWebsite || ''
        };

        const { data: company, error: companyError } = await supabase
          .from('companies')
          .insert([companyData])
          .select()
          .single();

        if (companyError) {
          throw new Error(`Failed to create company: ${companyError.message}`);
        }

        companyId = company.id;
      }

      if (!companyId) {
        throw new Error('Company ID is required for registration');
      }

      // Step 2: Sign up user with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          data: {
            first_name: payload.firstName,
            last_name: payload.lastName,
            company_id: companyId,
            role: payload.role || 'OPERATIVE',
            phone: payload.phone || ''
          }
        }
      });

      if (signUpError) {
        throw new Error(`Registration failed: ${signUpError.message}`);
      }

      if (!authData.user) {
        throw new Error('User registration failed - no user returned');
      }

      // Step 3: Wait for profile to be created by trigger, then fetch user data
      await new Promise(resolve => setTimeout(resolve, 1000)); // Give trigger time to run

      const session = await this.getCurrentSession();
      if (!session) {
        throw new Error('Registration successful but failed to establish session');
      }

      return session;

    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'Registration failed');
    }
  }

  /**
   * Login user with Supabase Auth
   */
  async login(credentials: LoginCredentials): Promise<{ mfaRequired: boolean; userId?: string; session?: AuthenticatedSession }> {
    const supabase = await this.getSupabaseClient();
    
    try {
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (signInError) {
        throw new Error(`Login failed: ${signInError.message}`);
      }

      if (!authData.user || !authData.session) {
        throw new Error('Login failed - no user or session returned');
      }

      // Get full user profile and company data
      const session = await this.getCurrentSession();
      if (!session) {
        throw new Error('Login successful but failed to get user profile');
      }

      return {
        mfaRequired: false, // MFA can be implemented later
        session
      };

    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    const supabase = await this.getSupabaseClient();
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  /**
   * Get current user session with profile and company data
   */
  async getCurrentSession(): Promise<AuthenticatedSession | null> {
    const supabase = await this.getSupabaseClient();
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        return null;
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          company:companies(*)
        `)
        .eq('id', session.user.id)
        .single();

      if (profileError || !profile) {
        console.error('Failed to fetch user profile:', profileError);
        return null;
      }

      // Transform Supabase data to our User type
      const user: User = {
        id: profile.id,
        firstName: profile.first_name,
        lastName: profile.last_name,
        email: profile.email,
        phone: profile.phone || '',
        avatar: profile.avatar || '',
        role: profile.role,
        permissions: this.getRolePermissions(profile.role),
        companyId: profile.company_id,
        departmentId: profile.department_id || '',
        position: profile.position || '',
        isActive: profile.is_active,
        isEmailVerified: profile.is_email_verified,
        lastLogin: profile.last_login,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
        preferences: profile.preferences || {
          theme: 'system',
          language: 'en',
          notifications: {
            email: true,
            push: true,
            sms: false,
            taskReminders: true,
            projectUpdates: true,
            systemAlerts: true
          },
          dashboard: {
            defaultView: 'dashboard',
            pinnedWidgets: [],
            hiddenWidgets: []
          }
        },
        skills: profile.skills || [],
        availability: profile.availability || 'AVAILABLE'
      };

      // Transform company data
      const company: Company = {
        id: profile.company.id,
        name: profile.company.name,
        type: profile.company.type,
        address: {
          street: profile.company.street || '',
          city: profile.company.city || '',
          state: profile.company.state || '',
          zipCode: profile.company.zip_code || '',
          country: profile.company.country || 'USA'
        },
        phone: profile.company.phone || '',
        email: profile.company.email,
        website: profile.company.website || '',
        logo: profile.company.logo || '',
        settings: {
          timeZone: profile.company.time_zone,
          dateFormat: profile.company.date_format,
          currency: profile.company.currency,
          workingHours: {
            start: profile.company.work_start_time || '08:00',
            end: profile.company.work_end_time || '17:00',
            workDays: profile.company.work_days || [1, 2, 3, 4, 5]
          },
          features: profile.company.features || {
            projectManagement: true,
            timeTracking: true,
            financials: true,
            documents: true,
            safety: true,
            equipment: true,
            reporting: true
          },
          theme: 'light',
          accessibility: {
            highContrast: false
          }
        },
        subscriptionPlan: profile.company.subscription_plan,
        isActive: profile.company.is_active,
        createdAt: profile.company.created_at,
        updatedAt: profile.company.updated_at,
        status: profile.company.status,
        storageUsageGB: profile.company.storage_usage_gb || 0
      };

      return { user, company, session };

    } catch (error: any) {
      console.error('Failed to get current session:', error);
      return null;
    }
  }

  /**
   * Check if user has permission
   */
  hasPermission(user: User | null, permission: Permission): boolean {
    return hasPermission(user, permission);
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<void> {
    const supabase = await this.getSupabaseClient();
    
    try {
      const profileUpdates = {
        first_name: updates.firstName,
        last_name: updates.lastName,
        phone: updates.phone,
        avatar: updates.avatar,
        position: updates.position,
        preferences: updates.preferences,
        skills: updates.skills,
        availability: updates.availability
      };

      // Remove undefined values
      const cleanUpdates = Object.fromEntries(
        Object.entries(profileUpdates).filter(([_, value]) => value !== undefined)
      );

      const { error } = await supabase
        .from('profiles')
        .update(cleanUpdates)
        .eq('id', userId);

      if (error) {
        throw new Error(`Failed to update profile: ${error.message}`);
      }
    } catch (error: any) {
      console.error('Profile update error:', error);
      throw new Error(error.message || 'Failed to update profile');
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) {
        throw new Error(`Password reset failed: ${error.message}`);
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      throw new Error(error.message || 'Password reset failed');
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(newPassword: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        throw new Error(`Password update failed: ${error.message}`);
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      throw new Error(error.message || 'Password reset failed');
    }
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (this.supabase) {
      return this.supabase.auth.onAuthStateChange(callback);
    }
    return { data: { subscription: null } };
  }

  /**
   * Get role permissions
   */
  private getRolePermissions(role: string): Permission[] {
    const roleEnum = role as Role;
    const permissions = RolePermissions[roleEnum];
    return permissions ? Array.from(permissions) : [];
  }
}

// Export singleton instance
export const supabaseAuthService = SupabaseAuthService.getInstance();
export default supabaseAuthService;