import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/literati-circle-graph/',
  plugins: [react()],
  server: {
    host: true,
    port: 8080,
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        starMap: 'index.html',
        applications: 'applications.html',
      },
      output: {
        manualChunks: {
          three: ['three', 'three-stdlib'],
          r3f: ['@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'],
          motion: ['framer-motion'],
        },
      },
    },
  },
});
