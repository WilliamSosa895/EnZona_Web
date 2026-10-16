/**
 * Preferencias del visitante en este navegador (zona elegida y uso de ubicación).
 * Solo son comodidades: si el almacenamiento no está disponible, la app funciona con los valores por defecto.
 */
export interface Preferencias {
  /** Ciudad del área de búsqueda (RNF-11: alternativa sin ubicación). */
  ciudad: string;
  /** El usuario aceptó usar su ubicación para ordenar por cercanía (RF-19). */
  usarUbicacion: boolean;
}

const CLAVE = 'enzona.preferencias';
export const CIUDAD_POR_DEFECTO = 'Orizaba';
export const ZONAS_DE_MUESTRA = ['Orizaba', 'Córdoba', 'Fortín', 'Xalapa', 'Veracruz'] as const;

export function leerPreferencias(): Preferencias {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo) {
      const datos = JSON.parse(crudo) as Partial<Preferencias>;
      return {
        ciudad: typeof datos.ciudad === 'string' && datos.ciudad.trim() ? datos.ciudad.trim() : CIUDAD_POR_DEFECTO,
        usarUbicacion: datos.usarUbicacion === true,
      };
    }
  } catch {
    // Almacenamiento bloqueado o dato corrupto: se usan los valores por defecto.
  }
  return { ciudad: CIUDAD_POR_DEFECTO, usarUbicacion: false };
}

export function guardarPreferencias(p: Preferencias): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(p));
  } catch {
    // Sin almacenamiento: la preferencia dura mientras la página esté abierta.
  }
}
