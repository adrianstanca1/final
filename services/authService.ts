import { supabase, SupabaseUser } from './supabase';
import { User, Role, Permission, RolePermissions } from '../types';

// Define authentication service interface
export interface AuthResponse {
  user: User | null;
  error: string | null;
  session?: any;
}

// Map Supabase user to our app's User type
const mapSupabaseUser = (supabaseUser: SupabaseUser): User => {
  const userMetadata = supabaseUser?.user_metadata || {};
  
  return {
    id: supabaseUser?.id || '',
    email: supabaseUser?.email || '',
    firstName: userMetadata.firstName || '',
    lastName: userMetadata.lastName || '',
    phone: userMetadata.phone || '',
    role: userMetadata.role || Role.OPERATIVE,
    company: userMetadata.company || null,
    avatar: userMetadata.avatar || null,
    permissions: userMetadata.permissions || [],
    createdAt: supabaseUser?.created_at ? new Date(supabaseUser.created_at).toISOString() : new Date().toISOString(),
    updatedAt: supabaseUser?.updated_at ? new Date(supabaseUser.updated_at).toISOString() : new Date().toISOString(),
    status: userMetadata.status || 'active',
    preferences: userMetadata.preferences || {},
    skills: userMetadata.skills || [],
    certifications: userMetadata.certifications || []
  };
};

/**
 * Authentication service with Supabase implementation
 */
export const authService = {
  /**
   * Sign in with email and password
   */
  signIn: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;
      
      const user = data.user ? mapSupabaseUser(data.user) : null;
      return { user, error: null, session: data.session };
    } catch (error: any) {
      return { user: null, error: error.message || 'Failed to sign in' };
    }
  },

  /**
   * Sign up with email and password
   */
  signUp: async (
    email: string, 
    password: string, 
    userData: { 
      firstName: string, 
      lastName: string, 
      role?: Role,
      company?: string,
      phone?: string
    }
  ): Promise<AuthResponse> => {
    try {
      // Create user account
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role || Role.OPERATIVE,
            company: userData.company,
            phone: userData.phone,
            permissions: userData.role ? Array.from(RolePermissions[userData.role]) : [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'active',
          },
        },
      });

      if (error) throw error;
      
      const user = data.user ? mapSupabaseUser(data.user) : null;
      return { user, error: null, session: data.session };
    } catch (error: any) {
      return { user: null, error: error.message || 'Failed to sign up' };
    }
  },

  /**
   * Sign in with Google
   */
  signInWithGoogle: async (): Promise<AuthResponse> => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) throw error;
      
      // For OAuth, we return limited data as the user will be redirected
      return { user: null, error: null, session: null };
    } catch (error: any) {
      return { user: null, error: error.message || 'Failed to sign in with Google' };
    }
  },

  /**
   * Sign out
   */
  signOut: async (): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error: error.message || 'Failed to sign out' };
    }
  },

  /**
   * Reset password
   */
  resetPassword: async (email: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      return { error: null };
    } catch (error: any) {
      return { error: error.message || 'Failed to reset password' };
    }
  },

  /**
   * Update user password
   */
  updatePassword: async (password: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;
      
      return { error: null };
    } catch (error: any) {
      return { error: error.message || 'Failed to update password' };
    }
  },

  /**
   * Update user profile
   */
  updateProfile: async (userData: Partial<User>): Promise<AuthResponse> => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone,
          role: userData.role,
          company: userData.company,
          avatar: userData.avatar,
          permissions: userData.permissions,
          updatedAt: new Date().toISOString(),
          preferences: userData.preferences,
          skills: userData.skills,
          certifications: userData.certifications,
        },
      });

      if (error) throw error;
      
      const user = data.user ? mapSupabaseUser(data.user) : null;
      return { user, error: null };
    } catch (error: any) {
      return { user: null, error: error.message || 'Failed to update profile' };
    }
  },

  /**
   * Get current session
   */
  getSession: async (): Promise<AuthResponse> => {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      const user = data.session?.user ? mapSupabaseUser(data.session.user) : null;
      return { user, error: null, session: data.session };
    } catch (error: any) {
      return { user: null, error: error.message || 'Failed to get session' };
    }
  },

  /**
   * Check if user has specific permission
   */
  hasPermission: (user: User | null, permission: Permission): boolean => {
    if (!user) return false;
    
    // Check user permissions
    if (user.permissions && Array.isArray(user.permissions)) {
      return user.permissions.includes(permission);
    }
    
    // Fallback to role-based permissions
    return user.role ? RolePermissions[user.role].has(permission) : false;
  }
};