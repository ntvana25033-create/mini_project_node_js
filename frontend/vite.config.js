import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const appConfig = require('../app.config.cjs');
const apiProxyTarget = process.env.VITE_PROXY_TARGET || `http://${appConfig.backend.host}:${appConfig.backend.port}`;

export default defineConfig({
  plugins: [react()],
  server: {
    host: appConfig.frontend.host,
    port: appConfig.frontend.port,
    strictPort: true,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true
      }
    }
  }
});
