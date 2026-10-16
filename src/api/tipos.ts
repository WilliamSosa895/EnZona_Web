/*
 * Tipos de la API de EnZona v0.1.0 (contrato REST del Anexo E y docs/ENDPOINTS.md del repositorio de la API).
 * Fechas: ISO-8601 con desfase (hora del centro de México). Importes: texto con dos decimales ("360.00").
 */

export type Rol = 'ASISTENTE' | 'ORGANIZADOR' | 'VALIDADOR' | 'ADMIN';
export type EstadoUsuario = 'PENDIENTE' | 'ACTIVO' | 'BLOQUEADO';
export type CanalVerificacion = 'CORREO' | 'TELEFONO';
export type EstadoEvento = 'BORRADOR' | 'PUBLICADO' | 'REALIZADO' | 'CANCELADO';
export type EstadoAsiento = 'DISPONIBLE' | 'RESERVADO' | 'OCUPADO';
export type EstadoOrden = 'PENDIENTE' | 'PAGADA' | 'CANCELADA' | 'REEMBOLSADA';
export type EstadoPago = 'APROBADO' | 'RECHAZADO' | 'REEMBOLSADO';
export type EstadoBoleto = 'VALIDO' | 'USADO' | 'CANCELADO' | 'EXPIRADO';
export type MetodoPago = 'GRATIS' | 'TARJETA';
export type ResultadoAcceso = 'PERMITIDO' | 'RECHAZADO';
export type MotivoRechazo =
  | 'FORMATO_INVALIDO'
  | 'BOLETO_INEXISTENTE'
  | 'FIRMA_INVALIDA'
  | 'OTRO_EVENTO'
  | 'EVENTO_CANCELADO'
  | 'YA_UTILIZADO'
  | 'CANCELADO'
  | 'EXPIRADO';
export type TipoCancelacion = 'BORRADOR' | 'GRATUITO' | 'DE_PAGO_SIN_VENTAS' | 'DE_PAGO_CON_VENTAS' | 'ADMINISTRATIVA';

// ---------------------------------------------------------------- identidad

export interface RegistroSolicitud {
  nombre: string;
  correo: string;
  telefono: string | null;
  curp: string;
  contrasena: string;
  organizador: boolean;
  aceptaAvisoPrivacidad: boolean;
}

export interface RegistroRespuesta {
  usuarioId: number;
  correo: string;
  estado: EstadoUsuario;
  verificacionesPendientes: CanalVerificacion[];
}

export interface VerificacionRespuesta {
  estado: EstadoUsuario;
  correoVerificado: boolean;
  telefonoVerificado: boolean;
  verificacionesPendientes: CanalVerificacion[];
}

export interface UsuarioResumen {
  id: number;
  nombre: string;
  correo: string;
  roles: Rol[];
}

export interface SesionRespuesta {
  token: string;
  tipo: string;
  expiraEnSegundos: number;
  expiraEn: string;
  usuario: UsuarioResumen;
}

export interface Perfil {
  id: number;
  nombre: string;
  correo: string;
  telefono: string | null;
  correoVerificado: boolean;
  telefonoVerificado: boolean;
  estado: EstadoUsuario;
  roles: Rol[];
  fechaRegistro: string;
}

// ---------------------------------------------------------------- eventos

export interface Categoria {
  id: number;
  nombre: string;
}

export interface TipoBoleto {
  id: number;
  nombre: string;
  precio: string;
  cantidadTotal: number;
  disponibles: number;
}

export interface Evento {
  id: number;
  organizadorId: number;
  nombre: string;
  descripcion: string | null;
  lugar: string;
  direccion: string | null;
  ciudad: string | null;
  latitud: number | null;
  longitud: number | null;
  categoriaId: number | null;
  categoria: string | null;
  fechaHoraInicio: string;
  fechaHoraFin: string | null;
  esDePago: boolean;
  requiereAsiento: boolean;
  aforo: number;
  disponibles: number;
  precioDesde: string;
  estado: EstadoEvento;
  distanciaKm: number | null;
  fechaCancelacion: string | null;
  motivoCancelacion: string | null;
  /** Solo en el detalle del evento. */
  tiposBoleto: TipoBoleto[] | null;
}

export interface TipoBoletoSolicitud {
  id?: number | null;
  nombre: string;
  precio: number;
  cantidad: number;
}

export interface SeccionSolicitud {
  nombre: string;
  filas: number;
  asientosPorFila: number;
}

export interface EventoSolicitud {
  nombre: string;
  descripcion: string | null;
  lugar: string;
  direccion: string | null;
  ciudad: string | null;
  latitud: number | null;
  longitud: number | null;
  categoriaId: number | null;
  fechaHoraInicio: string;
  fechaHoraFin: string | null;
  aforo: number;
  esDePago: boolean;
  requiereAsiento: boolean;
  tiposBoleto: TipoBoletoSolicitud[] | null;
  secciones: SeccionSolicitud[] | null;
  publicar: boolean;
}

export interface Asiento {
  id: number;
  seccion: string;
  fila: string;
  numero: string;
  estado: EstadoAsiento;
  etiqueta: string;
}

export interface Validador {
  usuarioId: number;
  nombre: string;
  correo: string;
}

export interface FiltroEventos {
  q?: string;
  categoriaId?: number;
  ciudad?: string;
  desde?: string;
  hasta?: string;
  esDePago?: boolean;
  lat?: number;
  lng?: number;
  radioKm?: number;
  page?: number;
  size?: number;
}

// ---------------------------------------------------------------- boletaje

export interface CrearOrdenSolicitud {
  eventoId: number;
  tipoBoletoId: number | null;
  cantidad: number;
  asientosIds: number[];
  metodo: MetodoPago;
  tokenPago: string | null;
}

export interface Boleto {
  id: number;
  ordenId: number;
  eventoId: number;
  tipoBoletoId: number | null;
  asientoId: number | null;
  codigo: string;
  firma: string;
  /** Texto que se dibuja en el QR: "codigo.firma". */
  contenidoQr: string;
  estado: EstadoBoleto;
  fechaEmision: string;
  fechaUso: string | null;
  eventoNombre: string;
  fechaHoraInicio: string;
  lugar: string;
  tipoNombre: string | null;
  asientoEtiqueta: string | null;
}

export interface Orden {
  ordenId: number;
  eventoId: number;
  estadoOrden: EstadoOrden;
  estadoPago: EstadoPago | null;
  total: string;
  moneda: string;
  referenciaPago: string | null;
  expiraEn: string | null;
  mensaje: string | null;
  boletos: Boleto[];
}

// ---------------------------------------------------------------- cancelación y reportes

export interface PoliticaCancelacion {
  permitida: boolean;
  tipo: TipoCancelacion | null;
  importeCobrado: string;
  comision: string;
  reembolso: string;
  boletosAfectados: number;
  motivoBloqueo: string | null;
}

export interface CancelacionRespuesta {
  eventoId: number;
  importeReembolsado: string;
  comision: string;
  boletosAnulados: number;
  asistentesNotificados: number;
  canceladoPor: number;
  fechaCancelacion: string;
}

export interface ReportePorTipo {
  tipoBoletoId: number;
  nombre: string;
  precio: string;
  cantidadTotal: number;
  disponibles: number;
  emitidos: number;
  ingresos: string;
}

export interface Reporte {
  eventoId: number;
  evento: string;
  estado: EstadoEvento;
  aforo: number;
  disponibles: number;
  boletosEmitidos: number;
  accesosValidados: number;
  accesosRechazados: number;
  boletosCancelados: number;
  ingresos: string;
  reembolsado: string;
  ocupacion: number;
  porTipo: ReportePorTipo[];
}

// ---------------------------------------------------------------- validación

export interface ValidacionRespuesta {
  resultado: ResultadoAcceso;
  motivo: MotivoRechazo | null;
  mensaje: string;
  codigo: string | null;
  tipoBoleto: string | null;
  asiento: string | null;
  fechaUso: string | null;
}

// ---------------------------------------------------------------- administración

export interface UsuarioAdmin {
  id: number;
  nombre: string;
  correo: string;
  telefono: string | null;
  estado: EstadoUsuario;
  correoVerificado: boolean;
  roles: Rol[];
  fechaRegistro: string;
}

// ---------------------------------------------------------------- utilidades

/** Lista paginada: el arreglo viene en el cuerpo y la paginación en las cabeceras X-*. */
export interface Pagina<T> {
  elementos: T[];
  total: number;
  pagina: number;
  tamano: number;
  totalPaginas: number;
}

/** Problem Details (RFC 9457) con la propiedad `codigo` de EnZona. */
export interface ProblemaApi {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  instance?: string;
  codigo?: string;
  timestamp?: string;
  errores?: { campo: string; mensaje: string }[];
}
