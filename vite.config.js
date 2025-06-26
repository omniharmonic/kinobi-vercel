import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: resolve(__dirname, 'src/main.tsx'),
      output: {
        entryFileNames: 'app.js',
        assetFileNames: '[name][extname]',
        chunkFileNames: '[name].js',
      },
    },
    manifest: false,
    sourcemap: false,
  },
  plugins: [react()],
}); 