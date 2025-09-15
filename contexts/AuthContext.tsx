import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { User, Company, LoginCredentials, RegisterCredentials, AuthState, Permission } from '../types';
import { authApi } from '../services/mockApi';
import { hasPermission as checkPermission } from '../services/auth';
import { api } from '../services/mockApi';

interface AuthContextType extends AuthState {
    login: (credentials: LoginCredentials) => Promise<{ mfaRequired: boolean; userId?: string }>;
    register: (credentials: Partial<RegisterCredentials>) => Promise<void>;
    logout: () => void;
    hasPermission: (permission: Permission) => boolean;
    verifyMfaAndFinalize: (userId: string, code: string) => Promise<void>;
    updateUserProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const parseJwt = (token: string) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
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
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
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
    }, []);

    const scheduleTokenRefresh = useCallback((token: string) => {
        if (tokenRefreshTimeout) {
            clearTimeout(tokenRefreshTimeout);
        }
        const decoded = parseJwt(token);
        if (decoded && decoded.exp) {
            const expiresIn = (decoded.exp * 1000) - Date.now() - 60000; // Refresh 1 minute before expiry
            if (expiresIn > 0) {
                tokenRefreshTimeout = setTimeout(async () => {
                    const storedRefreshToken = localStorage.getItem('refreshToken');
                    if (storedRefreshToken) {
                        try {
                            const { token: newToken } = await authApi.refreshToken(storedRefreshToken);
                            localStorage.setItem('token', newToken);
                            setAuthState(prev => ({ ...prev, token: newToken }));
                            scheduleTokenRefresh(newToken);
                        } catch (error) {
                            console.error("Token refresh failed", error);
                            logout();
                        }
                    }
                }, expiresIn);
            } else {
                logout();
            }
        }
    }, [logout]);
    
    const finalizeLogin = useCallback((data: { token: string, refreshToken: string, user: User, company: Company }) => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
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
        const token = localStorage.getItem('token');
        const refreshToken = localStorage.getItem('refreshToken');
        if (token && refreshToken) {
            try {
                const decoded = parseJwt(token);
                if (decoded && decoded.exp * 1000 > Date.now()) {
                    const { user, company } = await authApi.me(token);
                    finalizeLogin({ token, refreshToken, user, company });
                } else {
                    const { token: newToken } = await authApi.refreshToken(refreshToken);
                    const { user, company } = await authApi.me(newToken);
                    finalizeLogin({ token: newToken, refreshToken, user, company });
                }
            } catch (error) {
                console.error("Auth init failed", error);
                logout();
            }
        } else {
            setAuthState(prev => ({ ...prev, loading: false }));
        }
    }, [finalizeLogin, logout]);

    useEffect(() => {
        initAuth();
        return () => {
            if (tokenRefreshTimeout) clearTimeout(tokenRefreshTimeout);
        }
    }, [initAuth]);

    const login = async (credentials: LoginCredentials): Promise<{ mfaRequired: boolean; userId?: string }> => {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const response = await authApi.login(credentials);
            if (response.mfaRequired) {
                setAuthState(prev => ({ ...prev, loading: false }));
                return { mfaRequired: true, userId: response.userId };
            }
            
            finalizeLogin(response);
            return { mfaRequired: false };

        } catch (error: any) {
            setAuthState(prev => ({ ...prev, token: null, refreshToken: null, user: null, company: null, isAuthenticated: false, loading: false, error: error.message || 'Login failed' }));
            throw error;
        }
    };
    
    const verifyMfaAndFinalize = async (userId: string, code: string) => {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));
         try {
            const response = await authApi.verifyMfa(userId, code);
            finalizeLogin(response);
        } catch (error: any) {
            setAuthState(prev => ({ ...prev, loading: false, error: error.message || 'MFA verification failed'}));
            throw error;
        }
    }

    const register = async (credentials: Partial<RegisterCredentials>) => {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const response = await authApi.register(credentials);
            finalizeLogin(response);
        } catch (error: any) {
             setAuthState(prev => ({ ...prev, loading: false, error: error.message || 'Registration failed'}));
            throw error;
        }
    };

    const hasPermission = (permission: Permission): boolean => {
        return checkPermission(authState.user, permission);
    };

    const updateUserProfile = async (updates: Partial<User>) => {
        if (!authState.user) throw new Error("Not authenticated");
        // Pass undefined for projectIds to avoid triggering assignment updates
        const updatedUser = await api.updateUser(authState.user.id, updates, undefined, authState.user.id);
        setAuthState(prev => ({
            ...prev,
            user: { ...prev.user, ...updatedUser } as User,
        }));
    };
    
    const value = {
        ...authState,
        login,
        register,
        logout,
        hasPermission,
        verifyMfaAndFinalize,
        updateUserProfile,
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