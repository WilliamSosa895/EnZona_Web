/**
 * Fechas del evento en la zona del área de estudio (America/Mexico_City). Equivale a util/FechaEvento.kt:
 * es la ÚNICA función de formato; las pantallas no formatean por su cuenta.
 */
export const ZONA = 'America/Mexico_City';
const LOCALE = 'es-MX';

interface Partes {
  anio: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  diaSemana: string;
  mesCorto: string;
}

const formateadorPartes = new Intl.DateTimeFormat(LOCALE, {
  timeZone: ZONA,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  weekday: 'short',
});
const formateadorMes = new Intl.DateTimeFormat(LOCALE, { timeZone: ZONA, month: 'short' });

function capitalizar(texto: string): string {
  const limpio = texto.replace(/\./g, '').trim();
  return limpio.charAt(0).toLocaleUpperCase(LOCALE) + limpio.slice(1);
}

function partes(fecha: Date): Partes {
  const p = Object.fromEntries(formateadorPartes.formatToParts(fecha).map((x) => [x.type, x.value]));
  return {
    anio: Number(p.year),
    mes: Number(p.month),
    dia: Number(p.day),
    hora: Number(p.hour) % 24,
    minuto: Number(p.minute),
    diaSemana: capitalizar(p.weekday ?? ''),
    // ICU escribe "sept." en algunas versiones; Android usa "sep": se unifica.
    mesCorto: capitalizar(formateadorMes.format(fecha)).replace(/^Sept$/, 'Sep'),
  };
}

const dos = (n: number) => String(n).padStart(2, '0');

/** Lee el ISO-8601 de la API. */
export function leer(iso: string): Date {
  return new Date(iso);
}

/** "19:00". */
export function hora(iso: string | Date): string {
  const p = partes(typeof iso === 'string' ? leer(iso) : iso);
  return `${dos(p.hora)}:${dos(p.minuto)}`;
}

/** "Vie 25 Sep · 19:00" (tarjetas, detalle y boleto). */
export function corto(iso: string): string {
  const p = partes(leer(iso));
  return `${p.diaSemana} ${p.dia} ${p.mesCorto} · ${dos(p.hora)}:${dos(p.minuto)}`;
}

/** "Vie 25 Sep 2026 · 19:00". */
export function largo(iso: string): string {
  const p = partes(leer(iso));
  return `${p.diaSemana} ${p.dia} ${p.mesCorto} ${p.anio} · ${dos(p.hora)}:${dos(p.minuto)}`;
}

/** Día del mes ("25") para el bloque tipográfico de la portada. */
export function dia(iso: string): string {
  return String(partes(leer(iso)).dia);
}

/** Mes abreviado en minúsculas ("sep"). */
export function mesCorto(iso: string): string {
  return partes(leer(iso)).mesCorto.toLocaleLowerCase(LOCALE);
}

/** "Vie 25 Sep · 19:00 – 21:30" o con fecha de fin distinta. */
export function intervalo(inicio: string, fin: string | null): string {
  if (!fin) return corto(inicio);
  const a = partes(leer(inicio));
  const b = partes(leer(fin));
  if (a.anio === b.anio && a.mes === b.mes && a.dia === b.dia) return `${corto(inicio)} – ${hora(fin)}`;
  return `${corto(inicio)} – ${corto(fin)}`;
}

/** Fecha calendario (YYYY-MM-DD) en la zona del evento. */
export function fechaLocal(fecha: Date): string {
  const p = partes(fecha);
  return `${p.anio}-${dos(p.mes)}-${dos(p.dia)}`;
}

/** Valor para <input type="datetime-local"> a partir del ISO de la API, en la zona del evento. */
export function aEntradaLocal(iso: string | null): string {
  if (!iso) return '';
  const p = partes(leer(iso));
  return `${p.anio}-${dos(p.mes)}-${dos(p.dia)}T${dos(p.hora)}:${dos(p.minuto)}`;
}

/** Desfase en minutos de la zona del evento para un instante dado (p. ej., -360). */
function desfaseMinutos(instante: Date): number {
  const nombre = new Intl.DateTimeFormat('en-US', { timeZone: ZONA, timeZoneName: 'longOffset' })
    .formatToParts(instante)
    .find((p) => p.type === 'timeZoneName')?.value;
  const m = nombre?.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  if (!m) return 0;
  const signo = m[1] === '-' ? -1 : 1;
  return signo * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/**
 * Convierte el valor de <input type="datetime-local"> (hora del evento en Orizaba) al ISO-8601 con desfase
 * que espera la API, p. ej. "2026-11-20T19:00:00-06:00".
 */
export function desdeEntradaLocal(valor: string): string | null {
  const m = valor.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, a, me, d, h, mi] = m.map(Number);
  const comoUtc = Date.UTC(a, me - 1, d, h, mi);
  const desfase = desfaseMinutos(new Date(comoUtc - desfaseMinutos(new Date(comoUtc)) * 60_000));
  const signo = desfase < 0 ? '-' : '+';
  const abs = Math.abs(desfase);
  return `${a}-${dos(me)}-${dos(d)}T${dos(h)}:${dos(mi)}:00${signo}${dos(Math.floor(abs / 60))}:${dos(abs % 60)}`;
}

/** ¿El instante ya pasó? */
export function yaPaso(iso: string, ahora: Date = new Date()): boolean {
  return leer(iso).getTime() <= ahora.getTime();
}
