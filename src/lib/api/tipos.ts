/*
 * Contrato de EnZona_Api (Spring Boot 3, versión 0.1.0 + rama de portadas).
 *
 * Copia 1:1 de los DTO de `data/remote/ApiService.kt` de la app Android y de
 * `docs/openapi.yaml` de la API. Fechas: ISO-8601 con desfase de la Ciudad de
 * México. Importes: texto decimal exacto ("360.00", MXN).
 *
 * Reglas que aplica el servidor (el cliente propone, el servidor dispone):
 *  - precio y total se derivan de `tipo_boleto`, nunca del cliente;
 *  - la compra de N boletos es todo o nada;
 *  - `Idempotency-Key` repetida devuelve la misma orden sin cobrar dos veces;
 *  - la firma HMAC del boleto se calcula y verifica solo en el servidor.
 */

export type Rol = "ASISTENTE" | "ORGANIZADOR" | "VALIDADOR" | "ADMIN";
export type EstadoUsuario = "PENDIENTE" | "ACTIVO" | "BLOQUEADO";
export type EstadoEvento = "BORRADOR" | "PUBLICADO" | "REALIZADO" | "CANCELADO";
export type EstadoOrden = "PENDIENTE" | "PAGADA" | "CANCELADA" | "REEMBOLSADA";
export type EstadoPago = "APROBADO" | "RECHAZADO" | "REEMBOLSADO" | "PENDIENTE";
export type EstadoBoleto = "VALIDO" | "USADO" | "CANCELADO" | "EXPIRADO";
export type EstadoAsiento = "DISPONIBLE" | "RESERVADO" | "OCUPADO";
export type CanalVerificacion = "CORREO" | "TELEFONO";
export type MetodoPago = "GRATIS" | "TARJETA" | "OXXO" | "SPEI";
export type ResultadoAcceso = "PERMITIDO" | "RECHAZADO";
export type MotivoRechazo =
  | "FORMATO_INVALIDO"
  | "BOLETO_INEXISTENTE"
  | "FIRMA_INVALIDA"
  | "OTRO_EVENTO"
  | "EVENTO_CANCELADO"
  | "YA_UTILIZADO"
  | "CANCELADO"
  | "EXPIRADO";
export type TipoCancelacion =
  | "BORRADOR"
  | "GRATUITO"
  | "DE_PAGO_SIN_VENTAS"
  | "DE_PAGO_CON_VENTAS"
  | "ADMINISTRATIVA";

/** Cuerpo de error RFC 9457 con la extensión `codigo`. */
export interface ProblemaDto {
  status?: number;
  title?: string;
  detail?: string;
  codigo?: string;
  errores?: { campo: string; mensaje: string }[];
  timestamp?: string;
}

// ------------------------------------------------------------ acceso

export interface RegistroDto {
  nombre: string;
  correo: string;
  telefono: string | null;
  curp: string;
  contrasena: string;
  organizador: boolean;
  aceptaAvisoPrivacidad: boolean;
}

export interface RegistroRespuestaDto {
  usuarioId: number;
  correo?: string;
  estado?: EstadoUsuario;
  verificacionesPendientes?: CanalVerificacion[];
}

export interface VerificacionDto {
  correo: string;
  canal: CanalVerificacion;
  codigo: string;
}

export interface VerificacionRespuestaDto {
  estado?: EstadoUsuario;
  correoVerificado?: boolean;
  telefonoVerificado?: boolean;
  verificacionesPendientes?: CanalVerificacion[];
}

export interface SesionDto {
  identificador: string;
  contrasena: string;
}

export interface UsuarioDto {
  id: number;
  nombre: string;
  correo?: string | null;
  telefono?: string | null;
  roles?: Rol[];
  estado?: EstadoUsuario;
  correoVerificado?: boolean;
  telefonoVerificado?: boolean;
  fechaRegistro?: string;
}

export interface SesionRespuestaDto {
  token: string;
  tipo?: string;
  expiraEnSegundos?: number;
  expiraEn?: string;
  usuario: UsuarioDto;
}

// ------------------------------------------------------------ eventos

export interface CategoriaDto {
  id: number;
  nombre: string;
}

export interface TipoBoletoDto {
  id: number;
  nombre: string;
  precio?: string | null;
  cantidadTotal?: number | null;
  disponibles?: number | null;
}

export interface EventoDto {
  id: number;
  organizadorId?: number | null;
  nombre: string;
  descripcion?: string | null;
  lugar: string;
  direccion?: string | null;
  ciudad?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  categoriaId?: number | null;
  categoria?: string | null;
  fechaHoraInicio: string;
  fechaHoraFin?: string | null;
  esDePago: boolean;
  requiereAsiento: boolean;
  aforo: number;
  disponibles: number;
  precioDesde?: string | null;
  estado?: EstadoEvento;
  distanciaKm?: number | null;
  fechaCancelacion?: string | null;
  motivoCancelacion?: string | null;
  tiposBoleto?: TipoBoletoDto[] | null;
  imagenUrl?: string | null;
}

/** `numero` es texto en la API. */
export interface AsientoDto {
  id: number;
  seccion?: string | null;
  fila?: string | null;
  numero?: string | null;
  estado?: EstadoAsiento;
  etiqueta?: string | null;
}

export interface SeccionDto {
  nombre: string;
  filas: number;
  asientosPorFila: number;
}

/** Con `id` conserva un tipo existente; sin `id` agrega uno nuevo. */
export interface TipoBoletoSolicitudDto {
  id?: number | null;
  nombre: string;
  precio: number;
  cantidad: number;
}

export interface EventoSolicitudDto {
  nombre: string;
  descripcion?: string | null;
  lugar: string;
  direccion?: string | null;
  ciudad?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  categoriaId?: number | null;
  fechaHoraInicio: string;
  fechaHoraFin?: string | null;
  aforo: number;
  esDePago: boolean;
  requiereAsiento: boolean;
  tiposBoleto?: TipoBoletoSolicitudDto[] | null;
  secciones?: SeccionDto[] | null;
  publicar: boolean;
}

export interface ValidadorDto {
  usuarioId: number;
  nombre: string;
  correo: string;
}

export interface PoliticaCancelacionDto {
  permitida: boolean;
  tipo?: TipoCancelacion | null;
  importeCobrado?: string | null;
  comision?: string | null;
  reembolso?: string | null;
  boletosAfectados?: number | null;
  motivoBloqueo?: string | null;
}

export interface CancelacionDto {
  motivo?: string | null;
  aceptaComision: boolean;
}

export interface CancelacionResultadoDto {
  eventoId: number;
  importeReembolsado?: string | null;
  comision?: string | null;
  boletosAnulados?: number | null;
  asistentesNotificados?: number | null;
  canceladoPor?: number | null;
  fechaCancelacion?: string | null;
}

export interface ReporteTipoDto {
  tipoBoletoId?: number;
  nombre?: string;
  precio?: string;
  cantidadTotal?: number;
  vendidos?: number;
  disponibles?: number;
  ingresos?: string;
}

export interface ReporteDto {
  eventoId: number;
  evento?: string;
  estado?: EstadoEvento;
  aforo?: number;
  disponibles?: number;
  boletosEmitidos?: number;
  accesosValidados?: number;
  accesosRechazados?: number;
  boletosCancelados?: number;
  ingresos?: string;
  reembolsado?: string;
  ocupacion?: number;
  porTipo?: ReporteTipoDto[];
}

// ------------------------------------------------------------ órdenes y boletos

export interface CrearOrdenDto {
  eventoId: number;
  tipoBoletoId: number | null;
  cantidad: number;
  asientosIds: number[];
  metodo: MetodoPago;
  tokenPago: string | null;
}

export interface BoletoDto {
  id: number;
  ordenId: number;
  eventoId: number;
  tipoBoletoId?: number | null;
  asientoId?: number | null;
  codigo: string;
  firma?: string | null;
  contenidoQr?: string | null;
  estado?: EstadoBoleto;
  fechaEmision?: string | null;
  fechaUso?: string | null;
  eventoNombre?: string | null;
  fechaHoraInicio?: string | null;
  lugar?: string | null;
  tipoNombre?: string | null;
  asientoEtiqueta?: string | null;
}

export interface OrdenDto {
  ordenId: number;
  eventoId: number;
  estadoOrden?: EstadoOrden;
  estadoPago?: EstadoPago | null;
  total?: string | null;
  moneda?: string | null;
  referenciaPago?: string | null;
  expiraEn?: string | null;
  mensaje?: string | null;
  boletos?: BoletoDto[] | null;
}

// ------------------------------------------------------------ validación

export interface ValidarDto {
  eventoId: number;
  qr: string;
}

export interface ResultadoValidacionDto {
  resultado?: ResultadoAcceso;
  motivo?: MotivoRechazo | null;
  mensaje?: string | null;
  codigo?: string | null;
  tipoBoleto?: string | null;
  asiento?: string | null;
  fechaUso?: string | null;
}

export interface EntradaManifiestoDto {
  codigo: string;
  firma?: string | null;
  estado?: EstadoBoleto;
  tipoBoleto?: string | null;
  asiento?: string | null;
}

export interface ManifiestoDto {
  eventoId: number;
  evento?: string;
  generadoEn?: string;
  total?: number;
  boletos?: EntradaManifiestoDto[];
}

export interface RegistroOfflineDto {
  qr: string;
  fechaHora: string;
}

export interface SincronizacionDto {
  eventoId: number;
  registros: RegistroOfflineDto[];
}

export interface ResultadoSincronizadoDto {
  qr?: string;
  fechaHora?: string;
  resultado?: ResultadoAcceso;
  motivo?: MotivoRechazo | null;
  conflicto?: boolean;
  duplicado?: boolean;
}

export interface SincronizacionResultadoDto {
  procesados?: number;
  permitidos?: number;
  rechazados?: number;
  conflictos?: number;
  resultados?: ResultadoSincronizadoDto[];
}

/** Paginación que viaja en cabeceras `X-Total-Count`, `X-Page`, `X-Page-Size`, `X-Total-Pages`. */
export interface Paginacion {
  total: number;
  pagina: number;
  tamano: number;
  totalPaginas: number;
}

export interface ListaPaginada<T> {
  elementos: T[];
  paginacion: Paginacion;
}

/** Máximo que admite la API por página. */
export const TAMANO_PAGINA = 100;
