import { peticion } from './http';
import type { Boleto, CrearOrdenSolicitud, Orden } from './tipos';

/** Módulo de boletaje: órdenes todo-o-nada con Idempotency-Key y boletos QR (RF-10 a RF-12, RF-16). */
export const boletajeApi = {
  /**
   * Compra o confirma N boletos. La misma `claveIdempotencia` devuelve la misma orden sin volver a cobrar:
   * se reutiliza al reintentar el MISMO intento y se cambia tras un resultado definitivo.
   */
  crearOrden: (datos: CrearOrdenSolicitud, claveIdempotencia: string) =>
    peticion<Orden>('POST', '/api/ordenes', { cuerpo: datos, cabeceras: { 'Idempotency-Key': claveIdempotencia } }),

  orden: (id: number, senal?: AbortSignal) => peticion<Orden>('GET', `/api/ordenes/${id}`, { senal }),

  misBoletos: (senal?: AbortSignal) => peticion<Boleto[]>('GET', '/api/boletos', { senal }),

  boleto: (id: number, senal?: AbortSignal) => peticion<Boleto>('GET', `/api/boletos/${id}`, { senal }),
};
