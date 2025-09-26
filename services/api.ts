/**
 * Conditional API service that switches between Mock API and Supabase API
 * based on environment configuration
 */
import { api as mockApi } from './mockApi';
// import { supabaseApi } from './supabaseApi';
import type { ApiInterface } from './apiInterface';

// Check if we should use Supabase API
const useSupabaseApi = false; // import.meta.env.VITE_USE_SUPABASE_AUTH === 'true';

console.log('API Configuration:', {
  useSupabaseApi,
  environment: import.meta.env.MODE,
  // supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? 'configured' : 'missing'
});

// Export the appropriate API with proper typing  
export const api: ApiInterface = mockApi; // useSupabaseApi ? supabaseApi : mockApi;

// For debugging
(window as any).__API_MODE__ = useSupabaseApi ? 'supabase' : 'mock';
(window as any).__API_INSTANCE__ = api;

export default api;