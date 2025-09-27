// Environment configuration
export interface Environment {
  name: string;
  apiUrl: string;
  authUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

export interface EnvironmentShape {
  name: string;
  apiUrl: string;
  authUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;
  [key: string]: any;
}

const environments: Record<string, Environment> = {
  development: {
    name: 'development',
    apiUrl: 'http://localhost:3000/api',
    authUrl: 'http://localhost:3000/auth',
    isDevelopment: true,
    isProduction: false,
  },
  production: {
    name: 'production',
    apiUrl: '/api',
    authUrl: '/auth',
    isDevelopment: false,
    isProduction: true,
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