import type { Evento } from '@/api/tipos';

/** Lugares comprometidos de un evento: aforo menos lo que sigue disponible. */
export const vendidosDe = (e: Pick<Evento, 'aforo' | 'disponibles'>) => Math.max(0, e.aforo - e.disponibles);

/**
 * Dirección que queda en el campo al llegar la del punto del mapa (EventFormScreen en Android): si la persona
 * acaba de elegir el punto, la del mapa sustituye lo escrito; si no (al abrir un evento existente), solo se
 * propone cuando el campo está vacío o aún tiene la sugerencia anterior.
 */
export function direccionTrasSugerencia(
  actual: string,
  propuesta: string,
  sugerenciaAnterior: string | null,
  eligioEnMapa: boolean,
): string {
  return eligioEnMapa || !actual.trim() || actual === sugerenciaAnterior ? propuesta : actual;
}
