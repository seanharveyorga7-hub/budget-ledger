import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Firestore and Auth in separate files keeps each one under the 500 kB warning limit
        // and lets the browser cache them independently.
        manualChunks: {
          'firebase-firestore': ['firebase/firestore'],
          'firebase-auth': ['firebase/auth'],
          'firebase-app': ['firebase/app'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
