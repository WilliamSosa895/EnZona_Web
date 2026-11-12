import "server-only";

import { apiServidor } from "@/lib/api/servidor";
import type { BoletoDto, EventoDto, OrdenDto } from "@/lib/api/tipos";
import { ErrorEnZona } from "@/lib/api/errores";

/*
 * Boletos y órdenes de la cuenta con sesión. `GET /api/boletos` no anida la
 * orden ni el evento completo: igual que la app Android, el detalle de cada
 * evento se pide en paralelo y el total de la orden se reconstruye con los
 * boletos hermanos.
 */

export function misBoletos(): Promise<BoletoDto[]> {
  return apiServidor<BoletoDto[]>("/api/boletos");
}

export function boleto(id: number | string): Promise<BoletoDto> {
  return apiServidor<BoletoDto>(`/api/boletos/${id}`);
}

export function orden(id: number | string): Promise<OrdenDto> {
  return apiServidor<OrdenDto>(`/api/ordenes/${id}`);
}

/** Detalle de un evento tolerante: null si ya no es visible (un borrador ajeno, por ejemplo). */
export async function eventoDeBoleto(eventoId: number): Promise<EventoDto | null> {
  try {
    return await apiServidor<EventoDto>(`/api/eventos/${eventoId}`);
  } catch (error) {
    if (error instanceof ErrorEnZona && (error.estado === 404 || error.estado === 403)) return null;
    throw error;
  }
}

/** Eventos de una lista de boletos, en paralelo y sin repetir peticiones. */
export async function eventosDeBoletos(boletos: BoletoDto[]): Promise<Map<number, EventoDto | null>> {
  const ids = [...new Set(boletos.map((item) => item.eventoId))];
  const eventos = await Promise.all(ids.map((id) => eventoDeBoleto(id)));
  return new Map(ids.map((id, indice) => [id, eventos[indice]]));
}

/** Agrupa los boletos por orden conservando el orden de emisión, para «Boleto k de N». */
export function agruparPorOrden(boletos: BoletoDto[]): Map<number, BoletoDto[]> {
  const grupos = new Map<number, BoletoDto[]>();
  for (const item of boletos) {
    const grupo = grupos.get(item.ordenId);
    if (grupo) grupo.push(item);
    else grupos.set(item.ordenId, [item]);
  }
  for (const grupo of grupos.values()) grupo.sort((a, b) => a.id - b.id);
  return grupos;
}

export function posicionEnOrden(boleto: BoletoDto, grupos: Map<number, BoletoDto[]>): { k: number; n: number } {
  const hermanos = grupos.get(boleto.ordenId) ?? [boleto];
  return { k: hermanos.findIndex((item) => item.id === boleto.id) + 1, n: hermanos.length };
}
