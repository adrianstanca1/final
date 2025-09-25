import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Split large vendor libraries into separate chunks
          manualChunks: {
            react: ['react', 'react-dom'],
            leaflet: ['leaflet', 'react-leaflet'],
            genai: ['@google/genai'],
            dateFns: ['date-fns'],
          },
        },
      },
      // Raise limit slightly to avoid noisy warnings while we improve chunking
      chunkSizeWarningLimit: 1100,
    },
  };
});
