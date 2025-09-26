import React, { createContext, useState, useContext, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { User, Company, LoginCredentials, RegistrationPayload, AuthState, Permission } from '../types';
import { supabaseAuthService, AuthenticatedSession } from '../services/supabaseAuthService';
import { hasPermission as checkPermission } from '../services/auth';

interface AuthContextType extends AuthState {
    login: (credentials: LoginCredentials) => Promise<{ mfaRequired: boolean; userId?: string }>;
    register: (credentials: RegistrationPayload) => Promise<AuthenticatedSession>;
    logout: () => void;
    hasPermission: (permission: Permission) => boolean;
    verifyMfaAndFinalize: (userId: string, code: string) => Promise<void>;
    updateUserProfile: (updates: Partial<User>) => Promise<void>;
    requestPasswordReset: (email: string) => Promise<void>;
    resetPassword: (token: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

    // Initialize auth state from Supabase session
    const initializeAuth = useCallback(async () => {
        try {
            setAuthState(prev => ({ ...prev, loading: true }));

            const session = await supabaseAuthService.getCurrentSession();

            if (session) {
                setAuthState({
                    isAuthenticated: true,
                    token: session.session.access_token,
                    refreshToken: session.session.refresh_token,
                    user: session.user,
                    company: session.company,
                    loading: false,
                    error: null,
                });
            } else {
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
        } catch (error: any) {
            console.error('Failed to initialize auth:', error);
            setAuthState(prev => ({
                ...prev,
                loading: false,
                error: error.message || 'Failed to initialize authentication',
            }));
        }
    }, []);

    // Listen to Supabase auth state changes
    useEffect(() => {
        const { data: { subscription } } = supabaseAuthService.onAuthStateChange(
            async (event, session) => {
                console.log('Auth state change:', event);

                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    await initializeAuth();
                } else if (event === 'SIGNED_OUT') {
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

        // Initialize on mount
        initializeAuth();

        // Cleanup subscription
        return () => {
            subscription?.unsubscribe();
        };
    }, [initializeAuth]);

    const login = useCallback(async (credentials: LoginCredentials): Promise<{ mfaRequired: boolean; userId?: string }> => {
        try {
            setAuthState(prev => ({ ...prev, loading: true, error: null }));

            const result = await supabaseAuthService.login(credentials);

            if (result.session) {
                setAuthState({
                    isAuthenticated: true,
                    token: result.session.session.access_token,
                    refreshToken: result.session.session.refresh_token,
                    user: result.session.user,
                    company: result.session.company,
                    loading: false,
                    error: null,
                });
            }

            return {
                mfaRequired: result.mfaRequired,
                userId: result.userId
            };
        } catch (error: any) {
            console.error('Login error:', error);
            setAuthState(prev => ({
                ...prev,
                loading: false,
                error: error.message || 'Login failed',
            }));
            throw error;
        }
    }, []);

    const register = useCallback(async (credentials: RegistrationPayload): Promise<AuthenticatedSession> => {
        try {
            setAuthState(prev => ({ ...prev, loading: true, error: null }));

            const session = await supabaseAuthService.register(credentials);

            setAuthState({
                isAuthenticated: true,
                token: session.session.access_token,
                refreshToken: session.session.refresh_token,
                user: session.user,
                company: session.company,
                loading: false,
                error: null,
            });

            return session;
        } catch (error: any) {
            console.error('Registration error:', error);
            setAuthState(prev => ({
                ...prev,
                loading: false,
                error: error.message || 'Registration failed',
            }));
            throw error;
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await supabaseAuthService.logout();

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
            // Even if logout fails, clear local state
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

    const hasPermission = useCallback((permission: Permission): boolean => {
        return supabaseAuthService.hasPermission(authState.user, permission);
    }, [authState.user]);

    const verifyMfaAndFinalize = useCallback(async (userId: string, code: string): Promise<void> => {
        // MFA implementation can be added later
        throw new Error('MFA not implemented yet');
    }, []);

    const updateUserProfile = useCallback(async (updates: Partial<User>): Promise<void> => {
        if (!authState.user) {
            throw new Error('No user logged in');
        }

        try {
            await supabaseAuthService.updateUserProfile(authState.user.id, updates);

            // Update local state
            setAuthState(prev => ({
                ...prev,
                user: prev.user ? { ...prev.user, ...updates } : null
            }));
        } catch (error: any) {
            console.error('Profile update error:', error);
            throw error;
        }
    }, [authState.user]);

    const requestPasswordReset = useCallback(async (email: string): Promise<void> => {
        try {
            await supabaseAuthService.requestPasswordReset(email);
        } catch (error: any) {
            console.error('Password reset request error:', error);
            throw error;
        }
    }, []);

    const resetPassword = useCallback(async (token: string, newPassword: string): Promise<void> => {
        try {
            // For Supabase, the token is handled automatically via URL parameters
            await supabaseAuthService.resetPassword(newPassword);
        } catch (error: any) {
            console.error('Password reset error:', error);
            throw error;
        }
    }, []);

    const contextValue: AuthContextType = useMemo(() => ({
        ...authState,
        login,
        register,
        logout,
        hasPermission,
        verifyMfaAndFinalize,
        updateUserProfile,
        requestPasswordReset,
        resetPassword,
    }), [
        authState,
        login,
        register,
        logout,
        hasPermission,
        verifyMfaAndFinalize,
        updateUserProfile,
        requestPasswordReset,
        resetPassword,
    ]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;