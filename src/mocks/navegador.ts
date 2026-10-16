import { setupWorker } from 'msw/browser';
import { exportarBase, importarBase, manejadores } from './manejadores';

const CLAVE = 'enzona.demo.base';

/** Arranca la API simulada en el navegador (modo demostración, solo en desarrollo). */
export async function iniciarApiSimulada(): Promise<void> {
  // Los datos simulados viven en la pestaña: una recarga no debe borrar compras ni sesiones.
  try {
    importarBase(sessionStorage.getItem(CLAVE));
  } catch {
    /* almacenamiento no disponible: se usa la base inicial */
  }
  const trabajador = setupWorker(...manejadores);
  trabajador.events.on('response:mocked', () => {
    try {
      sessionStorage.setItem(CLAVE, exportarBase());
    } catch {
      /* sin almacenamiento: la demo funciona igual, solo sin persistencia */
    }
  });
  await trabajador.start({ onUnhandledRequest: 'bypass', quiet: true });
  console.info(
    '[EnZona] API simulada activa. Cuentas: asistente@uv.mx, organizador@uv.mx, validador@uv.mx, admin@uv.mx · contraseña enzona123',
  );
}
