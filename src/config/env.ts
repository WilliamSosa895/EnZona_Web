/**
 * Configuración leída de las variables de entorno de Vite (`VITE_*`).
 * Solo se exponen al navegador las variables con prefijo VITE_: nunca pongas secretos aquí.
 */
function urlApi(): string {
  const valor = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (!valor) return 'http://localhost:8080';
  return valor.replace(/\/+$/, '');
}

export const env = {
  /** URL base de la API (sin barra final). */
  apiUrl: urlApi(),
  /** API simulada en el navegador; solo en desarrollo, nunca en la compilación de producción. */
  apiSimulada: import.meta.env.DEV && import.meta.env.VITE_API_MOCK === 'true',
  /** Versión de la aplicación, tomada de package.json al compilar. */
  version: '0.1.0',
} as const;
