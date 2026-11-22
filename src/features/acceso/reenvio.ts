/*
 * Reglas del botón «Reenviar código» (ReenvioCodigo.kt en Android). La API cuenta 60 s desde la última emisión
 * del código, el registro incluido, y descarta en silencio (202) los reenvíos más seguidos; por eso la web lleva
 * su propia cuenta regresiva. La hora del último envío se guarda por correo en sessionStorage para que la espera
 * sobreviva a recargar la página (en Android sobrevive al giro de pantalla).
 */

/** Segundos que se esperan tras una emisión (registro o reenvío) antes de permitir otro envío. */
export const ESPERA_REENVIO_S = 60;

const PREFIJO = 'enzona.verificacion.envio.';

/** Texto del botón: con cuenta regresiva mientras la API aún no acepta otro envío. */
export function textoReenvio(segundosRestantes: number): string {
  return segundosRestantes > 0 ? `Reenviar código (${segundosRestantes} s)` : 'Reenviar código';
}

/** Segundos que faltan para poder reenviar, a partir de la hora del último envío (milisegundos). */
export function segundosRestantes(ultimoEnvio: number | null, ahora = Date.now()): number {
  if (ultimoEnvio === null) return 0;
  const transcurridos = Math.floor((ahora - ultimoEnvio) / 1000);
  return Math.min(ESPERA_REENVIO_S, Math.max(0, ESPERA_REENVIO_S - transcurridos));
}

const clave = (correo: string) => PREFIJO + correo.trim().toLowerCase();

/** Anota que la API acaba de emitir un código para este correo. */
export function registrarEnvio(correo: string, ahora = Date.now()): void {
  try {
    sessionStorage.setItem(clave(correo), String(ahora));
  } catch {
    // Sin almacenamiento (modo privado estricto): la espera dura lo que dure la página.
  }
}

/** Hora del último envío para este correo, si se registró en esta pestaña. */
export function leerUltimoEnvio(correo: string): number | null {
  try {
    const valor = Number(sessionStorage.getItem(clave(correo)));
    return Number.isFinite(valor) && valor > 0 ? valor : null;
  } catch {
    return null;
  }
}
