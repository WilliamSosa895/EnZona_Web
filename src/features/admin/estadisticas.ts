import type { EventoDto, ReporteDto, UsuarioDto } from "@/lib/api/tipos";
import { partesEnZona, parsear } from "@/lib/fecha";
import { aNumero } from "@/lib/formato";

/*
 * Resumen de administración (RF-18), función pura equivalente a
 * `calcularEstadisticas` de la app: se arma con la lista de usuarios, la de
 * eventos y el reporte de cada evento que no sea borrador.
 */

export interface EstadisticasAdmin {
  usuarios: number;
  cuentas: { activas: number; pendientes: number; bloqueadas: number };
  porRol: { organizadores: number; validadores: number; administradores: number };
  eventos: number;
  porEstado: { publicados: number; borradores: number; realizados: number; cancelados: number };
  gratuitos: number;
  dePago: number;
  porCategoria: { nombre: string; total: number }[];
  porMes: { etiqueta: string; total: number }[];
  boletosEmitidos: number;
  accesosValidados: number;
  ingresos: number;
  ocupacion: number; // 0 a 100
  ingresosPorEvento: { nombre: string; ingresos: number }[];
  ocupacionPorEvento: { nombre: string; ocupados: number; aforo: number }[];
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function calcularEstadisticas(usuarios: UsuarioDto[], eventos: EventoDto[], reportes: Map<number, ReporteDto | null>): EstadisticasAdmin {
  const cuentas = { activas: 0, pendientes: 0, bloqueadas: 0 };
  const porRol = { organizadores: 0, validadores: 0, administradores: 0 };
  for (const usuario of usuarios) {
    if (usuario.estado === "ACTIVO") cuentas.activas += 1;
    else if (usuario.estado === "PENDIENTE") cuentas.pendientes += 1;
    else if (usuario.estado === "BLOQUEADO") cuentas.bloqueadas += 1;
    const roles = usuario.roles ?? [];
    if (roles.includes("ORGANIZADOR")) porRol.organizadores += 1;
    if (roles.includes("VALIDADOR")) porRol.validadores += 1;
    if (roles.includes("ADMIN")) porRol.administradores += 1;
  }

  const porEstado = { publicados: 0, borradores: 0, realizados: 0, cancelados: 0 };
  let gratuitos = 0;
  let dePago = 0;
  const categorias = new Map<string, number>();
  const meses = new Map<string, { orden: number; total: number }>();
  for (const evento of eventos) {
    switch (evento.estado) {
      case "PUBLICADO":
        porEstado.publicados += 1;
        break;
      case "BORRADOR":
        porEstado.borradores += 1;
        break;
      case "REALIZADO":
        porEstado.realizados += 1;
        break;
      case "CANCELADO":
        porEstado.cancelados += 1;
        break;
    }
    if (evento.esDePago) dePago += 1;
    else gratuitos += 1;
    const categoria = evento.categoria ?? "Sin categoría";
    categorias.set(categoria, (categorias.get(categoria) ?? 0) + 1);
    const fecha = parsear(evento.fechaHoraInicio);
    if (fecha) {
      const partes = partesEnZona(fecha);
      const clave = `${MESES[partes.mes - 1]} ${partes.ano}`;
      const actual = meses.get(clave);
      meses.set(clave, { orden: partes.ano * 12 + partes.mes, total: (actual?.total ?? 0) + 1 });
    }
  }

  let boletosEmitidos = 0;
  let accesosValidados = 0;
  let ingresos = 0;
  let aforoPublicado = 0;
  let ocupadoPublicado = 0;
  const ingresosPorEvento: { nombre: string; ingresos: number }[] = [];
  const ocupacionPorEvento: { nombre: string; ocupados: number; aforo: number }[] = [];
  for (const evento of eventos) {
    const reporte = reportes.get(evento.id);
    if (reporte) {
      boletosEmitidos += reporte.boletosEmitidos ?? 0;
      accesosValidados += reporte.accesosValidados ?? 0;
      const importe = aNumero(reporte.ingresos);
      ingresos += importe;
      if (importe > 0) ingresosPorEvento.push({ nombre: evento.nombre, ingresos: importe });
    }
    if (evento.estado === "PUBLICADO") {
      aforoPublicado += evento.aforo;
      ocupadoPublicado += evento.aforo - evento.disponibles;
      ocupacionPorEvento.push({ nombre: evento.nombre, ocupados: evento.aforo - evento.disponibles, aforo: evento.aforo });
    }
  }

  return {
    usuarios: usuarios.length,
    cuentas,
    porRol,
    eventos: eventos.length,
    porEstado,
    gratuitos,
    dePago,
    porCategoria: [...categorias.entries()].map(([nombre, total]) => ({ nombre, total })).sort((a, b) => b.total - a.total),
    porMes: [...meses.entries()]
      .sort(([, a], [, b]) => a.orden - b.orden)
      .map(([etiqueta, valor]) => ({ etiqueta, total: valor.total })),
    boletosEmitidos,
    accesosValidados,
    ingresos,
    ocupacion: aforoPublicado > 0 ? Math.round((ocupadoPublicado / aforoPublicado) * 100) : 0,
    ingresosPorEvento: ingresosPorEvento.sort((a, b) => b.ingresos - a.ingresos),
    ocupacionPorEvento,
  };
}

/** Pide los reportes de N en N para no saturar la API (la app usa 4 en paralelo). */
export async function enLotes<T, R>(elementos: T[], tamano: number, tarea: (elemento: T) => Promise<R>): Promise<R[]> {
  const resultados: R[] = [];
  for (let indice = 0; indice < elementos.length; indice += tamano) {
    const lote = elementos.slice(indice, indice + tamano);
    resultados.push(...(await Promise.all(lote.map(tarea))));
  }
  return resultados;
}
