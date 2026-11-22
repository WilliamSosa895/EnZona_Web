import type { Evento, Reporte, UsuarioAdmin } from '@/api/tipos';
import { aNumero } from '@/lib/formato';
import { ZONA } from '@/lib/fechas';

/*
 * Estadísticas de la plataforma para el panel de administración (RF-18), como data/model/Estadisticas.kt de la
 * app Android. Se calculan en el navegador a partir de tres fuentes que la API ya expone: la lista de cuentas
 * (/api/admin/usuarios), la lista de eventos (/api/admin/eventos) y el reporte de cada evento
 * (/api/eventos/{id}/reportes), que es la única fuente de ingresos y accesos validados.
 */

/** Un valor con su etiqueta, para las gráficas de barras. */
export interface ParDato {
  etiqueta: string;
  valor: number;
}

export interface EstadisticasAdmin {
  usuariosTotal: number;
  usuariosActivos: number;
  usuariosPendientes: number;
  usuariosBloqueados: number;
  organizadores: number;
  validadores: number;
  administradores: number;
  eventosTotal: number;
  eventosPublicados: number;
  eventosBorrador: number;
  eventosRealizados: number;
  eventosCancelados: number;
  eventosGratuitos: number;
  eventosDePago: number;
  /** De mayor a menor cantidad. */
  eventosPorCategoria: ParDato[];
  /** Eventos por mes de inicio, en orden cronológico. */
  eventosPorMes: ParDato[];
  boletosEmitidos: number;
  accesosValidados: number;
  boletosCancelados: number;
  /** Aforo de los eventos publicados o realizados. */
  aforoTotal: number;
  /** Lugares vendidos o confirmados en esos eventos. */
  lugaresOcupados: number;
  ingresosTotales: number;
  reembolsado: number;
  /** Eventos con mayores ingresos (hasta 6). */
  ingresosPorEvento: ParDato[];
  /** Porcentaje de ocupación de los eventos publicados (hasta 6, de mayor a menor). */
  ocupacionPorEvento: ParDato[];
  ocupacionGlobal: number;
  asistencia: number;
  ingresosNetos: number;
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MAXIMO_BARRAS = 6;

/** Mes de inicio en la zona del evento, como «2026-10». */
function mesDe(iso: string): string {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit' }).format(
    new Date(iso),
  );
  return partes.slice(0, 7);
}

/** Etiqueta de un mes para las gráficas: «oct 26». */
export function etiquetaMes(mes: string): string {
  const [anio, numero] = mes.split('-').map(Number);
  return `${MESES_CORTOS[numero - 1]} ${String(anio % 100).padStart(2, '0')}`;
}

const vendidos = (e: Evento) => Math.max(0, e.aforo - e.disponibles);
const porValorDesc = (a: ParDato, b: ParDato) => b.valor - a.valor || a.etiqueta.localeCompare(b.etiqueta, 'es');

/** Agrega cuentas, eventos y reportes. Función pura: no toca la red, para poder probarla con datos fijos. */
export function calcularEstadisticas(
  usuarios: UsuarioAdmin[],
  eventos: Evento[],
  reportes: Reporte[],
): EstadisticasAdmin {
  const porEvento = new Map(reportes.map((r) => [r.eventoId, r]));
  const conAforo = eventos.filter((e) => e.estado === 'PUBLICADO' || e.estado === 'REALIZADO');
  const contar = (claves: string[]) =>
    claves.reduce((m, c) => m.set(c, (m.get(c) ?? 0) + 1), new Map<string, number>());

  const eventosPorCategoria = [...contar(eventos.map((e) => e.categoria?.trim() || 'Sin categoría'))]
    .map(([etiqueta, valor]) => ({ etiqueta, valor }))
    .sort(porValorDesc);
  const eventosPorMes = [...contar(eventos.map((e) => mesDe(e.fechaHoraInicio)))]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, valor]) => ({ etiqueta: etiquetaMes(mes), valor }));
  const ingresosPorEvento = eventos
    .flatMap((e) => {
      const r = porEvento.get(e.id);
      return r ? [{ etiqueta: e.nombre, valor: aNumero(r.ingresos) }] : [];
    })
    .filter((d) => d.valor > 0)
    .sort(porValorDesc)
    .slice(0, MAXIMO_BARRAS);
  const ocupacionPorEvento = eventos
    .filter((e) => e.estado === 'PUBLICADO' && e.aforo > 0)
    .map((e) => ({ etiqueta: e.nombre, valor: (vendidos(e) * 100) / e.aforo }))
    .sort(porValorDesc)
    .slice(0, MAXIMO_BARRAS);

  const suma = (f: (r: Reporte) => number) => reportes.reduce((s, r) => s + f(r), 0);
  const boletosEmitidos = suma((r) => r.boletosEmitidos);
  const accesosValidados = suma((r) => r.accesosValidados);
  const ingresosTotales = suma((r) => aNumero(r.ingresos));
  const reembolsado = suma((r) => aNumero(r.reembolsado));
  const aforoTotal = conAforo.reduce((s, e) => s + e.aforo, 0);
  const lugaresOcupados = conAforo.reduce((s, e) => s + vendidos(e), 0);
  const cuenta = <T>(lista: T[], f: (x: T) => boolean) => lista.filter(f).length;

  return {
    usuariosTotal: usuarios.length,
    usuariosActivos: cuenta(usuarios, (u) => u.estado === 'ACTIVO'),
    usuariosPendientes: cuenta(usuarios, (u) => u.estado === 'PENDIENTE'),
    usuariosBloqueados: cuenta(usuarios, (u) => u.estado === 'BLOQUEADO'),
    organizadores: cuenta(usuarios, (u) => u.roles.includes('ORGANIZADOR')),
    validadores: cuenta(usuarios, (u) => u.roles.includes('VALIDADOR')),
    administradores: cuenta(usuarios, (u) => u.roles.includes('ADMIN')),
    eventosTotal: eventos.length,
    eventosPublicados: cuenta(eventos, (e) => e.estado === 'PUBLICADO'),
    eventosBorrador: cuenta(eventos, (e) => e.estado === 'BORRADOR'),
    eventosRealizados: cuenta(eventos, (e) => e.estado === 'REALIZADO'),
    eventosCancelados: cuenta(eventos, (e) => e.estado === 'CANCELADO'),
    eventosGratuitos: cuenta(eventos, (e) => !e.esDePago),
    eventosDePago: cuenta(eventos, (e) => e.esDePago),
    eventosPorCategoria,
    eventosPorMes,
    boletosEmitidos,
    accesosValidados,
    boletosCancelados: suma((r) => r.boletosCancelados),
    aforoTotal,
    lugaresOcupados,
    ingresosTotales,
    reembolsado,
    ingresosPorEvento,
    ocupacionPorEvento,
    ocupacionGlobal: aforoTotal > 0 ? (lugaresOcupados * 100) / aforoTotal : 0,
    asistencia: boletosEmitidos > 0 ? (accesosValidados * 100) / boletosEmitidos : 0,
    ingresosNetos: ingresosTotales - reembolsado,
  };
}
