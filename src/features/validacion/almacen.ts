import type { EntradaManifiestoDto, ManifiestoDto, MotivoRechazo, RegistroOfflineDto } from "@/lib/api/tipos";

/*
 * Validación sin conexión (RNF-08, CP-14), igual que la app Android: el
 * validador descarga el manifiesto del evento (código y firma de los boletos
 * VALIDO y USADO) mientras tiene red; sin red, cada escaneo se comprueba por
 * pertenencia al manifiesto y queda en cola para sincronizar. La clave HMAC
 * nunca sale del servidor, así que sin conexión no se verifica la firma: se
 * compara el QR completo.
 *
 * Todo se guarda en localStorage con un esquema versionado y por evento.
 */

const VERSION = 1;
const CLAVE_MANIFIESTO = (eventoId: number) => `enzona:v${VERSION}:manifiesto:${eventoId}`;
const CLAVE_PENDIENTES = (eventoId: number) => `enzona:v${VERSION}:pendientes:${eventoId}`;
const CLAVE_BITACORA = (eventoId: number) => `enzona:v${VERSION}:bitacora:${eventoId}`;
const CLAVE_USADOS_LOCAL = (eventoId: number) => `enzona:v${VERSION}:usados:${eventoId}`;

export const MAX_BITACORA = 50;

export interface ManifiestoGuardado {
  eventoId: number;
  evento: string;
  generadoEn: string;
  entradas: Record<string, EntradaManifiestoDto>; // por contenido del QR (codigo.firma)
}

export interface RegistroBitacora {
  qr: string;
  codigo: string;
  fechaHora: string;
  permitido: boolean;
  titulo: string;
  detalle: string;
  asiento?: string | null;
  offline: boolean;
  sincronizado: boolean;
}

function leer<T>(clave: string): T | null {
  try {
    const texto = localStorage.getItem(clave);
    return texto ? (JSON.parse(texto) as T) : null;
  } catch {
    return null;
  }
}

function escribir(clave: string, valor: unknown): void {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // sin espacio o sin almacenamiento: la operación en línea sigue funcionando
  }
}

export function guardarManifiesto(manifiesto: ManifiestoDto): ManifiestoGuardado {
  const entradas: Record<string, EntradaManifiestoDto> = {};
  for (const boleto of manifiesto.boletos ?? []) {
    entradas[`${boleto.codigo}.${boleto.firma ?? ""}`] = boleto;
  }
  const guardado: ManifiestoGuardado = {
    eventoId: manifiesto.eventoId,
    evento: manifiesto.evento ?? "",
    generadoEn: manifiesto.generadoEn ?? new Date().toISOString(),
    entradas,
  };
  escribir(CLAVE_MANIFIESTO(manifiesto.eventoId), guardado);
  escribir(CLAVE_USADOS_LOCAL(manifiesto.eventoId), []);
  return guardado;
}

export function leerManifiesto(eventoId: number): ManifiestoGuardado | null {
  return leer<ManifiestoGuardado>(CLAVE_MANIFIESTO(eventoId));
}

export function borrarManifiesto(eventoId: number): void {
  try {
    localStorage.removeItem(CLAVE_MANIFIESTO(eventoId));
    localStorage.removeItem(CLAVE_USADOS_LOCAL(eventoId));
  } catch {
    // ignorar
  }
}

export function contarVigentes(manifiesto: ManifiestoGuardado): number {
  let total = 0;
  for (const entrada of Object.values(manifiesto.entradas)) if (entrada.estado === "VALIDO") total += 1;
  return total;
}

export interface VeredictoLocal {
  permitido: boolean;
  motivo: MotivoRechazo | null;
  titulo: string;
  detalle: string;
  codigo: string | null;
  asiento: string | null;
}

/** Comprueba un QR contra el manifiesto y los escaneos ya hechos en este dispositivo. */
export function validarContraManifiesto(eventoId: number, qr: string): VeredictoLocal {
  const texto = qr.trim();
  const manifiesto = leerManifiesto(eventoId);
  if (!manifiesto) {
    return { permitido: false, motivo: null, titulo: "Sin manifiesto", detalle: "Descarga el manifiesto del evento con conexión antes de validar sin red.", codigo: null, asiento: null };
  }
  if (!texto.includes(".")) {
    return { permitido: false, motivo: "FORMATO_INVALIDO", titulo: "Código no reconocido", detalle: "El QR no tiene el formato de un boleto EnZona.", codigo: null, asiento: null };
  }
  const entrada = manifiesto.entradas[texto];
  const codigo = texto.split(".")[0];
  if (!entrada) {
    return { permitido: false, motivo: "BOLETO_INEXISTENTE", titulo: "Boleto no reconocido", detalle: "No está en el manifiesto de este evento o la firma no coincide.", codigo, asiento: null };
  }
  const usadosLocal = leer<string[]>(CLAVE_USADOS_LOCAL(eventoId)) ?? [];
  if (entrada.estado === "USADO" || usadosLocal.includes(texto)) {
    return { permitido: false, motivo: "YA_UTILIZADO", titulo: "Boleto ya utilizado", detalle: "Este boleto ya dio acceso.", codigo: entrada.codigo, asiento: entrada.asiento ?? null };
  }
  escribir(CLAVE_USADOS_LOCAL(eventoId), [...usadosLocal, texto]);
  return {
    permitido: true,
    motivo: null,
    titulo: "Acceso permitido",
    detalle: [entrada.tipoBoleto, entrada.asiento].filter(Boolean).join(" · "),
    codigo: entrada.codigo,
    asiento: entrada.asiento ?? null,
  };
}

export function encolarPendiente(eventoId: number, registro: RegistroOfflineDto): void {
  const pendientes = leer<RegistroOfflineDto[]>(CLAVE_PENDIENTES(eventoId)) ?? [];
  escribir(CLAVE_PENDIENTES(eventoId), [...pendientes, registro]);
}

export function leerPendientes(eventoId: number): RegistroOfflineDto[] {
  return leer<RegistroOfflineDto[]>(CLAVE_PENDIENTES(eventoId)) ?? [];
}

export function limpiarPendientes(eventoId: number): void {
  escribir(CLAVE_PENDIENTES(eventoId), []);
}

export function leerBitacora(eventoId: number): RegistroBitacora[] {
  return leer<RegistroBitacora[]>(CLAVE_BITACORA(eventoId)) ?? [];
}

export function agregarABitacora(eventoId: number, registro: RegistroBitacora): RegistroBitacora[] {
  const actual = leerBitacora(eventoId);
  const siguiente = [registro, ...actual].slice(0, MAX_BITACORA);
  escribir(CLAVE_BITACORA(eventoId), siguiente);
  return siguiente;
}

/** Tras sincronizar, cada registro local toma el veredicto del servidor. */
export function aplicarVeredictos(
  eventoId: number,
  resultados: { qr?: string; resultado?: string; motivo?: MotivoRechazo | null; conflicto?: boolean; duplicado?: boolean }[],
): RegistroBitacora[] {
  const porQr = new Map(resultados.map((item) => [item.qr, item]));
  const actual = leerBitacora(eventoId).map((registro) => {
    const veredicto = porQr.get(registro.qr);
    if (!veredicto || !registro.offline) return registro;
    const permitido = veredicto.resultado === "PERMITIDO" && !veredicto.conflicto;
    return {
      ...registro,
      sincronizado: true,
      permitido,
      titulo: veredicto.conflicto ? "Boleto ya admitido en otro dispositivo" : permitido ? "Acceso permitido" : tituloMotivo(veredicto.motivo),
    };
  });
  escribir(CLAVE_BITACORA(eventoId), actual);
  return actual;
}

export function tituloMotivo(motivo: MotivoRechazo | null | undefined): string {
  switch (motivo) {
    case "YA_UTILIZADO":
      return "Boleto ya utilizado";
    case "FIRMA_INVALIDA":
      return "Boleto no válido";
    case "BOLETO_INEXISTENTE":
      return "Boleto no reconocido";
    case "FORMATO_INVALIDO":
      return "Código no reconocido";
    case "OTRO_EVENTO":
      return "Boleto de otro evento";
    case "EVENTO_CANCELADO":
      return "Evento cancelado";
    case "CANCELADO":
      return "Boleto cancelado";
    case "EXPIRADO":
      return "Boleto expirado";
    default:
      return "Acceso rechazado";
  }
}
