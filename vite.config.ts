import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@api': path.resolve(__dirname, './api'),
        '@components': path.resolve(__dirname, './components'),
        '@contexts': path.resolve(__dirname, './contexts'),
        '@hooks': path.resolve(__dirname, './hooks'),
        '@services': path.resolve(__dirname, './services'),
        '@utils': path.resolve(__dirname, './utils'),
        '@config': path.resolve(__dirname, './config'),
        '@types': path.resolve(__dirname, './types.ts'),
      },
    },


    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./tests/setup-simple.ts'],
      css: true,
      include: ['services/**/*.test.ts', 'utils/**/*.test.ts', 'components/**/*.test.ts'],
      exclude: ['**/node_modules/**', '**/dist/**', 'dist-services/**', 'final/**', 'final-1/**', 'final-2/**'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'tests/',
          'dist/',
          'final/',
          'final-1/',
          'final-2/',
        ],
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
      // Skip type checking during build for faster deployment
      target: 'es2020',
      minify: 'terser',
    },
    esbuild: {
      // Skip type checking for components with merge conflicts
      logOverride: { 'this-is-undefined-in-esm': 'silent' },
    },
  };
});
