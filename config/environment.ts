export interface Environment {
  name: string;
  isDevelopment: boolean;
  isProduction: boolean;
  apiUrl: string;
  version: string;
}

export function getEnvironment(): Environment {
  const isDevelopment = import.meta.env.DEV || process.env.NODE_ENV === 'development';
  const isProduction = !isDevelopment;
  
  return {
    name: isDevelopment ? 'development' : 'production',
    isDevelopment,
    isProduction,
    apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0'
  };
}

export default getEnvironment;