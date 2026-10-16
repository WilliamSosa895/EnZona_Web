import type { FiltroEventos } from '@/api/tipos';
import { ZONA, desdeEntradaLocal, fechaLocal } from './fechas';

/** Filtro por fecha (RF-07), con las mismas opciones que la app Android. */
export type FiltroFecha = 'CUALQUIERA' | 'HOY' | 'ESTA_SEMANA' | 'ESTE_MES' | 'PROXIMO_MES';
export type FiltroPrecio = 'TODOS' | 'GRATIS' | 'DE_PAGO';

export const ETIQUETAS_FECHA: Record<FiltroFecha, string> = {
  CUALQUIERA: 'Cualquier fecha',
  HOY: 'Hoy',
  ESTA_SEMANA: 'Esta semana',
  ESTE_MES: 'Este mes',
  PROXIMO_MES: 'Próximo mes',
};

/** Estado de búsqueda y filtros de Inicio (RF-06, RF-07). */
export interface FiltrosInicio {
  busqueda: string;
  categoriaId: number | null;
  lugar: string | null;
  precio: FiltroPrecio;
  fecha: FiltroFecha;
}

export const FILTROS_VACIOS: FiltrosInicio = {
  busqueda: '',
  categoriaId: null,
  lugar: null,
  precio: 'TODOS',
  fecha: 'CUALQUIERA',
};

/** Número de filtros activos, sin contar el texto de búsqueda. */
export function filtrosActivos(f: FiltrosInicio): number {
  return [f.categoriaId !== null, f.lugar !== null, f.precio !== 'TODOS', f.fecha !== 'CUALQUIERA'].filter(Boolean)
    .length;
}

export const hayFiltros = (f: FiltrosInicio) => filtrosActivos(f) > 0 || f.busqueda.trim() !== '';

const dos = (n: number) => String(n).padStart(2, '0');

function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split('-').map(Number);
  const r = new Date(Date.UTC(a, m - 1, d + dias));
  return `${r.getUTCFullYear()}-${dos(r.getUTCMonth() + 1)}-${dos(r.getUTCDate())}`;
}

/** Rango [desde, hasta] de la fecha de inicio para el filtro elegido, en la zona del evento. */
export function rangoDeFecha(filtro: FiltroFecha, ahora: Date = new Date()): { desde?: string; hasta?: string } {
  if (filtro === 'CUALQUIERA') return {};
  const hoy = fechaLocal(ahora);
  const [a, m] = hoy.split('-').map(Number);
  let inicio: string;
  let fin: string;
  switch (filtro) {
    case 'HOY':
      inicio = hoy;
      fin = hoy;
      break;
    case 'ESTA_SEMANA': {
      // Semana de lunes a domingo, como en la app Android.
      const diaSemana = new Date(`${hoy}T12:00:00Z`).getUTCDay(); // 0 = domingo
      inicio = sumarDias(hoy, -((diaSemana + 6) % 7));
      fin = sumarDias(inicio, 6);
      break;
    }
    case 'ESTE_MES':
      inicio = `${a}-${dos(m)}-01`;
      fin = sumarDias(m === 12 ? `${a + 1}-01-01` : `${a}-${dos(m + 1)}-01`, -1);
      break;
    case 'PROXIMO_MES': {
      const [a2, m2] = m === 12 ? [a + 1, 1] : [a, m + 1];
      inicio = `${a2}-${dos(m2)}-01`;
      fin = sumarDias(m2 === 12 ? `${a2 + 1}-01-01` : `${a2}-${dos(m2 + 1)}-01`, -1);
      break;
    }
  }
  return {
    desde: desdeEntradaLocal(`${inicio}T00:00`) ?? undefined,
    hasta: desdeEntradaLocal(`${fin}T23:59`) ?? undefined,
  };
}

/** Convierte los filtros de la pantalla en los parámetros de GET /api/eventos. */
export function aConsulta(
  f: FiltrosInicio,
  ubicacion: { ciudad: string; lat?: number; lng?: number },
  ahora: Date = new Date(),
): FiltroEventos {
  const consulta: FiltroEventos = {
    q: f.busqueda.trim() || undefined,
    categoriaId: f.categoriaId ?? undefined,
    esDePago: f.precio === 'TODOS' ? undefined : f.precio === 'DE_PAGO',
    ...rangoDeFecha(f.fecha, ahora),
  };
  if (ubicacion.lat !== undefined && ubicacion.lng !== undefined) {
    consulta.lat = ubicacion.lat;
    consulta.lng = ubicacion.lng;
  } else {
    consulta.ciudad = ubicacion.ciudad;
  }
  return consulta;
}

export { ZONA };
