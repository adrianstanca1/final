// Stub implementation for authClient functionality
// This provides the necessary exports for AuthEnvironmentNotice component
// Mock implementation that returns no connection info
export const getAuthConnectionInfo = () => {
    return {
        environment: 'development',
        status: 'disconnected',
        message: 'Auth service not configured',
        mode: 'mock',
        baseUrl: null
    };
};
// Mock subscription function
export const subscribeToAuthClientChanges = (callback) => {
    // Return an unsubscribe function
    return () => { };
};
//# sourceMappingURL=authClient.js.map