import React, { createContext, useState, useContext, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { User, Company, LoginCredentials, RegistrationPayload, AuthState, Permission } from '../types';
import { authClient, type AuthenticatedSession } from '../services/authClient';
import { hasPermission as checkPermission } from '../services/auth';
import { api } from '../services/mockApi';
import { getStorage } from '../utils/storage';

const storage = getStorage();

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

const parseJwt = (token: string) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        console.error('Failed to parse JWT token:', e);
        return null;
    }
};

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

    const logout = useCallback(() => {
        if (tokenRefreshTimeout) {
            clearTimeout(tokenRefreshTimeout);
            tokenRefreshTimeout = null;
        }
        storage.removeItem('token');
        storage.removeItem('refreshToken');
        setAuthState({
            isAuthenticated: false,
            token: null,
            refreshToken: null,
            user: null,
            company: null,
            loading: false,
            error: null,
        });
    }, []);

    const scheduleTokenRefresh = useCallback((token: string) => {
        const payload = parseJwt(token);
        if (payload?.exp) {
            const expirationTime = payload.exp * 1000;
            const currentTime = Date.now();
            const timeUntilExpiry = expirationTime - currentTime;
            const refreshTime = Math.max(timeUntilExpiry - 60000, 0); // Refresh 1 minute before expiry

            if (refreshTime > 0) {
                tokenRefreshTimeout = setTimeout(async () => {
                    try {
                        const refreshToken = storage.getItem('refreshToken');
                        if (refreshToken) {
                            const { token: newToken } = await authClient.refreshToken(refreshToken);
                            storage.setItem('token', newToken);
                            setAuthState(prev => ({
                                ...prev,
                                token: newToken,
                            }));
                            scheduleTokenRefresh(newToken);
                        }
                    } catch (error) {
                        console.error('Token refresh failed:', error);
                        logout();
                    }
                }, refreshTime);
            } else {
                console.warn("Token is already expired or has less than a minute left. Logging out.");
                logout();
            }
        }
    }, [logout]);
    
    const finalizeLogin = useCallback((data: { token: string, refreshToken: string, user: User, company: Company }) => {
        storage.setItem('token', data.token);
        storage.setItem('refreshToken', data.refreshToken);
        setAuthState({
            isAuthenticated: true,
            token: data.token,
            refreshToken: data.refreshToken,
            user: data.user,
            company: data.company,
            loading: false,
            error: null,
        });
        scheduleTokenRefresh(data.token);
    }, [scheduleTokenRefresh]);

    const initAuth = useCallback(async () => {
        const token = storage.getItem('token');
        const refreshToken = storage.getItem('refreshToken');
        
        if (token && refreshToken) {
            try {
                const { user, company } = await authClient.me(token);
                finalizeLogin({ token, refreshToken, user, company });
            } catch (error) {
                console.warn("Access token invalid, attempting reactive refresh...", error);
                try {
                    const { token: newToken } = await authClient.refreshToken(refreshToken);
                    const { user, company } = await authClient.me(newToken);
                    finalizeLogin({ token: newToken, refreshToken, user, company });
                } catch (refreshError) {
                    console.error("Auth init with refresh token failed, logging out.", refreshError);
                    logout();
                }
            }
        } else {
            setAuthState(prev => ({ ...prev, loading: false }));
        }
    }, [finalizeLogin, logout]);

    const login = useCallback(async (credentials: LoginCredentials) => {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));
        
        try {
            const result = await authClient.login(credentials);
            
            if (result.mfaRequired) {
                setAuthState(prev => ({ ...prev, loading: false }));
                return { mfaRequired: true, userId: result.userId };
            }
            
            if (result.session) {
                const { user, company } = await authClient.me(result.session.token);
                finalizeLogin({
                    token: result.session.token,
                    refreshToken: result.session.refreshToken,
                    user,
                    company
                });
            }
            
            return { mfaRequired: false };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Login failed';
            setAuthState(prev => ({
                ...prev,
                loading: false,
                error: errorMessage,
            }));
            throw error;
        }
    }, [finalizeLogin]);

    const register = useCallback(async (payload: RegistrationPayload): Promise<AuthenticatedSession> => {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));
        
        try {
            const session = await authClient.register(payload);
            const { user, company } = await authClient.me(session.token);
            
            finalizeLogin({
                token: session.token,
                refreshToken: session.refreshToken,
                user,
                company
            });
            
            return session;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Registration failed';
            setAuthState(prev => ({
                ...prev,
                loading: false,
                error: errorMessage,
            }));
            throw error;
        }
    }, [finalizeLogin]);

    const verifyMfaAndFinalize = useCallback(async (userId: string, code: string) => {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));
        
        try {
            const session = await authClient.verifyMfa(userId, code);
            const { user, company } = await authClient.me(session.token);
            
            finalizeLogin({
                token: session.token,
                refreshToken: session.refreshToken,
                user,
                company
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'MFA verification failed';
            setAuthState(prev => ({
                ...prev,
                loading: false,
                error: errorMessage,
            }));
            throw error;
        }
    }, [finalizeLogin]);

    const updateUserProfile = useCallback(async (updates: Partial<User>) => {
        if (!authState.user) {
            throw new Error('No authenticated user');
        }
        
        try {
            const updatedUser = await api.updateUser(authState.user.id, updates);
            setAuthState(prev => ({
                ...prev,
                user: updatedUser,
            }));
        } catch (error) {
            console.error('Profile update failed:', error);
            throw error;
        }
    }, [authState.user]);

    const requestPasswordReset = useCallback(async (email: string) => {
        await authClient.requestPasswordReset(email);
    }, []);

    const resetPassword = useCallback(async (token: string, newPassword: string) => {
        await authClient.resetPassword(token, newPassword);
    }, []);

    const hasPermission = useCallback((permission: Permission): boolean => {
        return checkPermission(authState.user, permission);
    }, [authState.user]);

    useEffect(() => {
        initAuth();
        
        return () => {
            if (tokenRefreshTimeout) {
                clearTimeout(tokenRefreshTimeout);
            }
        };
    }, [initAuth]);

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
    }), [authState, login, register, logout, hasPermission, verifyMfaAndFinalize, updateUserProfile, requestPasswordReset, resetPassword]);

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