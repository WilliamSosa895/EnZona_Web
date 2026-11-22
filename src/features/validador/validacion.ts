import type {
  Manifiesto,
  MotivoRechazo,
  ResultadoAcceso,
  SincronizacionRespuesta,
  ValidacionRespuesta,
} from '@/api/tipos';

/*
 * Reglas del validador en la puerta (RepositorioRemoto y Mapeo.kt de la app Android): títulos de cada resultado,
 * validación sin conexión contra el manifiesto y registro local de lo validado en este navegador. Son funciones
 * puras y un almacén pequeño; la pantalla solo los muestra.
 */

/** Lo que se ve en la puerta, igual para la validación en línea y sin conexión. */
export interface Resultado {
  permitido: boolean;
  titulo: string;
  detalle: string;
  codigo: string | null;
  asiento: string | null;
}

const TITULO_RECHAZO: Record<MotivoRechazo, string> = {
  YA_UTILIZADO: 'Boleto ya utilizado',
  FIRMA_INVALIDA: 'Boleto no válido',
  BOLETO_INEXISTENTE: 'Boleto no reconocido',
  FORMATO_INVALIDO: 'Código no reconocido',
  OTRO_EVENTO: 'Boleto de otro evento',
  EVENTO_CANCELADO: 'Evento cancelado',
  CANCELADO: 'Boleto cancelado',
  EXPIRADO: 'Boleto expirado',
};

export function tituloValidacion(
  resultado: ResultadoAcceso | null,
  motivo: MotivoRechazo | null,
  conflicto = false,
): string {
  if (conflicto) return 'Boleto ya admitido en otro dispositivo';
  if (resultado === 'PERMITIDO') return 'Acceso permitido';
  return (motivo && TITULO_RECHAZO[motivo]) ?? 'Acceso rechazado';
}

/** Respuesta de POST /api/validaciones tal como se muestra en la puerta. */
export function resultadoEnLinea(r: ValidacionRespuesta): Resultado {
  const permitido = r.resultado === 'PERMITIDO';
  return {
    permitido,
    titulo: tituloValidacion(r.resultado, r.motivo),
    detalle: permitido ? [r.mensaje, r.tipoBoleto, r.asiento].filter(Boolean).join(' · ') : r.mensaje,
    codigo: r.codigo,
    asiento: r.asiento,
  };
}

/** Parte del QR antes del punto: el código de referencia del boleto. */
export const codigoDe = (qr: string) => (qr.includes('.') ? qr.slice(0, qr.indexOf('.')) : null);

/**
 * Sin conexión no se puede verificar la firma (la clave HMAC nunca sale del servidor): se comprueba que el QR
 * leído (código y firma) esté en el manifiesto descargado y que este equipo no lo haya admitido ya. El servidor
 * aplica la regla definitiva al sincronizar.
 */
export function validarSinConexion(qr: string, manifiesto: Manifiesto, yaAdmitidos: ReadonlySet<string>): Resultado {
  const contenido = qr.trim();
  const nombre = manifiesto.evento ?? '';
  const entrada = manifiesto.boletos.find((b) => `${b.codigo}.${b.firma}` === contenido);
  const codigo = codigoDe(contenido);
  const rechazo = (titulo: string, detalle: string): Resultado => ({
    permitido: false,
    titulo,
    detalle,
    codigo,
    asiento: entrada?.asiento ?? null,
  });
  if (!entrada) return rechazo('Boleto no reconocido', `El código no pertenece al manifiesto de «${nombre}».`);
  if (yaAdmitidos.has(contenido))
    return rechazo('Boleto ya utilizado', 'Este dispositivo ya admitió este boleto sin conexión.');
  if (entrada.estado === 'USADO')
    return rechazo('Boleto ya utilizado', 'Ya se había registrado su acceso antes de descargar el manifiesto.');
  if (entrada.estado === 'CANCELADO') return rechazo('Boleto cancelado', 'El boleto se anuló.');
  if (entrada.estado !== 'VALIDO') return rechazo('Boleto expirado', 'La vigencia de este boleto ya terminó.');
  return {
    permitido: true,
    titulo: 'Acceso permitido',
    detalle: [nombre || null, entrada.tipoBoleto, entrada.asiento, 'sin conexión, pendiente de sincronizar']
      .filter(Boolean)
      .join(' · '),
    codigo,
    asiento: entrada.asiento,
  };
}

// ---------------------------------------------------------------- registro local

/** Escaneo sin conexión que aún no recibe el servidor. */
export interface Pendiente {
  eventoId: number;
  qr: string;
  /** Instante del escaneo (ISO-8601 en UTC). */
  fechaHora: string;
  permitido: boolean;
  titulo: string;
}

/** Validación ya resuelta (en línea, sin conexión o sincronizada) que se muestra en «Últimos accesos». */
export interface Registro {
  eventoId: number;
  codigo: string;
  permitido: boolean;
  titulo: string;
  fechaHora: string;
  sinConexion: boolean;
  /** false mientras el escaneo sin conexión no se envía al servidor. */
  sincronizado: boolean;
}

/** Como en Android: se conservan los últimos 50 registros de este equipo. */
export const MAXIMO_BITACORA = 50;

/*
 * Los escaneos pendientes se guardan en localStorage para no perderlos si se cierra la pestaña antes de volver a
 * tener red: son la única constancia de quién entró sin conexión. Se borran al sincronizarlos. El manifiesto, en
 * cambio, vive solo en memoria (ver `manifiestos`): sin red la página no se puede recargar de todos modos.
 */
const clavePendientes = (usuarioId: number) => `enzona.validador.pendientes.${usuarioId}`;
const claveBitacora = (usuarioId: number) => `enzona.validador.bitacora.${usuarioId}`;

function leerLista<T>(almacen: Storage, clave: string): T[] {
  try {
    const crudo = almacen.getItem(clave);
    const lista = crudo ? (JSON.parse(crudo) as unknown) : [];
    return Array.isArray(lista) ? (lista as T[]) : [];
  } catch {
    return [];
  }
}

function escribirLista(almacen: Storage, clave: string, lista: unknown[]) {
  try {
    almacen.setItem(clave, JSON.stringify(lista));
  } catch {
    // Sin almacenamiento: los datos duran mientras la página esté abierta (estado de la pantalla).
  }
}

export const leerPendientes = (usuarioId: number) => leerLista<Pendiente>(localStorage, clavePendientes(usuarioId));
export const guardarPendientes = (usuarioId: number, lista: Pendiente[]) =>
  escribirLista(localStorage, clavePendientes(usuarioId), lista);

// La bitácora local solo guarda el código de referencia (sin la firma): no sirve para fabricar un boleto.
export const leerBitacora = (usuarioId: number) => leerLista<Registro>(localStorage, claveBitacora(usuarioId));
export const guardarBitacora = (usuarioId: number, lista: Registro[]) =>
  escribirLista(localStorage, claveBitacora(usuarioId), lista.slice(0, MAXIMO_BITACORA));

/** Manifiestos descargados en esta página, por evento. Nunca se escriben en el almacenamiento del navegador. */
export const manifiestos = new Map<number, Manifiesto>();

/** QR que este equipo admitió sin conexión para un evento (no se admite dos veces el mismo). */
export function admitidosSinConexion(pendientes: Pendiente[], eventoId: number): Set<string> {
  return new Set(pendientes.filter((p) => p.eventoId === eventoId && p.permitido).map((p) => p.qr));
}

/** Resumen de un envío: «Enviadas N: X entraron y Y rechazadas (Z ya habían entrado)». */
export interface ResumenSincronizacion {
  enviadas: number;
  permitidas: number;
  rechazadas: number;
  duplicadas: number;
}

/**
 * Registros con el veredicto del servidor para los escaneos enviados de un evento. El servidor responde en orden
 * cronológico, igual que la cola; el mismo QR puede repetirse (admitido y luego rechazado), así que se empareja
 * por posición y solo se acepta el veredicto si el QR coincide.
 */
export function registrosSincronizados(enviados: Pendiente[], respuesta: SincronizacionRespuesta): Registro[] {
  const ordenados = [...enviados].sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
  return ordenados.map((p, i) => {
    const v = respuesta.resultados[i]?.qr === p.qr ? respuesta.resultados[i] : undefined;
    return {
      eventoId: p.eventoId,
      codigo: codigoDe(p.qr) ?? p.qr.slice(0, 24),
      permitido: v ? v.resultado === 'PERMITIDO' : p.permitido,
      titulo: v ? tituloValidacion(v.resultado, v.motivo, v.conflicto) : p.titulo,
      fechaHora: p.fechaHora,
      sinConexion: true,
      sincronizado: true,
    };
  });
}

export function resumirSincronizacion(enviadas: number, respuestas: SincronizacionRespuesta[]): ResumenSincronizacion {
  return {
    enviadas,
    permitidas: respuestas.reduce((s, r) => s + r.permitidos, 0),
    rechazadas: respuestas.reduce((s, r) => s + r.rechazados, 0),
    duplicadas: respuestas.reduce((s, r) => s + r.resultados.filter((x) => x.conflicto || x.duplicado).length, 0),
  };
}
