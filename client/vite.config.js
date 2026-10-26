import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy all /api calls to Express backend during development
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        // Rewrite cookie domain so session cookies are accepted by the browser
        // when the Vite dev server is on :5173 and Express is on :5000
        cookieDomainRewrite: '',
      },
    },
  },
});
