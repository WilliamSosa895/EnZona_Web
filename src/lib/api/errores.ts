import type { ProblemaDto } from "./tipos";

/**
 * Error de una operación contra la API. `message` es el texto que se muestra a
 * la persona (el `detail` del ProblemDetail). `estado` es el código HTTP, o 0 si
 * no hubo respuesta (sin conexión o servidor dormido).
 *
 * Equivale a `ErrorEnZona` de la app Android.
 */
export class ErrorEnZona extends Error {
  readonly estado: number;
  readonly codigo: string;
  readonly errores: { campo: string; mensaje: string }[];

  constructor(
    estado: number,
    codigo: string,
    mensaje: string,
    errores: { campo: string; mensaje: string }[] = [],
  ) {
    super(mensaje);
    this.name = "ErrorEnZona";
    this.estado = estado;
    this.codigo = codigo;
    this.errores = errores;
  }

  get sinConexion(): boolean {
    return this.estado === 0;
  }

  get sesionVencida(): boolean {
    return this.estado === 401 && this.codigo === "NO_AUTENTICADO";
  }

  /** Cuenta registrada pero sin terminar la verificación: la app lleva a la pantalla del código. */
  get cuentaPendiente(): boolean {
    return this.estado === 403 && this.codigo === "CUENTA_PENDIENTE";
  }

  /** Mensaje por campo, para pintar los errores de validación junto a cada entrada. */
  errorDe(campo: string): string | undefined {
    return this.errores.find((error) => error.campo === campo)?.mensaje;
  }

  toJSON() {
    return { estado: this.estado, codigo: this.codigo, mensaje: this.message, errores: this.errores };
  }
}

/**
 * Textos por `codigo` (docs/CODIGOS_DE_ERROR.md de la API). El cliente decide
 * por `codigo`, nunca por el texto de `detail`, que puede cambiar.
 */
const MENSAJES: Record<string, string> = {
  VALIDACION: "Revisa los datos marcados.",
  SOLICITUD_INVALIDA: "La solicitud no es válida. Intenta de nuevo.",
  CODIGO_VERIFICACION_INVALIDO: "El código no coincide. Revísalo e inténtalo otra vez.",
  CODIGO_VERIFICACION_EXPIRADO: "El código venció. Pide uno nuevo.",
  NO_AUTENTICADO: "Tu sesión terminó. Vuelve a iniciar sesión.",
  CREDENCIALES_INVALIDAS: "Correo, CURP o contraseña incorrectos.",
  ACCESO_DENEGADO: "No tienes permiso para esta acción.",
  CUENTA_PENDIENTE: "Tu cuenta todavía no está verificada. Ingresa el código que te enviamos.",
  CUENTA_BLOQUEADA: "Tu cuenta está bloqueada. Escríbenos para revisarlo.",
  NO_ENCONTRADO: "No encontramos lo que buscas.",
  CORREO_REGISTRADO: "Ese correo ya tiene una cuenta. Inicia sesión.",
  CURP_REGISTRADO: "Esa CURP ya tiene una cuenta. Inicia sesión.",
  AFORO_AGOTADO: "Ya no hay lugares suficientes para esta compra.",
  ASIENTO_NO_DISPONIBLE: "Alguien tomó uno de los asientos que elegiste. Elige otro.",
  CONFIRMACION_DUPLICADA: "Ya confirmaste tu asistencia a este evento.",
  ESTADO_INVALIDO: "El evento ya no admite esta operación.",
  POLITICA_MODIFICACION: "El cambio no cumple la política de modificación del evento.",
  EVENTO_NO_CANCELABLE: "El evento ya no se puede cancelar.",
  ROL_EN_USO: "No puedes dejar el rol de organizador mientras tengas eventos vigentes o sea tu único rol.",
  CONFLICTO_DE_DATOS: "Hubo un conflicto al guardar. Recarga e inténtalo de nuevo.",
  REGLA_NEGOCIO: "La operación no cumple una regla del evento.",
  IMAGEN_NO_PERMITIDA: "La imagen no está permitida. Elige otra.",
  MOTIVO_REQUERIDO: "Escribe el motivo de la cancelación.",
  METODO_PAGO_NO_SOPORTADO: "Ese método de pago no está disponible. Paga con tarjeta.",
  DEMASIADOS_INTENTOS: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
  ERROR_INTERNO: "Algo falló en el servidor. Inténtalo de nuevo en un momento.",
  SERVICIO_EXTERNO_NO_DISPONIBLE: "Un servicio externo no respondió. Inténtalo más tarde.",
};

export const MENSAJE_SIN_CONEXION =
  "No hay conexión con el servidor de EnZona. Revisa tu red o inténtalo en un momento.";

/** Construye el error a partir de un ProblemDetail de la API. */
export function errorDesdeProblema(estado: number, problema: ProblemaDto | null): ErrorEnZona {
  const codigo = problema?.codigo ?? (estado === 401 ? "NO_AUTENTICADO" : `HTTP_${estado}`);
  const errores = problema?.errores ?? [];
  const detalleValidacion =
    codigo === "VALIDACION" && errores.length > 0
      ? errores.map((error) => `${error.campo}: ${error.mensaje}`).join(" ")
      : undefined;
  const mensaje =
    detalleValidacion ??
    problema?.detail ??
    MENSAJES[codigo] ??
    "No se pudo completar la operación. Inténtalo de nuevo.";
  return new ErrorEnZona(estado, codigo, mensaje, errores);
}

export function errorSinConexion(): ErrorEnZona {
  return new ErrorEnZona(0, "SIN_CONEXION", MENSAJE_SIN_CONEXION);
}

/** Texto amable para cualquier error desconocido. */
export function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorEnZona) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Ocurrió un error inesperado.";
}

/** Reconstruye un `ErrorEnZona` serializado (al cruzar de una acción de servidor al cliente). */
export function esErrorSerializado(valor: unknown): valor is ReturnType<ErrorEnZona["toJSON"]> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    "codigo" in valor &&
    "estado" in valor &&
    "mensaje" in valor
  );
}
