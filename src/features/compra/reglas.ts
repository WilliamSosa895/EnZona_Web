import type { AsientoDto, EventoDto, TipoBoletoDto } from "@/lib/api/tipos";
import { MAX_BOLETOS_POR_ORDEN } from "@/lib/capacidades";
import { yaComenzo } from "@/lib/fecha";

/*
 * Reglas de presentación de la compra. Son las mismas que aplica la app
 * Android antes de llamar a la API; el servidor las vuelve a comprobar y es
 * quien decide (todo o nada, precios derivados de `tipo_boleto`).
 */

export type EstadoDetalle =
  | "cancelado"
  | "realizado"
  | "no-publicado"
  | "comenzo"
  | "agotado"
  | "disponible";

export function estadoDelDetalle(evento: EventoDto, ahora: Date = new Date()): EstadoDetalle {
  if (evento.estado === "CANCELADO") return "cancelado";
  if (evento.estado === "REALIZADO") return "realizado";
  if (evento.estado && evento.estado !== "PUBLICADO") return "no-publicado";
  if (yaComenzo(evento.fechaHoraInicio, ahora)) return "comenzo";
  if (evento.disponibles <= 0) return "agotado";
  return "disponible";
}

/** Tipos con precio, del más barato al más caro; los gratuitos no muestran tipos. */
export function tiposElegibles(evento: EventoDto): TipoBoletoDto[] {
  if (!evento.esDePago) return [];
  return [...(evento.tiposBoleto ?? [])].sort(
    (a, b) => Number.parseFloat(a.precio ?? "0") - Number.parseFloat(b.precio ?? "0"),
  );
}

/** Tipo elegido o, si el evento tiene uno solo, ese. */
export function tipoPorDefecto(evento: EventoDto): TipoBoletoDto | null {
  const tipos = tiposElegibles(evento);
  return tipos[0] ?? null;
}

/**
 * Cupo real para la cantidad: el mínimo entre el cupo del evento, el stock del
 * tipo, los asientos libres y el máximo por orden de la API. Los eventos
 * gratuitos admiten una sola confirmación por persona.
 */
export function cupoDisponible(
  evento: EventoDto,
  tipo: TipoBoletoDto | null,
  asientosLibres?: number,
): number {
  if (!evento.esDePago) return Math.min(1, evento.disponibles);
  const candidatos = [evento.disponibles, MAX_BOLETOS_POR_ORDEN];
  if (tipo?.disponibles != null) candidatos.push(tipo.disponibles);
  if (asientosLibres != null) candidatos.push(asientosLibres);
  return Math.max(0, Math.min(...candidatos));
}

export function asientosLibres(asientos: AsientoDto[]): number {
  let libres = 0;
  for (const asiento of asientos) if (asiento.estado === "DISPONIBLE") libres += 1;
  return libres;
}

/** Texto de los lugares del detalle: "48 lugares disponibles" + "48 asientos libres de 50" o "Aforo de 300 personas". */
export function textoCupo(evento: EventoDto): { titulo: string; detalle: string } {
  const titulo =
    evento.disponibles <= 0
      ? "Sin lugares disponibles"
      : evento.disponibles === 1
        ? "1 lugar disponible"
        : `${evento.disponibles} lugares disponibles`;
  const detalle = evento.requiereAsiento
    ? `${evento.disponibles} asientos libres de ${evento.aforo}`
    : `Aforo de ${evento.aforo} personas`;
  return { titulo, detalle };
}

/** Parsea `asientos=1-2-3` de la URL de pago. */
export function parsearAsientos(texto: string | null | undefined): number[] {
  if (!texto) return [];
  const ids = texto
    .split("-")
    .map((valor) => Number.parseInt(valor, 10))
    .filter((valor) => Number.isInteger(valor) && valor > 0);
  return [...new Set(ids)];
}

export function parsearCantidad(texto: string | null | undefined, maximo: number): number {
  const valor = Number.parseInt(texto ?? "1", 10);
  if (!Number.isInteger(valor) || valor < 1) return 1;
  return Math.min(valor, Math.max(1, maximo));
}

export function parsearTipo(texto: string | null | undefined): number | null {
  const valor = Number.parseInt(texto ?? "0", 10);
  return Number.isInteger(valor) && valor > 0 ? valor : null;
}

/** Validación previa de la selección de asientos: cuántos faltan o sobran. */
export function faltanAsientos(seleccionados: number, cantidad: number): number {
  return Math.max(0, cantidad - seleccionados);
}

/** Clave de idempotencia válida para la API (8 a 64 caracteres `[A-Za-z0-9_-]`). */
export function nuevaClaveIdempotencia(): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return uuid.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64).padEnd(8, "0");
}

export function esClaveValida(clave: string): boolean {
  return /^[A-Za-z0-9_-]{8,64}$/.test(clave);
}

/** Etiqueta corta de un asiento: "Platea A1". */
export function etiquetaCorta(asiento: AsientoDto): string {
  return `${asiento.seccion ?? ""} ${asiento.fila ?? ""}${asiento.numero ?? ""}`.trim();
}

/** Etiqueta larga: "Platea · Fila A · Asiento 1" (la que entrega la API en el boleto). */
export function etiquetaLarga(asiento: AsientoDto): string {
  return asiento.etiqueta ?? `${asiento.seccion} · Fila ${asiento.fila} · Asiento ${asiento.numero}`;
}
