// Environment configuration
export interface Environment {
  name: string;
  apiUrl: string;
  authUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;
  oauth: {
    google: {
      clientId: string;
      enabled: boolean;
    };
    github: {
      clientId: string;
      enabled: boolean;
    };
    oauthIo: {
      publicKey: string;
      enabled: boolean;
    };
  };
  features: {
    allowMockFallback: boolean;
    useSupabase: boolean;
  };
  gemini: {
    apiKey: string;
    browserKey: string;
    enabled: boolean;
  };
}

export interface EnvironmentShape extends Environment {
  timestamp?: string;
  [key: string]: any;
}

const environments: Record<string, Environment> = {
  development: {
    name: 'development',
    apiUrl: 'http://localhost:4000/api',
    authUrl: 'http://localhost:4000/auth',
    isDevelopment: true,
    isProduction: false,
    oauth: {
      google: {
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        enabled: !!import.meta.env.VITE_GOOGLE_CLIENT_ID,
      },
      github: {
        clientId: import.meta.env.VITE_GITHUB_CLIENT_ID || '',
        enabled: !!import.meta.env.VITE_GITHUB_CLIENT_ID,
      },
      oauthIo: {
        publicKey: import.meta.env.VITE_OAUTH_IO_PUBLIC_KEY || '',
        enabled: !!import.meta.env.VITE_OAUTH_IO_PUBLIC_KEY,
      },
    },
    features: {
      allowMockFallback: import.meta.env.VITE_ALLOW_MOCK_FALLBACK !== 'false',
      useSupabase: import.meta.env.VITE_USE_SUPABASE === 'true',
    },
    gemini: {
      apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
      browserKey: import.meta.env.VITE_GEMINI_BROWSER_KEY || '',
      enabled: !!(import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GEMINI_BROWSER_KEY),
    },
  },
  production: {
    name: 'production',
    apiUrl: '/api',
    authUrl: '/auth',
    isDevelopment: false,
    isProduction: true,
    oauth: {
      google: {
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        enabled: !!import.meta.env.VITE_GOOGLE_CLIENT_ID,
      },
      github: {
        clientId: import.meta.env.VITE_GITHUB_CLIENT_ID || '',
        enabled: !!import.meta.env.VITE_GITHUB_CLIENT_ID,
      },
      oauthIo: {
        publicKey: import.meta.env.VITE_OAUTH_IO_PUBLIC_KEY || '',
        enabled: !!import.meta.env.VITE_OAUTH_IO_PUBLIC_KEY,
      },
    },
    features: {
      allowMockFallback: import.meta.env.VITE_ALLOW_MOCK_FALLBACK !== 'false',
      useSupabase: import.meta.env.VITE_USE_SUPABASE === 'true',
    },
    gemini: {
      apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
      browserKey: import.meta.env.VITE_GEMINI_BROWSER_KEY || '',
      enabled: !!(import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GEMINI_BROWSER_KEY),
    },
  },
};

let currentEnvironment: Environment = environments.development;

export const getEnvironment = (): Environment => {
  return currentEnvironment;
};

export const refreshEnvironment = (): void => {
  const env = import.meta.env.MODE || 'development';
  currentEnvironment = environments[env] || environments.development;
};

export const getEnvironmentSnapshot = (): EnvironmentShape => {
  return {
    ...currentEnvironment,
    timestamp: new Date().toISOString(),
  };
};

// Initialize environment
refreshEnvironment();