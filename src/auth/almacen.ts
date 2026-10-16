import type { UsuarioResumen } from '@/api/tipos';

/**
 * Sesión guardada en sessionStorage (recomendación de la API para la web: memoria o almacenamiento de sesión).
 * Se borra al cerrar la pestaña y nunca se escribe en registros. El token no se usa para decisiones de
 * seguridad en el cliente: los permisos reales los comprueba la API en cada petición.
 */
export interface SesionGuardada {
  token: string;
  /** Instante de vencimiento (ISO-8601). */
  expiraEn: string;
  usuario: UsuarioResumen;
  /** true si entró por el acceso del personal (organizadores, validadores y administración). */
  accesoPersonal: boolean;
}

const CLAVE = 'enzona.sesion';

export function leerSesion(ahora: number = Date.now()): SesionGuardada | null {
  try {
    const crudo = sessionStorage.getItem(CLAVE);
    if (!crudo) return null;
    const sesion = JSON.parse(crudo) as SesionGuardada;
    if (!sesion.token || !sesion.usuario || Number.isNaN(Date.parse(sesion.expiraEn))) return null;
    if (Date.parse(sesion.expiraEn) <= ahora) {
      borrarSesion();
      return null;
    }
    return sesion;
  } catch {
    return null;
  }
}

export function guardarSesion(sesion: SesionGuardada): void {
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(sesion));
  } catch {
    // Sin almacenamiento: la sesión vive solo en memoria mientras la página esté abierta.
  }
}

export function borrarSesion(): void {
  try {
    sessionStorage.removeItem(CLAVE);
  } catch {
    // Nada que borrar.
  }
}
