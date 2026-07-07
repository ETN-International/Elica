import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Mol* è una libreria molto grande: alziamo la soglia dell'avviso.
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        // Teniamo TUTTO Mol* in un unico chunk: la libreria ha dipendenze
        // circolari interne che, sparse su chunk diversi, romperebbero
        // l'ordine di esecuzione a runtime.
        manualChunks(id) {
          if (id.includes('node_modules/molstar')) return 'molstar';
        },
      },
    },
  },
});
