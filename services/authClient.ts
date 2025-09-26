import { firebaseAuthClient } from './firebaseAuthClient';
import { authApi } from './mockApi';
import type { LoginCredentials, RegistrationPayload, User, Company, Role, CompanyType } from '../types';

export type AuthenticatedSession = {
    success: true;
    token: string;
    refreshToken: string;
    user: User;
    company: Company;
};

export type LoginResult =
    | (AuthenticatedSession & { mfaRequired?: false })
    | { success: true; mfaRequired: true; userId: string };

export type InvitePreview = {
    companyId: string;
    companyName: string;
    companyType?: CompanyType;
    allowedRoles: Role[];
    suggestedRole?: Role;
};

export type EmailAvailability = { available: boolean };

export type AuthConnectionInfo = {
    mode: 'firebase' | 'mock';
    baseUrl: string | null;
    baseHost: string | null;
    allowMockFallback: boolean;
};

class BackendUnavailableError extends Error {
    constructor(message: string, public cause?: unknown) {
        super(message);
        this.name = 'BackendUnavailableError';
    }
}

// Firebase config check
const isFirebaseConfigured = () => {
    try {
        return !!(
            (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_FIREBASE_API_KEY) ||
            (typeof process !== 'undefined' && process.env?.VITE_FIREBASE_API_KEY)
        );
    } catch {
        return false;
    }
};

const useFirebase = isFirebaseConfigured();
let allowMockFallback = !useFirebase;

type AuthClientListener = () => void;
const subscribers = new Set<AuthClientListener>();

const notifySubscribers = () => {
    subscribers.forEach(listener => {
        try {
            listener();
        } catch (error) {
            console.error('[authClient] subscriber callback failed', error);
        }
    });
};

export const subscribeToAuthClientChanges = (listener: AuthClientListener): (() => void) => {
    subscribers.add(listener);
    return () => {
        subscribers.delete(listener);
    };
};

const withFirebaseOrMock = async <T>(firebaseCall: () => Promise<T>, mockCall: () => Promise<T>): Promise<T> => {
    if (useFirebase) {
        try {
            return await firebaseCall();
        } catch (error) {
            if (allowMockFallback) {
                console.warn('[authClient] Firebase failed, falling back to mock authentication.', error);
                return mockCall();
            }
            throw error;
        }
    }
    return mockCall();
};

export const configureAuthClient = (options: { allowMockFallback?: boolean } = {}) => {
    if (Object.prototype.hasOwnProperty.call(options, 'allowMockFallback')) {
        const nextAllowMockFallback = !!options.allowMockFallback;
        const hasChanged = nextAllowMockFallback !== allowMockFallback;
        if (hasChanged) {
            allowMockFallback = nextAllowMockFallback;
            notifySubscribers();
        }
    }
};

export const resetAuthClient = () => {
    const nextAllowMockFallback = !useFirebase;
    const hasChanged = nextAllowMockFallback !== allowMockFallback;
    if (hasChanged) {
        allowMockFallback = nextAllowMockFallback;
        notifySubscribers();
    }
};

export const getAuthConnectionInfo = (): AuthConnectionInfo => ({
    mode: useFirebase ? ('firebase' as const) : ('mock' as const),
    baseUrl: useFirebase ? 'firebase' : null,
    baseHost: useFirebase ? 'firebase' : null,
    allowMockFallback,
});

export const authClient = {
    login: async (credentials: LoginCredentials): Promise<LoginResult> => {
        return withFirebaseOrMock(
            async () => {
                const result = await firebaseAuthClient.login(credentials);
                if (result.session) {
                    const { user, company } = await firebaseAuthClient.me(result.session.token);
                    return {
                        success: true as const,
                        token: result.session.token,
                        refreshToken: result.session.refreshToken,
                        user,
                        company,
                        mfaRequired: false as const
                    };
                } else if (result.mfaRequired) {
                    return {
                        success: true as const,
                        mfaRequired: true as const,
                        userId: result.userId!
                    };
                }
                throw new Error('Unexpected login result');
            },
            () => authApi.login(credentials)
        );
    },

    register: async (payload: RegistrationPayload): Promise<AuthenticatedSession> => {
        return withFirebaseOrMock(
            async () => {
                const session = await firebaseAuthClient.register(payload);
                const { user, company } = await firebaseAuthClient.me(session.token);
                return {
                    success: true as const,
                    token: session.token,
                    refreshToken: session.refreshToken,
                    user,
                    company
                };
            },
            () => authApi.register(payload)
        );
    },

    verifyMfa: async (userId: string, code: string): Promise<AuthenticatedSession> => {
        return withFirebaseOrMock(
            async () => {
                const session = await firebaseAuthClient.verifyMfa(userId, code);
                const { user, company } = await firebaseAuthClient.me(session.token);
                return {
                    success: true as const,
                    token: session.token,
                    refreshToken: session.refreshToken,
                    user,
                    company
                };
            },
            () => authApi.verifyMfa(userId, code)
        );
    },

    refreshToken: (refreshToken: string): Promise<{ token: string }> =>
        withFirebaseOrMock(
            () => firebaseAuthClient.refreshToken(refreshToken),
            () => authApi.refreshToken(refreshToken)
        ),

    me: (token: string): Promise<{ user: User; company: Company }> =>
        withFirebaseOrMock(
            () => firebaseAuthClient.me(token),
            () => authApi.me(token)
        ),

    checkEmailAvailability: (email: string): Promise<EmailAvailability> =>
        withFirebaseOrMock(
            async () => ({ available: true }), // Firebase doesn't have this check built-in
            () => authApi.checkEmailAvailability(email)
        ),

    lookupInviteToken: (token: string): Promise<InvitePreview> =>
        withFirebaseOrMock(
            async () => {
                throw new Error('Invite tokens not implemented in Firebase mode');
            },
            () => authApi.lookupInviteToken(token)
        ),

    requestPasswordReset: (email: string): Promise<{ success: boolean }> =>
        withFirebaseOrMock(
            async () => {
                await firebaseAuthClient.requestPasswordReset(email);
                return { success: true };
            },
            () => authApi.requestPasswordReset(email)
        ),

    resetPassword: (token: string, newPassword: string): Promise<{ success: boolean }> =>
        withFirebaseOrMock(
            async () => {
                await firebaseAuthClient.resetPassword(token, newPassword);
                return { success: true };
            },
            () => authApi.resetPassword(token, newPassword)
        ),
};

