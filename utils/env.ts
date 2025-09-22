const sanitize = (value?: string | null): string | null => {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

export const getGoogleClientId = (): string | null => {
    if (typeof window !== 'undefined' && typeof (window as any).__ASAGENTS_GOOGLE_CLIENT_ID__ === 'string') {
        const fromWindow = sanitize((window as any).__ASAGENTS_GOOGLE_CLIENT_ID__);
        if (fromWindow) {
            return fromWindow;
        }
    }

    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID) {
        const fromVite = sanitize((import.meta as any).env.VITE_GOOGLE_CLIENT_ID as string);
        if (fromVite) {
            return fromVite;
        }
    }

    if (typeof process !== 'undefined' && typeof process.env?.VITE_GOOGLE_CLIENT_ID === 'string') {
        const fromProcess = sanitize(process.env.VITE_GOOGLE_CLIENT_ID);
        if (fromProcess) {
            return fromProcess;
        }
    }

    return null;
};

export const isGoogleAuthEnabled = (): boolean => getGoogleClientId() !== null;
