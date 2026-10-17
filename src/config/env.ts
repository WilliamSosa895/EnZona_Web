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
  /**
   * Pasarela de pago. Con `sandbox` la API acepta los tokens de prueba (tok_aprobado, tok_rechazado,
   * tok_pendiente, tok_error) y la pantalla de pago muestra el selector de escenario. Es el único modo
   * disponible mientras no se integre el formulario seguro de la pasarela real (docs/COHERENCIA_APP_ANDROID.md).
   */
  pasarela: 'sandbox' as const,
  /** Versión de la aplicación, tomada de package.json al compilar. */
  version: __VERSION_APP__,
} as const;
