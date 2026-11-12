import { apiNavegador } from "@/lib/api/navegador";
import type { AsientoDto, CrearOrdenDto, OrdenDto } from "@/lib/api/tipos";

/*
 * Compra desde el navegador (pasa por el intermediario con la cookie). El
 * servidor calcula precios y total, reserva y emite todo o nada; con
 * `Idempotency-Key` un doble clic devuelve la misma orden sin cobrar dos veces.
 */

export function crearOrden(solicitud: CrearOrdenDto, claveIdempotencia: string): Promise<OrdenDto> {
  return apiNavegador<OrdenDto>("/api/ordenes", {
    metodo: "POST",
    cuerpo: solicitud,
    claveIdempotencia,
  });
}

/** Plano actualizado antes de pagar: detecta asientos que alguien tomó mientras tanto. */
export function asientosActuales(eventoId: number): Promise<AsientoDto[]> {
  return apiNavegador<AsientoDto[]>(`/api/eventos/${eventoId}/asientos`);
}

/** Un pago rechazado llega como 201 con la orden CANCELADA y el pago RECHAZADO. */
export function pagoRechazado(orden: OrdenDto): boolean {
  return orden.estadoOrden === "CANCELADA" || orden.estadoPago === "RECHAZADO";
}

/** La pasarela no respondió todavía (OXXO/SPEI o `tok_pendiente`). */
export function pagoPendiente(orden: OrdenDto): boolean {
  return orden.estadoOrden === "PENDIENTE";
}
