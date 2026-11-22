import "server-only";

import { apiServidor } from "@/lib/api/servidor";
import type { ManifiestoDto } from "@/lib/api/tipos";

/** Manifiesto del evento (boletos VALIDO y USADO): lo usa el panel del organizador para listar los boletos emitidos. */
export function manifiestoDe(eventoId: number | string): Promise<ManifiestoDto> {
  return apiServidor<ManifiestoDto>(`/api/eventos/${eventoId}/manifiesto`);
}
