import { apiNavegador } from "@/lib/api/navegador";
import type { ManifiestoDto, ResultadoValidacionDto, SincronizacionDto, SincronizacionResultadoDto } from "@/lib/api/tipos";

/*
 * Validación de acceso desde el navegador del validador (RF-15, RNF-08). La
 * API verifica la firma antes de consultar la base y marca el boleto como
 * usado de forma atómica: un rechazo llega como 200, no como error.
 */

export function validarQr(eventoId: number, qr: string): Promise<ResultadoValidacionDto> {
  return apiNavegador<ResultadoValidacionDto>("/api/validaciones", { metodo: "POST", cuerpo: { eventoId, qr: qr.trim() } });
}

export function descargarManifiesto(eventoId: number): Promise<ManifiestoDto> {
  return apiNavegador<ManifiestoDto>(`/api/eventos/${eventoId}/manifiesto`);
}

export function sincronizar(lote: SincronizacionDto): Promise<SincronizacionResultadoDto> {
  return apiNavegador<SincronizacionResultadoDto>("/api/validaciones/sincronizar", { metodo: "POST", cuerpo: lote });
}
