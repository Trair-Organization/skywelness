import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Shared paketini direkt source'tan oku — dist build gerektirmez
      '@rezidans-fitness/shared': resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  server: {
    proxy: {
      // Lokal dev'de uploads (banner, logo, vb.) production sunucusundan gelsin
      '/uploads': {
        target: 'https://www.wellnessclub.tech',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
