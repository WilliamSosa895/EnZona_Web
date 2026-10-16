import { setupWorker } from 'msw/browser';
import { manejadores } from './manejadores';

/** Arranca la API simulada en el navegador (modo demostración, solo en desarrollo). */
export async function iniciarApiSimulada(): Promise<void> {
  const trabajador = setupWorker(...manejadores);
  await trabajador.start({ onUnhandledRequest: 'bypass', quiet: true });
  console.info(
    '[EnZona] API simulada activa. Cuentas: asistente@uv.mx, organizador@uv.mx, validador@uv.mx, admin@uv.mx · contraseña enzona123',
  );
}
