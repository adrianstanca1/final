import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { User, Company, LoginCredentials, RegisterCredentials, AuthState, Permission } from '../types';
import { authService } from '../services/authService';
import { supabase } from '../services/supabase';

interface AuthContextType extends AuthState {
    login: (credentials: LoginCredentials) => Promise<{ success: boolean }>;
    loginWithGoogle: () => Promise<void>;
    register: (credentials: Partial<RegisterCredentials>) => Promise<void>;
    logout: () => void;
    hasPermission: (permission: Permission) => boolean;
    updateUserProfile: (updates: Partial<User>) => Promise<void>;
    requestPasswordReset: (email: string) => Promise<void>;
    resetPassword: (newPassword: string) => Promise<void>;
    isLoading: () => boolean;
    getUserRole: () => string | undefined;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const parseJwt = (token: string) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        console.warn('Failed to parse JWT:', e);
        return null;
    }
};

// We'll keep this for backward compatibility during transition
let tokenRefreshTimeout: ReturnType<typeof setTimeout> | null = null;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [authState, setAuthState] = useState<AuthState>({
        isAuthenticated: false,
        token: null,
        refreshToken: null,
        user: null,
        company: null,
        loading: true,
        error: null,
    });

    const logout = useCallback(async () => {
        try {
            await authService.signOut();
            if (tokenRefreshTimeout) clearTimeout(tokenRefreshTimeout);
            setAuthState({
                isAuthenticated: false,
                token: null,
                refreshToken: null,
                user: null,
                company: null,
                loading: false,
                error: null,
            });
        } catch (error: any) {
            console.error('Logout error:', error);
            // Force logout locally even if API call failed
            setAuthState({
                isAuthenticated: false,
                token: null,
                refreshToken: null,
                user: null,
                company: null,
                loading: false,
                error: null,
            });
        }
    }, []);

    // Token refresh is now handled automatically by Supabase auth state listener
    // No need for manual token refresh scheduling

    /**
     * Initializes authentication state from Supabase session
     */

    // This function is no longer used with Supabase, but keeping commented for reference
    // Token refresh is handled by Supabase auth state listener

    /**
     * Initializes authentication state from Supabase session
     */
    const initializeAuth = useCallback(async () => {
        setAuthState(prev => ({ ...prev, loading: true }));

        try {
            // Get current session from Supabase
            const { user, error, session } = await authService.getSession();

            if (error || !user || !session) {
                setAuthState({
                    isAuthenticated: false,
                    token: null,
                    refreshToken: null,
                    user: null,
                    company: null,
                    loading: false,
                    error: error,
                });
                return;
            }

            // Temporarily set company to null to avoid type complexity during deployment
            // In production, this should fetch actual company data from your database
            let company: Company | null = null;

            // Set authenticated state
            setAuthState({
                isAuthenticated: true,
                token: session.access_token,
                refreshToken: session.refresh_token,
                user: user,
                company: company,
                loading: false,
                error: null,
            });
        } catch (error: any) {
            console.error('Failed to initialize authentication:', error);
            setAuthState({
                isAuthenticated: false,
                token: null,
                refreshToken: null,
                user: null,
                company: null,
                loading: false,
                error: 'Failed to initialize authentication',
            });
        }
    }, []);

    // Run once on component mount and set up auth state change listener
    useEffect(() => {
        initializeAuth();

        // Set up auth state change listener
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    // User signed in or token refreshed, reinitialize auth
                    initializeAuth();
                } else if (event === 'SIGNED_OUT') {
                    // User signed out, clear state
                    setAuthState({
                        isAuthenticated: false,
                        token: null,
                        refreshToken: null,
                        user: null,
                        company: null,
                        loading: false,
                        error: null,
                    });
                }
            }
        );

        // Clean up subscription on unmount
        return () => {
            if (tokenRefreshTimeout) clearTimeout(tokenRefreshTimeout);
            authListener?.subscription.unsubscribe();
        };
    }, [initializeAuth]);

    const login = async (credentials: LoginCredentials): Promise<{ success: boolean }> => {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const { user, error, session } = await authService.signIn(
                credentials.email,
                credentials.password
            );

            if (error || !user) {
                setAuthState(prev => ({
                    ...prev,
                    token: null,
                    refreshToken: null,
                    user: null,
                    company: null,
                    isAuthenticated: false,
                    loading: false,
                    error: error || 'Login failed',
                }));
                return { success: false };
            }

            // If we have a session, manually update our state
            if (session) {
                // Temporarily set company to null to avoid type complexity during deployment
                // In production, this should fetch actual company data from your database
                let company: Company | null = null;

                setAuthState({
                    isAuthenticated: true,
                    token: session.access_token,
                    refreshToken: session.refresh_token,
                    user: user,
                    company: company,
                    loading: false,
                    error: null,
                });
            }

            return { success: true };
        } catch (error: any) {
            setAuthState(prev => ({
                ...prev,
                token: null,
                refreshToken: null,
                user: null,
                company: null,
                isAuthenticated: false,
                loading: false,
                error: error.message || 'Login failed',
            }));
            return { success: false };
        }
    };

    const loginWithGoogle = async (): Promise<void> => {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const { error } = await authService.signInWithGoogle();

            if (error) {
                setAuthState(prev => ({
                    ...prev,
                    loading: false,
                    error: error,
                }));
            }

            // Auth listener will update the state when redirect completes
        } catch (error: any) {
            setAuthState(prev => ({
                ...prev,
                loading: false,
                error: error.message || 'Google login failed',
            }));
        }
    };

    const register = async (credentials: Partial<RegisterCredentials>) => {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));

        try {
            if (!credentials.email || !credentials.password || !credentials.firstName || !credentials.lastName) {
                throw new Error('Missing required fields');
            }

            const { user, error } = await authService.signUp(
                credentials.email,
                credentials.password,
                {
                    firstName: credentials.firstName,
                    lastName: credentials.lastName,
                    role: (credentials as any).role || 'PROJECT_MANAGER',
                    company: credentials.companyId,
                    phone: credentials.phone,
                }
            );

            if (error || !user) {
                setAuthState(prev => ({
                    ...prev,
                    loading: false,
                    error: error || 'Registration failed',
                }));
                throw new Error(error || 'Registration failed');
            }

            // Auth listener will update the state
            setAuthState(prev => ({ ...prev, loading: false }));
        } catch (error: any) {
            setAuthState(prev => ({
                ...prev,
                loading: false,
                error: error.message || 'Registration failed',
            }));
            throw error;
        }
    };

    const hasPermission = (permission: Permission): boolean => {
        return authService.hasPermission(authState.user, permission);
    };

    const updateUserProfile = async (updates: Partial<User>) => {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const { user, error } = await authService.updateProfile(updates);

            if (error || !user) {
                setAuthState(prev => ({
                    ...prev,
                    loading: false,
                    error: error || 'Failed to update profile',
                }));
                throw new Error(error || 'Failed to update profile');
            }

            setAuthState(prev => ({
                ...prev,
                user: {
                    ...prev.user,
                    ...user,
                },
                loading: false,
            }));
        } catch (error: any) {
            setAuthState(prev => ({
                ...prev,
                loading: false,
                error: error.message || 'Failed to update profile',
            }));
            throw error;
        }
    };

    const requestPasswordReset = async (email: string) => {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const { error } = await authService.resetPassword(email);

            if (error) {
                setAuthState(prev => ({
                    ...prev,
                    loading: false,
                    error: error,
                }));
                throw new Error(error);
            }

            setAuthState(prev => ({
                ...prev,
                loading: false,
            }));
        } catch (error: any) {
            setAuthState(prev => ({
                ...prev,
                loading: false,
                error: error.message || 'Failed to request password reset',
            }));
            throw error;
        }
    };

    const resetPassword = async (newPassword: string) => {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const { error } = await authService.updatePassword(newPassword);

            if (error) {
                setAuthState(prev => ({
                    ...prev,
                    loading: false,
                    error: error,
                }));
                throw new Error(error);
            }

            setAuthState(prev => ({
                ...prev,
                loading: false,
            }));
        } catch (error: any) {
            setAuthState(prev => ({
                ...prev,
                loading: false,
                error: error.message || 'Failed to reset password',
            }));
            throw error;
        }
    };

    // Helper methods
    const isLoading = (): boolean => {
        return authState.loading;
    };

    const getUserRole = (): string | undefined => {
        return authState.user?.role;
    };

    const value = {
        ...authState,
        login,
        loginWithGoogle,
        register,
        logout,
        hasPermission,
        updateUserProfile,
        requestPasswordReset,
        resetPassword,
        isLoading,
        getUserRole,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
