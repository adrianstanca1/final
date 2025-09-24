import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { User, Company, LoginCredentials, AuthState, Permission, SocialProvider } from '../types';
import { hasPermission as checkPermission, authService } from '../services/auth';
import { api } from '../services/mockApi';
import { analytics } from '../services/analyticsService';
import { ValidationService } from '../services/validationService';
import { getStorage as getAppStorage } from '../utils/storage';
import { authClient, type AuthenticatedSession, type LoginResult } from '../services/authClient';
import type { RegistrationPayload } from '../types';

type Persistence = 'local' | 'session';

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';
const PERSISTENCE_KEY = 'asagents_auth_persistence';

const isBrowser = () => typeof window !== 'undefined';

const getBrowserStorage = (persistence: Persistence): Storage | null => {
    if (!isBrowser()) return null;
    return persistence === 'local' ? window.localStorage : window.sessionStorage;
};

const clearStoredTokens = () => {
    if (!isBrowser()) return;
    [window.localStorage, window.sessionStorage].forEach(storage => {
        storage.removeItem(TOKEN_KEY);
        storage.removeItem(REFRESH_TOKEN_KEY);
        storage.removeItem(PERSISTENCE_KEY);
    });
};

const storeTokens = (token: string, refreshToken: string | null, persistence: Persistence) => {
    const targetStorage = getBrowserStorage(persistence);
    if (!targetStorage) return;

    targetStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) {
        targetStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    targetStorage.setItem(PERSISTENCE_KEY, persistence);

    const otherStorage = getBrowserStorage(persistence === 'local' ? 'session' : 'local');
    otherStorage?.removeItem(TOKEN_KEY);
    otherStorage?.removeItem(REFRESH_TOKEN_KEY);
    otherStorage?.removeItem(PERSISTENCE_KEY);
};

const readStoredTokens = (): { token: string | null; refreshToken: string | null; persistence: Persistence } => {
    if (!isBrowser()) {
        return { token: null, refreshToken: null, persistence: 'local' };
    }

    const storages: Array<{ storage: Storage; persistence: Persistence }> = [
        { storage: window.localStorage, persistence: 'local' },
        { storage: window.sessionStorage, persistence: 'session' },
    ];

    for (const { storage, persistence } of storages) {
        const token = storage.getItem(TOKEN_KEY);
        const refreshToken = storage.getItem(REFRESH_TOKEN_KEY);
        if (token && refreshToken) {
            storage.setItem(PERSISTENCE_KEY, persistence);
            return { token, refreshToken, persistence };
        }
    }

    const preference =
        (window.localStorage.getItem(PERSISTENCE_KEY) as Persistence | null) ??
        (window.sessionStorage.getItem(PERSISTENCE_KEY) as Persistence | null) ??
        'local';

    return { token: null, refreshToken: null, persistence: preference };
};

interface AuthContextType extends AuthState {
    login: (credentials: LoginCredentials) => Promise<{ mfaRequired: boolean; userId?: string }>;
    register: (credentials: RegistrationPayload) => Promise<AuthenticatedSession>;
    socialLogin: (provider: SocialProvider, profile?: { email?: string; name?: string }) => Promise<AuthenticatedSession>;
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
    } catch (error) {
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
    const [pendingPersistence, setPendingPersistence] = useState<Persistence>('local');

    const appStorage = getAppStorage();

    const logout = useCallback(() => {
        clearStoredTokens();
        appStorage.removeItem(TOKEN_KEY);
        appStorage.removeItem(REFRESH_TOKEN_KEY);
        if (tokenRefreshTimeout) {
            clearTimeout(tokenRefreshTimeout);
        }
        setPendingPersistence('local');
        setAuthState({
            isAuthenticated: false,
            token: null,
            refreshToken: null,
            user: null,
            company: null,
            loading: false,
            error: null,
        });
    }, [appStorage]);

    const scheduleTokenRefresh = useCallback(
        (token: string, persistence: Persistence) => {
            if (tokenRefreshTimeout) {
                clearTimeout(tokenRefreshTimeout);
            }
            const decoded = parseJwt(token);
            if (decoded && decoded.exp) {
                const expiresIn = decoded.exp * 1000 - Date.now() - 60000;
                if (expiresIn > 0) {
                    tokenRefreshTimeout = setTimeout(async () => {
                        const storage = getBrowserStorage(persistence);
                        if (!storage) {
                            return;
                        }
                        const storedRefreshToken = storage.getItem(REFRESH_TOKEN_KEY);
                        if (!storedRefreshToken) {
                            logout();
                            return;
                        }
                        try {
                            console.log('Proactively refreshing token...');
                            const { token: newToken } = await authClient.refreshToken(storedRefreshToken);
                            storeTokens(newToken, storedRefreshToken, persistence);
                            setAuthState(prev => ({ ...prev, token: newToken }));
                            scheduleTokenRefresh(newToken, persistence);
                        } catch (error) {
                            console.error('Proactive token refresh failed', error);
                            logout();
                        }
                    }, expiresIn);
                } else {
                    console.warn('Token is already expired or has less than a minute left. Logging out.');
                    logout();
                }
            }
        },
        [logout],
    );

    const finalizeLogin = useCallback(
        (
            data: { token: string; refreshToken: string; user: User; company: Company },
            persistence: Persistence,
        ) => {
            storeTokens(data.token, data.refreshToken, persistence);
            setAuthState({
                isAuthenticated: true,
                token: data.token,
                refreshToken: data.refreshToken,
                user: data.user,
                company: data.company,
                loading: false,
                error: null,
            });
            setPendingPersistence(persistence);
            scheduleTokenRefresh(data.token, persistence);
        },
        [scheduleTokenRefresh],
    );

    const initAuth = useCallback(async () => {
        const { token, refreshToken, persistence } = readStoredTokens();
        if (token && refreshToken) {
            try {
                const { user, company } = await authClient.me(token);
                finalizeLogin({ token, refreshToken, user, company }, persistence);
            } catch (error) {
                console.log('Access token invalid, attempting reactive refresh...');
                try {
                    const { token: newToken } = await authClient.refreshToken(refreshToken);
                    const { user, company } = await authClient.me(newToken);
                    finalizeLogin({ token: newToken, refreshToken, user, company }, persistence);
                } catch (refreshError) {
                    console.error('Auth init with refresh token failed, logging out.', refreshError);
                    logout();
                }
            }
        } else {
            setAuthState(prev => ({ ...prev, loading: false }));
        }
    }, [finalizeLogin, logout]);

    useEffect(() => {
        initAuth();
        return () => {
            if (tokenRefreshTimeout) {
                clearTimeout(tokenRefreshTimeout);
            }
        };
    }, [initAuth]);

    const login = async (credentials: LoginCredentials): Promise<{ mfaRequired: boolean; userId?: string }> => {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));
        const desiredPersistence: Persistence = credentials.rememberMe === false ? 'session' : 'local';
        setPendingPersistence(desiredPersistence);

        const validation = ValidationService.validate(credentials, [
            { field: 'email', required: true, type: 'email', sanitize: ValidationService.sanitizers.normalizeEmail },
            { field: 'password', required: true, type: 'string', minLength: 1 },
        ]);

        if (!validation.isValid) {
            const error = new Error(`Invalid credentials: ${Object.values(validation.errors).flat().join(', ')}`);
            setAuthState(prev => ({ ...prev, loading: false, error: error.message }));
            throw error;
        }

        if (authService.isAccountLocked(credentials.email)) {
            const error = new Error('Account temporarily locked due to multiple failed login attempts');
            setAuthState(prev => ({ ...prev, loading: false, error: error.message }));
            authService.recordLoginAttempt(credentials.email, false, {
                ipAddress: 'unknown',
                userAgent: isBrowser() ? navigator.userAgent : 'server',
            });
            throw error;
        }

        try {
            const response: LoginResult = await authClient.login(validation.sanitizedData);

            authService.recordLoginAttempt(credentials.email, true, {
                ipAddress: 'unknown',
                userAgent: isBrowser() ? navigator.userAgent : 'server',
            });

            if (response.mfaRequired) {
                setAuthState(prev => ({ ...prev, loading: false }));
                return { mfaRequired: true, userId: response.userId };
            }

            finalizeLogin(response, desiredPersistence);
            return { mfaRequired: false };
        } catch (error: any) {
            authService.recordLoginAttempt(credentials.email, false, {
                ipAddress: 'unknown',
                userAgent: isBrowser() ? navigator.userAgent : 'server',
            });

            analytics.trackError(error, {
                operation: 'login',
                email: credentials.email,
            });

            setAuthState(prev => ({
                ...prev,
                token: null,
                refreshToken: null,
                user: null,
                company: null,
                isAuthenticated: false,
                loading: false,
                error: error?.message || 'Login failed',
            }));
            throw error;
        }
    };

    const verifyMfaAndFinalize = async (userId: string, code: string) => {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const session = await authClient.verifyMfa(userId, code);
            finalizeLogin(session, pendingPersistence);
        } catch (error: any) {
            setAuthState(prev => ({ ...prev, loading: false, error: error?.message || 'MFA verification failed' }));
            throw error;
        }
    };

    const register = async (credentials: RegistrationPayload): Promise<AuthenticatedSession> => {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const session = await authClient.register(credentials);
            finalizeLogin(session, 'local');
            return session;
        } catch (error: any) {
            setAuthState(prev => ({ ...prev, loading: false, error: error?.message || 'Registration failed' }));
            throw error;
        }
    };

    const socialLogin = async (
        provider: SocialProvider,
        profile: { email?: string; name?: string } = {},
    ): Promise<AuthenticatedSession> => {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const session = await authClient.socialLogin(provider, profile);
            finalizeLogin(session, 'local');
            return session;
        } catch (error: any) {
            setAuthState(prev => ({ ...prev, loading: false, error: error?.message || 'Social sign-in failed' }));
            throw error;
        }
    };

    const hasPermission = (permission: Permission): boolean => checkPermission(authState.user, permission);

    const updateUserProfile = async (updates: Partial<User>) => {
        if (!authState.user) throw new Error('Not authenticated');
        const updatedUser = await api.updateUser(authState.user.id, updates, undefined, authState.user.id);
        setAuthState(prev => ({
            ...prev,
            user: { ...prev.user, ...updatedUser } as User,
        }));
    };

    const requestPasswordReset = async (email: string) => {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));
        try {
            await authClient.requestPasswordReset(email);
            setAuthState(prev => ({ ...prev, loading: false }));
        } catch (error: any) {
            setAuthState(prev => ({ ...prev, loading: false, error: error?.message || 'Request failed' }));
            throw error;
        }
    };

    const resetPassword = async (token: string, newPassword: string) => {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));
        try {
            await authClient.resetPassword(token, newPassword);
            setAuthState(prev => ({ ...prev, loading: false }));
        } catch (error: any) {
            setAuthState(prev => ({ ...prev, loading: false, error: error?.message || 'Password reset failed' }));
            throw error;
        }
    };

    const value: AuthContextType = {
        ...authState,
        login,
        register,
        socialLogin,
        logout,
        hasPermission,
        verifyMfaAndFinalize,
        updateUserProfile,
        requestPasswordReset,
        resetPassword,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

