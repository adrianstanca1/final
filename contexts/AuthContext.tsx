import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { User, Company, LoginCredentials, RegisterCredentials, AuthState, Permission } from '../types';
import { authApi } from '../services/mockApi';
import { hasPermission as checkPermission } from '../services/auth';

interface AuthContextType extends AuthState {
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (credentials: Partial<RegisterCredentials>) => Promise<void>;
    logout: () => void;
    hasPermission: (permission: Permission) => boolean;
    // Add the ability to finalize login after an external check like MFA
    finalizeLogin: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const parseJwt = (token: string) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
};

// FIX: Changed NodeJS.Timeout to ReturnType<typeof setTimeout> for browser compatibility.
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
                            // FIX: Corrected API call to use authApi.refreshToken
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
                logout(); // Token already expired
            }
        }
    }, [logout]);

    const initAuth = useCallback(async () => {
        const token = localStorage.getItem('token');
        const refreshToken = localStorage.getItem('refreshToken');
        if (token && refreshToken) {
            try {
                const decoded = parseJwt(token);
                if (decoded && decoded.exp * 1000 > Date.now()) {
                    // FIX: Corrected API call to use authApi.me
                    const { user, company } = await authApi.me(token);
                    setAuthState({
                        isAuthenticated: true,
                        token,
                        refreshToken,
                        user,
                        company,
                        loading: false,
                        error: null,
                    });
                    scheduleTokenRefresh(token);
                } else {
                    // FIX: Corrected API call to use authApi.refreshToken
                    const { token: newToken } = await authApi.refreshToken(refreshToken);
                    localStorage.setItem('token', newToken);
                    // FIX: Corrected API call to use authApi.me
                    const { user, company } = await authApi.me(newToken);
                     setAuthState({
                        isAuthenticated: true,
                        token: newToken,
                        refreshToken,
                        user,
                        company,
                        loading: false,
                        error: null,
                    });
                    scheduleTokenRefresh(newToken);
                }
            } catch (error) {
                console.error("Auth init failed", error);
                logout();
            }
        } else {
            setAuthState(prev => ({ ...prev, loading: false }));
        }
    }, [scheduleTokenRefresh, logout]);

    useEffect(() => {
        initAuth();
        return () => {
            if (tokenRefreshTimeout) clearTimeout(tokenRefreshTimeout);
        }
    }, [initAuth]);
    
    const performLogin = async (loginMethod: () => Promise<any>) => {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const { token, refreshToken, user, company } = await loginMethod();
            localStorage.setItem('token', token);
            localStorage.setItem('refreshToken', refreshToken);
            setAuthState({
                isAuthenticated: true,
                token,
                refreshToken,
                user,
                company,
                loading: false,
                error: null,
            });
            scheduleTokenRefresh(token);
        } catch (error: any) {
             const newAuthState: AuthState = {
                isAuthenticated: false,
                token: null,
                refreshToken: null,
                user: null,
                company: null,
                loading: false,
                error: error.message || 'Login failed',
            };
            setAuthState(newAuthState);
            throw error;
        }
    };

    const login = async (credentials: LoginCredentials) => {
        // FIX: Corrected API call to use authApi.login
        await performLogin(() => authApi.login(credentials));
    };
    
    // FIX: Implemented finalizeLogin to complete the authentication flow.
    const finalizeLogin = async (userId: string) => {
        // FIX: Corrected API call to use authApi.finalizeLogin
        await performLogin(() => authApi.finalizeLogin(userId));
    }

    const register = async (credentials: Partial<RegisterCredentials>) => {
        // FIX: Corrected API call to use authApi.register
        await performLogin(() => authApi.register(credentials));
    };

    const hasPermission = (permission: Permission): boolean => {
        return checkPermission(authState.user, permission);
    };
    
    const value = {
        ...authState,
        login,
        register,
        logout,
        hasPermission,
        finalizeLogin,
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
