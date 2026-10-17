/// <reference types="vitest/config" />
import { readFileSync, rmSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/** La API simulada (Mock Service Worker) nunca se publica: se borra de la compilación de producción. */
function sinApiSimulada(): Plugin {
  return {
    name: 'enzona-sin-api-simulada',
    apply: 'build',
    closeBundle() {
      rmSync(fileURLToPath(new URL('./dist/mockServiceWorker.js', import.meta.url)), { force: true });
    },
  };
}

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// Configuración de Vite (compilación) y de Vitest (pruebas).
export default defineConfig({
  plugins: [react(), sinApiSimulada()],
  // La versión que muestra «Mi cuenta» sale de package.json: una sola fuente al publicar.
  define: { __VERSION_APP__: JSON.stringify(version) },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Se preparan desde el arranque: si Vite las descubre a mitad de la sesión recarga la página.
  optimizeDeps: {
    include: ['qrcode', 'leaflet', 'react-leaflet', '@zxing/browser'],
  },
  server: {
    // El puerto 5173 es el origen que la API permite por defecto (CORS_ORIGINS).
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Separa las bibliotecas grandes para aprovechar la caché del navegador.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          mapa: ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/mocks/**', 'src/main.tsx', 'src/**/*.d.ts'],
      // Umbral mínimo: la CI falla si la cobertura baja de aquí.
      thresholds: { lines: 80, statements: 80, branches: 70, functions: 65 },
    },
  },
});
