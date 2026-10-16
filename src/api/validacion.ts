import { peticion } from './http';
import type { ValidacionRespuesta } from './tipos';

/** Validación de acceso en línea (RF-15). Un rechazo en la puerta responde 200: es un resultado, no un error. */
export const validacionApi = {
  validar: (eventoId: number, qr: string) =>
    peticion<ValidacionRespuesta>('POST', '/api/validaciones', { cuerpo: { eventoId, qr } }),
};
