import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development, /api calls are proxied to the Express server,
    // so the browser sees one origin and no CORS setup is needed locally.
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split heavy vendor libraries into their own cached chunks
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          map: ['leaflet', 'react-leaflet'],
          datepicker: ['react-datepicker'],
        },
      },
    },
  },
});
