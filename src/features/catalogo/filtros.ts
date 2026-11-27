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

/** Zonas de muestra del diálogo «¿En qué zona buscas?» (fixture de la app, no un catálogo real). */
export const ZONAS_DE_MUESTRA = ["Orizaba, Veracruz", "Córdoba, Veracruz", "Fortín, Veracruz", "Xalapa, Veracruz", "Veracruz, Veracruz"] as const;

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

/** Texto sin acentos, en minúsculas y con separadores unificados, para comparar ciudades. */
export function normalizarCiudad(texto: string | null | undefined): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Una ciudad del evento coincide con la zona si una contiene a la otra
 * («Cordoba-Orizaba» y «Orizaba» coinciden). La API compara el texto exacto,
 * así que la zona se aplica aquí y no en la consulta.
 */
export function coincideCiudad(ciudadEvento: string | null | undefined, zona: string): boolean {
  const a = normalizarCiudad(ciudadEvento);
  // De «Córdoba, Veracruz» solo cuenta la ciudad: el estado lo comparten todas las zonas
  const b = normalizarCiudad(zona.split(",")[0]);
  if (!a || !b) return true;
  return a.includes(b) || b.includes(a);
}

/**
 * Traduce los parámetros de la URL a la consulta de la API. La ciudad no se
 * envía: la API exige coincidencia exacta y ocultaría eventos escritos como
 * «Cordoba-Orizaba»; se filtra en el cliente con `coincideCiudad`.
 */
export function aFiltrosApi(parametros: ParametrosInicio, ahora: Date = new Date()): FiltrosCatalogo {
  const rango = parametros.fecha ? rangoDeFiltro(parametros.fecha, ahora) : null;
  const categoriaId = parametros.tipo ? Number.parseInt(parametros.tipo, 10) : null;
  return {
    ciudad: null,
    lat: numeroValido(parametros.lat),
    lng: numeroValido(parametros.lng),
    q: parametros.q?.trim() || null,
    categoriaId: Number.isInteger(categoriaId) && categoriaId! > 0 ? categoriaId : null,
    esDePago: parametros.pago === "gratis" ? false : parametros.pago === "de-pago" ? true : null,
    desde: rango ? rango.desde.toISOString() : null,
    hasta: rango ? rango.hasta.toISOString() : null,
  };
}

/**
 * Filtros que la API no aplica (zona tolerante) o que conviene reafirmar en el
 * cliente (fecha). Con ubicación activa la zona no se aplica: la API ya ordenó
 * por cercanía dentro del radio.
 */
export function filtrarEnCliente(eventos: EventoDto[], parametros: ParametrosInicio, ahora: Date = new Date()): EventoDto[] {
  const rango = parametros.fecha ? rangoDeFiltro(parametros.fecha, ahora) : null;
  const zona = tieneUbicacion(parametros) ? null : ciudadDe(parametros);
  return eventos.filter((evento) => {
    if (zona && !coincideCiudad(evento.ciudad, zona)) return false;
    if (rango && !enRango(evento.fechaHoraInicio, rango)) return false;
    return true;
  });
}

export function contarFiltrosActivos(parametros: ParametrosInicio): number {
  let total = 0;
  if (parametros.pago) total += 1;
  if (parametros.fecha) total += 1;
  if (parametros.tipo) total += 1;
  if (tieneUbicacion(parametros)) total += 1;
  return total;
}
