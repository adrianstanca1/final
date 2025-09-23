import { authClient } from './authClient';
import { getSupabase } from './supabaseClient';
import type { LoginCredentials, RegistrationPayload } from '../types';

export type IdentityProvider = 'supabase' | 'local';

const getProvider = (): IdentityProvider => (getSupabase() ? 'supabase' : 'local');

export const identity = {
  provider: getProvider,

  loginWithGoogle: async (redirectTo?: string): Promise<void> => {
    const sb = getSupabase();
    if (!sb) throw new Error('Google login not configured');
    const target = redirectTo || (typeof window !== 'undefined' ? window.location.origin : undefined);
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: target ? { redirectTo: target } : undefined });
    if (error) throw error;
  },

  logout: async (): Promise<void> => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
  },

  loginWithPassword: async (credentials: LoginCredentials) => {
    const sb = getSupabase();
    if (!sb) return authClient.login(credentials);
    const { data, error } = await sb.auth.signInWithPassword({ email: credentials.email, password: credentials.password });
    if (error) throw error;
    return data;
  },

  registerWithPassword: async (payload: RegistrationPayload) => {
    const sb = getSupabase();
    if (!sb) return authClient.register(payload);
    const { data, error } = await sb.auth.signUp({ email: payload.email, password: payload.password });
    if (error) throw error;
    return data;
  },

  loginWithMagicLink: async (email: string, redirectTo?: string): Promise<void> => {
    const sb = getSupabase();
    if (!sb) throw new Error('Magic link not configured');
    const target = redirectTo || (typeof window !== 'undefined' ? window.location.origin : undefined);
    const { error } = await sb.auth.signInWithOtp({ email, options: target ? { emailRedirectTo: target } : undefined });
    if (error) throw error;
  },
};
