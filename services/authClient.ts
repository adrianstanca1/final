// Stub implementation for authClient functionality
// This provides the necessary exports for AuthEnvironmentNotice component

export interface AuthConnectionInfo {
  environment?: 'development' | 'production' | 'staging';
  status?: 'connected' | 'disconnected' | 'error';
  message?: string;
  mode?: 'mock' | 'backend';
  baseUrl?: string | null;
}

// Mock implementation that returns no connection info
export const getAuthConnectionInfo = (): AuthConnectionInfo => {
  return {
    environment: 'development',
    status: 'disconnected',
    message: 'Auth service not configured',
    mode: 'mock',
    baseUrl: null
  };
};

// Mock subscription function
export const subscribeToAuthClientChanges = (callback: () => void) => {
  // Return an unsubscribe function
  return () => {};
};