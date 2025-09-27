import { authApi } from './mockApi';
import type { LoginCredentials, RegistrationPayload, User, Company, Role, CompanyType, SocialProvider } from '../types';
import { getEnvironment, refreshEnvironment } from '../config/environment';
import { oauthService, type OAuthUserInfo } from './oauthService';

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
    mode: 'backend' | 'mock';
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

const sanitizeBaseUrl = (value?: string | null): string | null => {
    if (!value) {
        return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    return trimmed.replace(/\/+$/, '');
};

const initialEnvironment = getEnvironment();
let defaultBaseUrl = initialEnvironment.apiUrl;
let defaultAllowMockFallback = !defaultBaseUrl;
let runtimeBaseUrl = defaultBaseUrl;
let allowMockFallback = defaultAllowMockFallback;

type AuthClientListener = () => void;
const subscribers = new Set<AuthClientListener>();
let cachedConnectionInfo: AuthConnectionInfo | null = null;

const notifySubscribers = () => {
    // Invalidate cache when configuration changes
    cachedConnectionInfo = null;

    subscribers.forEach(listener => {
        try {
            listener();
        } catch (error) {
            if (typeof console !== 'undefined' && typeof console.error === 'function') {
                console.error('[authClient] subscriber callback failed', error);
            }
        }
    });
};

export const subscribeToAuthClientChanges = (listener: AuthClientListener): (() => void) => {
    subscribers.add(listener);
    return () => {
        subscribers.delete(listener);
    };
};

const buildHeaders = (headers: HeadersInit | undefined, body: BodyInit | null | undefined) => {
    const composed = new Headers(headers ?? {});
    if (!composed.has('Accept')) {
        composed.set('Accept', 'application/json');
    }
    if (body != null && body !== '' && !composed.has('Content-Type')) {
        composed.set('Content-Type', 'application/json');
    }
    return composed;
};

const ensureLeadingSlash = (path: string) => (path.startsWith('/') ? path : `/${path}`);

const request = async <T>(path: string, init: RequestInit): Promise<T> => {
    if (!runtimeBaseUrl) {
        throw new BackendUnavailableError('No authentication backend configured.');
    }

    const url = `${runtimeBaseUrl}${ensureLeadingSlash(path)}`;
    let response: Response;
    try {
        response = await fetch(url, {
            ...init,
            headers: buildHeaders(init.headers, init.body ?? undefined),
        });
    } catch (error) {
        throw new BackendUnavailableError('Unable to reach authentication service.', error);
    }

    let data: any = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        data = await response.json();
    } else {
        const text = await response.text();
        data = text ? { message: text } : {};
    }

    if (!response.ok) {
        const message = data?.message || data?.error || `Request failed with status ${response.status}`;
        const error: any = new Error(message);
        error.status = response.status;
        error.details = data;
        throw error;
    }

    return data as T;
};

const withAuthFallback = async <T>(path: string, init: RequestInit, fallback: () => Promise<T>): Promise<T> => {
    if (!runtimeBaseUrl) {
        return fallback();
    }
    try {
        return await request<T>(path, init);
    } catch (error) {
        if (error instanceof BackendUnavailableError) {
            if (allowMockFallback) {
                console.warn('[authClient] Falling back to local mock authentication.', error);
                return fallback();
            }
            const friendly = new Error('Authentication service is currently unavailable. Please try again later.');
            (friendly as any).cause = error;
            throw friendly;
        }
        throw error;
    }
};

export const configureAuthClient = (options: { baseUrl?: string | null; allowMockFallback?: boolean } = {}) => {
    let nextBaseUrl = runtimeBaseUrl;
    let nextAllowMockFallback = allowMockFallback;

    if (Object.prototype.hasOwnProperty.call(options, 'baseUrl')) {
        nextBaseUrl = sanitizeBaseUrl(options.baseUrl ?? null);
        if (Object.prototype.hasOwnProperty.call(options, 'allowMockFallback')) {
            nextAllowMockFallback = !!options.allowMockFallback;
        } else {
            nextAllowMockFallback = !nextBaseUrl;
        }
    } else if (Object.prototype.hasOwnProperty.call(options, 'allowMockFallback')) {
        nextAllowMockFallback = !!options.allowMockFallback;
    }

    const hasChanged = nextBaseUrl !== runtimeBaseUrl || nextAllowMockFallback !== allowMockFallback;
    if (hasChanged) {
        runtimeBaseUrl = nextBaseUrl;
        allowMockFallback = nextAllowMockFallback;
        notifySubscribers();
    }
};

export const resetAuthClient = () => {
    refreshEnvironment();
    const refreshed = getEnvironment();
    defaultBaseUrl = refreshed.apiUrl;
    defaultAllowMockFallback = !defaultBaseUrl;

    const hasChanged = runtimeBaseUrl !== defaultBaseUrl || allowMockFallback !== defaultAllowMockFallback;
    runtimeBaseUrl = defaultBaseUrl;
    allowMockFallback = defaultAllowMockFallback;
    if (hasChanged) {
        notifySubscribers();
    }
};

const formatBaseHost = (baseUrl: string | null) => {
    if (!baseUrl) {
        return null;
    }
    try {
        return new URL(baseUrl).host;
    } catch {
        return baseUrl.replace(/^https?:\/\//, '');
    }
};

export const getAuthConnectionInfo = (): AuthConnectionInfo => {
    const currentMode = runtimeBaseUrl ? ('backend' as const) : ('mock' as const);
    const currentBaseHost = formatBaseHost(runtimeBaseUrl);

    if (!cachedConnectionInfo ||
        cachedConnectionInfo.mode !== currentMode ||
        cachedConnectionInfo.baseUrl !== runtimeBaseUrl ||
        cachedConnectionInfo.baseHost !== currentBaseHost ||
        cachedConnectionInfo.allowMockFallback !== allowMockFallback) {

        cachedConnectionInfo = {
            mode: currentMode,
            baseUrl: runtimeBaseUrl,
            baseHost: currentBaseHost,
            allowMockFallback,
        };
    }
    return cachedConnectionInfo;
};

export const authClient = {
    login: (credentials: LoginCredentials): Promise<LoginResult> =>
        withAuthFallback<LoginResult>(
            '/auth/login',
            { method: 'POST', body: JSON.stringify(credentials) },
            () => authApi.login(credentials)
        ),

    register: (payload: RegistrationPayload): Promise<AuthenticatedSession> =>
        withAuthFallback<AuthenticatedSession>(
            '/auth/register',
            { method: 'POST', body: JSON.stringify(payload) },
            () => authApi.register(payload)
        ),

    socialLogin: async (provider: SocialProvider, profile: { email?: string; name?: string } = {}): Promise<AuthenticatedSession> => {
        // Try OAuth service first for enhanced authentication
        try {
            let oauthUserInfo: OAuthUserInfo | null = null;

            if (provider === 'google' || provider === 'facebook') {
                oauthUserInfo = await oauthService.initiateOAuthIo(provider);
            }

            if (oauthUserInfo) {
                // Use OAuth service data
                return await withAuthFallback<AuthenticatedSession>(
                    '/auth/social/login',
                    { method: 'POST', body: JSON.stringify({ provider, ...oauthUserInfo }) },
                    () => authApi.socialLogin({ provider, email: oauthUserInfo!.email, name: oauthUserInfo!.name })
                );
            }
        } catch (error) {
            console.warn('OAuth service failed, falling back to basic social login:', error);
        }

        // Fallback to basic social login
        return withAuthFallback<AuthenticatedSession>(
            '/auth/social/login',
            { method: 'POST', body: JSON.stringify({ provider, ...profile }) },
            () => authApi.socialLogin({ provider, ...profile })
        );
    },

    githubLogin: async (): Promise<AuthenticatedSession> => {
        try {
            await oauthService.initiateGitHubAuth();
            // This will redirect to GitHub, so we won't reach this point
            throw new Error('GitHub authentication redirect failed');
        } catch (error) {
            console.error('GitHub OAuth failed:', error);
            throw error;
        }
    },

    handleGitHubCallback: async (code: string, state: string): Promise<AuthenticatedSession> => {
        try {
            const userInfo = await oauthService.handleGitHubCallback(code, state);
            return await withAuthFallback<AuthenticatedSession>(
                '/auth/github/callback',
                { method: 'POST', body: JSON.stringify({ code, state }) },
                () => authApi.socialLogin({ provider: 'google', email: userInfo.email, name: userInfo.name })
            );
        } catch (error) {
            console.error('GitHub callback failed:', error);
            throw error;
        }
    },

    verifyMfa: (userId: string, code: string): Promise<AuthenticatedSession> =>
        withAuthFallback<AuthenticatedSession>(
            '/auth/mfa/verify',
            { method: 'POST', body: JSON.stringify({ userId, code }) },
            () => authApi.verifyMfa(userId, code)
        ),

    refreshToken: (refreshToken: string): Promise<{ token: string }> =>
        withAuthFallback<{ token: string }>(
            '/auth/token/refresh',
            { method: 'POST', body: JSON.stringify({ refreshToken }) },
            () => authApi.refreshToken(refreshToken)
        ),

    me: (token: string): Promise<{ user: User; company: Company }> =>
        withAuthFallback<{ user: User; company: Company }>(
            '/auth/me',
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
            () => authApi.me(token)
        ),

    checkEmailAvailability: (email: string): Promise<EmailAvailability> =>
        withAuthFallback<EmailAvailability>(
            `/auth/email-availability?email=${encodeURIComponent(email)}`,
            { method: 'GET' },
            () => authApi.checkEmailAvailability(email)
        ),

    lookupInviteToken: (token: string): Promise<InvitePreview> =>
        withAuthFallback<InvitePreview>(
            `/auth/invites/${encodeURIComponent(token)}`,
            { method: 'GET' },
            () => authApi.lookupInviteToken(token)
        ),

    requestPasswordReset: (email: string): Promise<{ success: boolean }> =>
        withAuthFallback<{ success: boolean }>(
            '/auth/password/request-reset',
            { method: 'POST', body: JSON.stringify({ email }) },
            () => authApi.requestPasswordReset(email)
        ),

    resetPassword: (token: string, newPassword: string): Promise<{ success: boolean }> =>
        withAuthFallback<{ success: boolean }>(
            '/auth/password/reset',
            { method: 'POST', body: JSON.stringify({ token, newPassword }) },
            () => authApi.resetPassword(token, newPassword)
        ),
};

