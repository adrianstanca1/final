/*
 * Centralised environment configuration helper for the BuildingManagement platform.
 *
 * The helper inspects `import.meta.env`, `process.env`, and a curated list of
 * browser globals so both the frontend bundle and Node-based tooling resolve
 * configuration consistently. Values are trimmed and normalised so downstream
 * services do not need to repeat sanitisation logic.
 */
const WINDOW_RUNTIME_KEYS = {
    VITE_API_BASE_URL: '__ASAGENTS_API_BASE_URL__',
};
const isBrowser = () => typeof window !== 'undefined';
const sanitise = (value) => {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};
const toBoolean = (value) => {
    if (value == null) {
        return null;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    const normalised = String(value).trim().toLowerCase();
    if (!normalised) {
        return null;
    }
    if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalised)) {
        return true;
    }
    if (['0', 'false', 'no', 'off', 'disabled'].includes(normalised)) {
        return false;
    }
    return null;
};
const readFromImportMeta = (key) => {
    try {
        const metaEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
        const value = metaEnv ? metaEnv[key] : undefined;
        return typeof value === 'string' ? value : undefined;
    }
    catch (error) {
        console.warn('[environment] Unable to read value from import.meta.env', key, error);
        return undefined;
    }
};
const readFromProcess = (key) => {
    try {
        const env = typeof process !== 'undefined' ? process.env : undefined;
        const value = env ? env[key] : undefined;
        return typeof value === 'string' ? value : undefined;
    }
    catch (error) {
        console.warn('[environment] Unable to read value from process.env', key, error);
        return undefined;
    }
};
const readFromWindow = (key) => {
    if (!isBrowser()) {
        return undefined;
    }
    const globalKey = WINDOW_RUNTIME_KEYS[key];
    if (!globalKey) {
        return undefined;
    }
    const value = window[globalKey];
    return typeof value === 'string' ? value : undefined;
};
const readEnv = (key, aliases = []) => {
    const keysToCheck = [key, ...aliases];
    for (const candidate of keysToCheck) {
        const value = readFromImportMeta(candidate) ?? readFromProcess(candidate) ?? readFromWindow(candidate);
        const sanitised = sanitise(value);
        if (sanitised) {
            return sanitised;
        }
    }
    return null;
};
const buildEnvironment = () => {
    const supabaseEnabled = toBoolean(readEnv('VITE_USE_SUPABASE')) ?? false;
    const allowMockFallback = toBoolean(readEnv('VITE_ALLOW_MOCK_FALLBACK'));
    const isTestRun = typeof process !== 'undefined' &&
        (Boolean(process.env?.VITEST) || Boolean(process.env?.VITEST_WORKER_ID));
    const rawApiBaseUrl = supabaseEnabled || isTestRun ? null : readEnv('VITE_API_BASE_URL', ['API_BASE_URL']);
    if (supabaseEnabled && typeof console !== 'undefined') {
        console.warn('[environment] VITE_USE_SUPABASE is enabled but Supabase client wiring is pending. Falling back to mock auth.');
    }
    return {
        apiBaseUrl: rawApiBaseUrl,
        analyticsWriteKey: readEnv('VITE_ANALYTICS_WRITE_KEY', ['ANALYTICS_WRITE_KEY']),
        geminiApiKey: readEnv('VITE_GEMINI_API_KEY', ['GEMINI_API_KEY']),
        mapboxToken: readEnv('VITE_MAPBOX_TOKEN', ['MAPBOX_TOKEN']),
        supabaseUrl: readEnv('VITE_SUPABASE_URL', ['SUPABASE_URL']),
        supabaseAnonKey: readEnv('VITE_SUPABASE_ANON_KEY', ['SUPABASE_ANON_KEY']),
        featureFlags: {
            useSupabaseAuth: supabaseEnabled,
            allowMockFallback,
        },
    };
};
let cachedEnvironment = null;
export const getEnvironment = () => {
    if (!cachedEnvironment) {
        cachedEnvironment = buildEnvironment();
    }
    return cachedEnvironment;
};
export const refreshEnvironment = () => {
    cachedEnvironment = buildEnvironment();
    return cachedEnvironment;
};
export const getEnvironmentSnapshot = () => {
    const env = getEnvironment();
    return {
        ...env,
        featureFlags: { ...env.featureFlags },
    };
};
export const getSecretCatalog = () => {
    const env = getEnvironment();
    return {
        geminiApiKey: env.geminiApiKey,
        analyticsWriteKey: env.analyticsWriteKey,
        mapboxToken: env.mapboxToken,
        supabaseUrl: env.supabaseUrl,
        supabaseAnonKey: env.supabaseAnonKey,
        apiBaseUrl: env.apiBaseUrl,
    };
};
//# sourceMappingURL=environment.js.map