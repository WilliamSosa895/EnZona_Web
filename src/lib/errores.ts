import { ApiError } from '@/api/http';

/**
 * Mensajes en español por `codigo` de la API (docs/CODIGOS_DE_ERROR.md). El texto se elige aquí, en el
 * cliente, para no depender del `detail` del servidor; para REGLA_NEGOCIO y POLITICA_MODIFICACION se muestra
 * el `detail`, porque explica qué regla se incumplió.
 */
const MENSAJES: Record<string, string> = {
  SIN_CONEXION: 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.',
  VALIDACION: 'Revisa los campos marcados.',
  SOLICITUD_INVALIDA: 'La solicitud no es válida. Recarga la página e intenta de nuevo.',
  CODIGO_VERIFICACION_INVALIDO: 'El código es incorrecto. Intenta de nuevo o solicita otro.',
  CODIGO_VERIFICACION_EXPIRADO: 'El código expiró. Solicita uno nuevo.',
  NO_AUTENTICADO: 'Tu sesión terminó. Vuelve a iniciar sesión.',
  CREDENCIALES_INVALIDAS: 'Credenciales inválidas. Revisa tu correo o CURP y tu contraseña.',
  ACCESO_DENEGADO: 'No tienes permiso para realizar esta acción.',
  CUENTA_PENDIENTE: 'Tu cuenta aún no está verificada. Ingresa el código que enviamos a tu correo.',
  CUENTA_BLOQUEADA: 'Tu cuenta está bloqueada. Escríbenos a soporte@enzona.mx.',
  NO_ENCONTRADO: 'No encontramos lo que buscas. Puede que ya no exista.',
  CORREO_REGISTRADO: 'Ese correo ya está registrado. Inicia sesión.',
  CURP_REGISTRADO: 'Ese CURP ya está registrado en el sistema.',
  AFORO_AGOTADO: 'Ya no quedan lugares suficientes para esta compra.',
  ASIENTO_NO_DISPONIBLE: 'Otra persona tomó uno de tus asientos. Elige otro.',
  CONFIRMACION_DUPLICADA: 'Ya confirmaste tu asistencia a este evento. Tu boleto está en Mis boletos.',
  ESTADO_INVALIDO: 'El evento ya no admite esta operación. Recarga para ver su estado actual.',
  EVENTO_NO_CANCELABLE: 'El evento ya no puede cancelarse.',
  ROL_EN_USO: 'No puedes dejar de ser organizador mientras tengas eventos vigentes.',
  CONFLICTO_DE_DATOS: 'Los datos cambiaron mientras trabajabas. Recarga e intenta de nuevo.',
  MOTIVO_REQUERIDO: 'Escribe el motivo de la cancelación.',
  METODO_PAGO_NO_SOPORTADO: 'Ese método de pago aún no está disponible. Paga con tarjeta.',
  DEMASIADOS_INTENTOS: 'Demasiados intentos. Espera unos minutos e intenta de nuevo.',
  ERROR_INTERNO: 'Ocurrió un error inesperado. Intenta de nuevo en unos momentos.',
  SERVICIO_EXTERNO_NO_DISPONIBLE: 'Un servicio externo no respondió. Intenta más tarde.',
};

const CON_DETALLE = new Set(['REGLA_NEGOCIO', 'POLITICA_MODIFICACION']);

/** Mensaje legible para cualquier error (de la API o inesperado). */
export function mensajeDeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (CON_DETALLE.has(error.codigo) && error.message) return error.message;
    if (error.codigo === 'VALIDACION' && error.errores.length === 1) return error.errores[0].mensaje;
    return MENSAJES[error.codigo] ?? error.message ?? MENSAJES.ERROR_INTERNO;
  }
  return MENSAJES.ERROR_INTERNO;
}

/** ¿El error tiene alguno de estos códigos? */
export function esCodigo(error: unknown, ...codigos: string[]): boolean {
  return error instanceof ApiError && codigos.includes(error.codigo);
}
