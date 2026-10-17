import type { Evento } from '@/api/tipos';

/** Lugares comprometidos de un evento: aforo menos lo que sigue disponible. */
export const vendidosDe = (e: Pick<Evento, 'aforo' | 'disponibles'>) => Math.max(0, e.aforo - e.disponibles);
