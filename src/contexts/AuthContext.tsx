import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { User, Company, LoginCredentials, RegistrationPayload, AuthState, Permission } from '../types';
import { authClient, type AuthenticatedSession } from '../services/authClient';
import { hasPermission as checkPermission, authService } from '../services/auth';
import { api } from '../services/mockApi';
import { analytics } from '../services/analyticsService';
import { ValidationService } from '../services/validationService';
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

  const logout = useCallback(() => {
    storage.removeItem('token');
    storage.removeItem('refreshToken');
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

  const scheduleTokenRefresh = useCallback(
    (token: string) => {
      if (tokenRefreshTimeout) {
        clearTimeout(tokenRefreshTimeout);
      }
      const decoded = parseJwt(token);
      if (decoded && decoded.exp) {
        const expiresIn = decoded.exp * 1000 - Date.now() - 60_000;
        if (expiresIn > 0) {
          tokenRefreshTimeout = setTimeout(async () => {
            const storedRefreshToken = storage.getItem('refreshToken');
            if (!storedRefreshToken) {
              logout();
              return;
            }

            try {
              const { token: newToken } = await authClient.refreshToken(storedRefreshToken);
              storage.setItem('token', newToken);
              setAuthState(prev => ({ ...prev, token: newToken }));
              scheduleTokenRefresh(newToken);
            } catch (error) {
              console.error('Proactive token refresh failed', error);
              logout();
            }
          }, expiresIn);
        } else {
          logout();
        }
      }
    },
    [logout],
  );

  const finalizeLogin = useCallback(
    (data: { token: string; refreshToken: string; user: User; company: Company }) => {
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
    },
    [scheduleTokenRefresh],
  );

  const initAuth = useCallback(async () => {
    const token = storage.getItem('token');
    const refreshToken = storage.getItem('refreshToken');

    if (token && refreshToken) {
      try {
        const { user, company } = await authClient.me(token);
        finalizeLogin({ token, refreshToken, user, company });
        return;
      } catch (error) {
        console.log('Stored access token invalid, attempting refresh…');
        try {
          const { token: newToken } = await authClient.refreshToken(refreshToken);
          const { user, company } = await authClient.me(newToken);
          finalizeLogin({ token: newToken, refreshToken, user, company });
          return;
        } catch (refreshError) {
          console.error('Auth init failed after refresh attempt', refreshError);
        }
      }
    }

    setAuthState(prev => ({ ...prev, loading: false }));
  }, [finalizeLogin]);

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

    const validation = ValidationService.validate(credentials, [
      { field: 'email', required: true, type: 'email', sanitize: ValidationService.sanitizers.normalizeEmail },
      { field: 'password', required: true, type: 'string', minLength: 1 },
    ]);

    if (!validation.isValid) {
      const message = `Invalid credentials: ${Object.values(validation.errors).flat().join(', ')}`;
      setAuthState(prev => ({ ...prev, loading: false, error: message }));
      throw new Error(message);
    }

    if (authService.isAccountLocked(credentials.email)) {
      const message = 'Account temporarily locked due to multiple failed login attempts';
      setAuthState(prev => ({ ...prev, loading: false, error: message }));
      authService.recordLoginAttempt(credentials.email, false, {
        ipAddress: 'unknown',
        userAgent: navigator.userAgent,
      });
      throw new Error(message);
    }

    try {
      const response = await authClient.login(validation.sanitizedData as LoginCredentials);
      if (response.mfaRequired) {
        setAuthState(prev => ({ ...prev, loading: false }));
        return { mfaRequired: true, userId: response.userId };
      }

      finalizeLogin(response);
      authService.recordLoginAttempt(credentials.email, true, {
        ipAddress: 'unknown',
        userAgent: navigator.userAgent,
      });
      return { mfaRequired: false };
    } catch (error: any) {
      authService.recordLoginAttempt(credentials.email, false, {
        ipAddress: 'unknown',
        userAgent: navigator.userAgent,
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
      const response = await authClient.verifyMfa(userId, code);
      finalizeLogin(response);
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, loading: false, error: error?.message || 'MFA verification failed' }));
      throw error;
    }
  };

  const register = async (credentials: RegistrationPayload): Promise<AuthenticatedSession> => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const session = await authClient.register(credentials);
      finalizeLogin(session);
      return session;
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, loading: false, error: error?.message || 'Registration failed' }));
      throw error;
    }
  };

  const hasPermission = (permission: Permission): boolean => checkPermission(authState.user, permission);

  const updateUserProfile = async (updates: Partial<User>) => {
    if (!authState.user) {
      throw new Error('Not authenticated');
    }
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
