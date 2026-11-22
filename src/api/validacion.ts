import { peticion } from './http';
import type { Manifiesto, RegistroSinConexion, SincronizacionRespuesta, ValidacionRespuesta } from './tipos';

/** Validación de acceso (RF-15) y modo sin conexión (RNF-08). Un rechazo en la puerta responde 200: es un resultado. */
export const validacionApi = {
  validar: (eventoId: number, qr: string) =>
    peticion<ValidacionRespuesta>('POST', '/api/validaciones', { cuerpo: { eventoId, qr } }),

  /** Lista de boletos del evento para validar sin conexión (validador designado, organizador dueño o administración). */
  manifiesto: (eventoId: number, senal?: AbortSignal) =>
    peticion<Manifiesto>('GET', `/api/eventos/${eventoId}/manifiesto`, { senal }),

  /** Envía los escaneos hechos sin conexión; el servidor aplica la regla definitiva (el primero gana). */
  sincronizar: (eventoId: number, registros: RegistroSinConexion[]) =>
    peticion<SincronizacionRespuesta>('POST', '/api/validaciones/sincronizar', {
      cuerpo: { eventoId, registros },
      tiempoLimiteMs: 60_000,
    }),
};
