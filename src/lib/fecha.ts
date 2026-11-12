/*
 * Fechas de los eventos. La API habla ISO-8601 con desfase de la Ciudad de
 * México; aquí todo se muestra en la zona del evento (America/Mexico_City) con
 * el formato único de la app: «Vie 25 Sep · 19:00». Las abreviaturas son fijas
 * para que no cambien entre navegadores («sep» frente a «sept»).
 */

export const ZONA_EVENTO = "America/Mexico_City";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MESES_LARGOS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

interface Partes {
  ano: number;
  mes: number; // 1-12
  dia: number;
  hora: number;
  minuto: number;
  diaSemana: number; // 0 = domingo
}

const FORMATEADOR = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA_EVENTO,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  weekday: "short",
  hour12: false,
});

const DIAS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function parsear(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export function partesEnZona(fecha: Date): Partes {
  const partes = FORMATEADOR.formatToParts(fecha);
  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? "0";
  const hora = Number(valor("hour"));
  return {
    ano: Number(valor("year")),
    mes: Number(valor("month")),
    dia: Number(valor("day")),
    hora: hora === 24 ? 0 : hora,
    minuto: Number(valor("minute")),
    diaSemana: DIAS_EN.indexOf(valor("weekday")),
  };
}

function dosDigitos(numero: number): string {
  return numero.toString().padStart(2, "0");
}

/** "19:00" */
export function hora(iso: string | null | undefined): string {
  const fecha = parsear(iso);
  if (!fecha) return "";
  const partes = partesEnZona(fecha);
  return `${dosDigitos(partes.hora)}:${dosDigitos(partes.minuto)}`;
}

/** "Vie 25 Sep · 19:00" */
export function corto(iso: string | null | undefined): string {
  const fecha = parsear(iso);
  if (!fecha) return "";
  const partes = partesEnZona(fecha);
  return `${DIAS[partes.diaSemana]} ${partes.dia} ${MESES[partes.mes - 1]} · ${hora(iso)}`;
}

/** "Vie 25 Sep 2026 · 19:00" */
export function largo(iso: string | null | undefined): string {
  const fecha = parsear(iso);
  if (!fecha) return "";
  const partes = partesEnZona(fecha);
  return `${DIAS[partes.diaSemana]} ${partes.dia} ${MESES[partes.mes - 1]} ${partes.ano} · ${hora(iso)}`;
}

/** "Sáb 31 Oct · 20:00 – 23:00" (o solo el inicio si no hay fin). */
export function intervalo(inicio: string | null | undefined, fin: string | null | undefined): string {
  const textoInicio = corto(inicio);
  if (!fin) return textoInicio;
  const fechaInicio = parsear(inicio);
  const fechaFin = parsear(fin);
  if (!fechaInicio || !fechaFin) return textoInicio;
  const partesInicio = partesEnZona(fechaInicio);
  const partesFin = partesEnZona(fechaFin);
  const mismoDia =
    partesInicio.ano === partesFin.ano &&
    partesInicio.mes === partesFin.mes &&
    partesInicio.dia === partesFin.dia;
  return mismoDia ? `${textoInicio} – ${hora(fin)}` : `${textoInicio} – ${corto(fin)}`;
}

/** Bloque de fecha de las tarjetas: { dia: "27", mes: "oct" }. */
export function bloque(iso: string | null | undefined): { dia: string; mes: string } {
  const fecha = parsear(iso);
  if (!fecha) return { dia: "--", mes: "" };
  const partes = partesEnZona(fecha);
  return { dia: String(partes.dia), mes: MESES[partes.mes - 1].toLowerCase() };
}

/** "Sáb 31 Oct 2026" (sin hora) para los campos del formulario. */
export function soloFecha(iso: string | null | undefined): string {
  const fecha = parsear(iso);
  if (!fecha) return "";
  const partes = partesEnZona(fecha);
  return `${DIAS[partes.diaSemana]} ${partes.dia} ${MESES[partes.mes - 1]} ${partes.ano}`;
}

/** "27 de octubre de 2026, 20:00" para correos y textos largos. */
export function completo(iso: string | null | undefined): string {
  const fecha = parsear(iso);
  if (!fecha) return "";
  const partes = partesEnZona(fecha);
  return `${partes.dia} de ${MESES_LARGOS[partes.mes - 1]} de ${partes.ano}, ${hora(iso)}`;
}

/** Fecha y hora en formato de la API con el desfase de la Ciudad de México. */
export function aIso(fechaLocal: string, horaLocal: string): string {
  const [ano, mes, dia] = fechaLocal.split("-").map(Number);
  const [hh, mm] = horaLocal.split(":").map(Number);
  // El desfase de la zona en esa fecha (la Ciudad de México no cambia de horario desde 2022).
  const desfase = desfaseMinutos(new Date(Date.UTC(ano, mes - 1, dia, hh, mm)));
  const signo = desfase >= 0 ? "+" : "-";
  const abs = Math.abs(desfase);
  return `${ano}-${dosDigitos(mes)}-${dosDigitos(dia)}T${dosDigitos(hh)}:${dosDigitos(mm)}:00${signo}${dosDigitos(
    Math.floor(abs / 60),
  )}:${dosDigitos(abs % 60)}`;
}

/** Desfase en minutos de America/Mexico_City respecto a UTC para una fecha dada (−360 hoy, sin horario de verano). */
export function desfaseMinutos(fecha: Date): number {
  const partes = partesEnZona(fecha);
  const comoUtc = Date.UTC(partes.ano, partes.mes - 1, partes.dia, partes.hora, partes.minuto);
  return Math.round((comoUtc - fecha.getTime()) / 60_000);
}

/** Separa un ISO de la API en los valores de los inputs `date` y `time`. */
export function aCampos(iso: string | null | undefined): { fecha: string; hora: string } {
  const valor = parsear(iso);
  if (!valor) return { fecha: "", hora: "" };
  const partes = partesEnZona(valor);
  return {
    fecha: `${partes.ano}-${dosDigitos(partes.mes)}-${dosDigitos(partes.dia)}`,
    hora: `${dosDigitos(partes.hora)}:${dosDigitos(partes.minuto)}`,
  };
}

export function yaComenzo(iso: string | null | undefined, ahora: Date = new Date()): boolean {
  const fecha = parsear(iso);
  return fecha !== null && fecha.getTime() <= ahora.getTime();
}

/** Hoy en la zona del evento, como "AAAA-MM-DD" para `min` del calendario. */
export function hoyEnZona(ahora: Date = new Date()): string {
  const partes = partesEnZona(ahora);
  return `${partes.ano}-${dosDigitos(partes.mes)}-${dosDigitos(partes.dia)}`;
}

/** Rango de fechas de los filtros de Inicio (RF-06). */
export type FiltroFecha = "hoy" | "semana" | "mes" | "proximo-mes";

export function rangoDeFiltro(filtro: FiltroFecha, ahora: Date = new Date()): { desde: Date; hasta: Date } {
  const partes = partesEnZona(ahora);
  const inicioDia = new Date(Date.UTC(partes.ano, partes.mes - 1, partes.dia, 0, 0));
  const desfase = desfaseMinutos(ahora) * 60_000;
  const inicioLocal = new Date(inicioDia.getTime() - desfase);
  const dia = 24 * 60 * 60_000;
  switch (filtro) {
    case "hoy":
      return { desde: inicioLocal, hasta: new Date(inicioLocal.getTime() + dia) };
    case "semana":
      return { desde: inicioLocal, hasta: new Date(inicioLocal.getTime() + 7 * dia) };
    case "mes": {
      const fin = new Date(Date.UTC(partes.ano, partes.mes, 1, 0, 0) - desfase);
      return { desde: inicioLocal, hasta: fin };
    }
    case "proximo-mes": {
      const desde = new Date(Date.UTC(partes.ano, partes.mes, 1, 0, 0) - desfase);
      const hasta = new Date(Date.UTC(partes.ano, partes.mes + 1, 1, 0, 0) - desfase);
      return { desde, hasta };
    }
  }
}

export function enRango(iso: string | null | undefined, rango: { desde: Date; hasta: Date }): boolean {
  const fecha = parsear(iso);
  if (!fecha) return false;
  return fecha.getTime() >= rango.desde.getTime() && fecha.getTime() < rango.hasta.getTime();
}
