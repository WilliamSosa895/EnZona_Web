import type { EventoDto } from "@/lib/api/tipos";
import { CIUDAD_POR_DEFECTO } from "@/lib/capacidades";
import { enRango, rangoDeFiltro, type FiltroFecha } from "@/lib/fecha";
import type { FiltrosCatalogo } from "@/features/eventos/api";

/*
 * Filtros de Inicio (RF-05, RF-06, RF-07, RF-19). Viven en la URL para que se
 * conserven al ir al detalle y volver, y para que se puedan compartir.
 * Equivale a `data/FiltrosEventos.kt`.
 */

export type ParametrosInicio = {
  q?: string;
  zona?: string;
  pago?: "gratis" | "de-pago";
  fecha?: FiltroFecha;
  lugar?: string;
  tipo?: string;
  lat?: string;
  lng?: string;
};

export const FILTROS_FECHA: { valor: FiltroFecha; texto: string }[] = [
  { valor: "hoy", texto: "Hoy" },
  { valor: "semana", texto: "Esta semana" },
  { valor: "mes", texto: "Este mes" },
  { valor: "proximo-mes", texto: "Próximo mes" },
];

export function ciudadDe(parametros: ParametrosInicio): string {
  return parametros.zona?.trim() || CIUDAD_POR_DEFECTO;
}

export function tieneUbicacion(parametros: ParametrosInicio): boolean {
  return numeroValido(parametros.lat) !== null && numeroValido(parametros.lng) !== null;
}

function numeroValido(texto: string | undefined): number | null {
  if (!texto) return null;
  const valor = Number.parseFloat(texto);
  return Number.isFinite(valor) ? valor : null;
}

/** Traduce los parámetros de la URL a la consulta de la API. */
export function aFiltrosApi(parametros: ParametrosInicio, ahora: Date = new Date()): FiltrosCatalogo {
  const rango = parametros.fecha ? rangoDeFiltro(parametros.fecha, ahora) : null;
  const categoriaId = parametros.tipo ? Number.parseInt(parametros.tipo, 10) : null;
  return {
    ciudad: ciudadDe(parametros),
    lat: numeroValido(parametros.lat),
    lng: numeroValido(parametros.lng),
    q: parametros.q?.trim() || null,
    categoriaId: Number.isInteger(categoriaId) && categoriaId! > 0 ? categoriaId : null,
    esDePago: parametros.pago === "gratis" ? false : parametros.pago === "de-pago" ? true : null,
    desde: rango ? rango.desde.toISOString() : null,
    hasta: rango ? rango.hasta.toISOString() : null,
  };
}

/** Filtros que la API no aplica (lugar) o que conviene reafirmar en el cliente (fecha). */
export function filtrarEnCliente(eventos: EventoDto[], parametros: ParametrosInicio, ahora: Date = new Date()): EventoDto[] {
  const lugar = parametros.lugar?.trim().toLowerCase();
  const rango = parametros.fecha ? rangoDeFiltro(parametros.fecha, ahora) : null;
  return eventos.filter((evento) => {
    if (lugar && evento.lugar.trim().toLowerCase() !== lugar) return false;
    if (rango && !enRango(evento.fechaHoraInicio, rango)) return false;
    return true;
  });
}

/** Sedes distintas de la lista, para el menú «Lugar». */
export function lugaresDe(eventos: EventoDto[]): string[] {
  return [...new Set(eventos.map((evento) => evento.lugar.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
}

export function contarFiltrosActivos(parametros: ParametrosInicio): number {
  let total = 0;
  if (parametros.pago) total += 1;
  if (parametros.fecha) total += 1;
  if (parametros.lugar) total += 1;
  if (parametros.tipo) total += 1;
  if (tieneUbicacion(parametros)) total += 1;
  return total;
}
