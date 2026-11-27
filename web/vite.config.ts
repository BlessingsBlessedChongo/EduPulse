import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The built app is served by the C# service itself, from its wwwroot folder.
// While developing, the dev server passes /api calls on to the service.
export default defineConfig({
  plugins: [react()],
  // Fonts stay as files, never packed into the stylesheet: the security rules only allow fonts from this site.
  build: { outDir: '../server/EduPulse.Api/wwwroot', emptyOutDir: true, assetsInlineLimit: 0 },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:5199', '/health': 'http://localhost:5199' },
  },
});
