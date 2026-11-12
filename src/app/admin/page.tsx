import type { Metadata } from "next";
import { Indicador } from "@/components/ui/Estados";
import { Tarjeta } from "@/components/ui/Superficies";
import type { ReporteDto } from "@/lib/api/tipos";
import { importe } from "@/lib/formato";
import { reporteDe, todosLosEventos } from "@/features/eventos/api";
import { usuarios as listarUsuarios } from "@/features/admin/api";
import { calcularEstadisticas, enLotes } from "@/features/admin/estadisticas";

export const metadata: Metadata = { title: "Administración" };

/*
 * Resumen (RF-18): indicadores de la plataforma, cuentas por estado, eventos
 * por estado, categoría y mes, ingresos y ocupación por evento. Se calcula con
 * las listas de administración y el reporte de cada evento (de 4 en 4).
 */
export default async function PaginaResumenAdmin() {
  const [cuentas, eventos] = await Promise.all([listarUsuarios(), todosLosEventos()]);
  const conReporte = eventos.elementos.filter((evento) => evento.estado !== "BORRADOR");
  const reportes = await enLotes(conReporte, 4, (evento) => reporteDe(evento.id).catch(() => null as ReporteDto | null));
  const mapa = new Map(conReporte.map((evento, indice) => [evento.id, reportes[indice]]));
  const datos = calcularEstadisticas(cuentas.elementos, eventos.elementos, mapa);
  const totalCuentas = Math.max(1, datos.usuarios);
  const maxMes = Math.max(1, ...datos.porMes.map((mes) => mes.total));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Indicador valor={datos.usuarios} etiqueta="Usuarios" />
        <Indicador valor={datos.eventos} etiqueta="Eventos" />
        <Indicador valor={importe(datos.ingresos)} etiqueta="Ingresos" />
        <Indicador valor={datos.boletosEmitidos} etiqueta="Boletos emitidos" />
        <Indicador valor={datos.accesosValidados} etiqueta="Accesos validados" />
        <Indicador valor={`${datos.ocupacion} %`} etiqueta="Ocupación" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Tarjeta className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-tinta">Cuentas</h2>
          <div className="flex h-3 w-full overflow-hidden rounded-pildora bg-tinte-100" role="img" aria-label={`${datos.cuentas.activas} activas, ${datos.cuentas.pendientes} pendientes, ${datos.cuentas.bloqueadas} bloqueadas`}>
            <span className="bg-sobre-exito" style={{ width: `${(datos.cuentas.activas / totalCuentas) * 100}%` }} />
            <span className="bg-aviso" style={{ width: `${(datos.cuentas.pendientes / totalCuentas) * 100}%` }} />
            <span className="bg-error" style={{ width: `${(datos.cuentas.bloqueadas / totalCuentas) * 100}%` }} />
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[15px]">
            <Leyenda color="bg-sobre-exito" texto={`Activas ${datos.cuentas.activas}`} />
            <Leyenda color="bg-aviso" texto={`Pendientes ${datos.cuentas.pendientes}`} />
            <Leyenda color="bg-error" texto={`Bloqueadas ${datos.cuentas.bloqueadas}`} />
          </ul>
          <p className="text-[15px] text-gris-texto">
            Organizadores {datos.porRol.organizadores} · Validadores {datos.porRol.validadores} · Administradores {datos.porRol.administradores}
          </p>
        </Tarjeta>

        <Tarjeta className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-tinta">Eventos por estado</h2>
          <Barras
            filas={[
              { etiqueta: "Publicados", valor: datos.porEstado.publicados, color: "bg-coral" },
              { etiqueta: "Borradores", valor: datos.porEstado.borradores, color: "bg-gris-suave" },
              { etiqueta: "Realizados", valor: datos.porEstado.realizados, color: "bg-marino" },
              { etiqueta: "Cancelados", valor: datos.porEstado.cancelados, color: "bg-error" },
            ]}
            maximo={Math.max(1, datos.eventos)}
          />
          <p className="text-[15px] text-gris-texto">
            Gratuitos {datos.gratuitos} · De pago {datos.dePago}
          </p>
        </Tarjeta>

        <Tarjeta className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-tinta">Eventos por categoría</h2>
          {datos.porCategoria.length === 0 ? (
            <p className="text-[15px] text-gris-texto">Sin eventos todavía.</p>
          ) : (
            <Barras filas={datos.porCategoria.map((item) => ({ etiqueta: item.nombre, valor: item.total, color: "bg-profundo" }))} maximo={Math.max(1, ...datos.porCategoria.map((item) => item.total))} />
          )}
        </Tarjeta>

        <Tarjeta className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-tinta">Eventos por mes de inicio</h2>
          {datos.porMes.length === 0 ? (
            <p className="text-[15px] text-gris-texto">Sin eventos todavía.</p>
          ) : (
            <div className="flex h-44 items-stretch gap-3" role="img" aria-label={datos.porMes.map((mes) => `${mes.etiqueta}: ${mes.total}`).join(", ")}>
              {datos.porMes.map((mes) => (
                <div key={mes.etiqueta} className="flex h-full flex-1 flex-col items-center gap-1">
                  <span className="text-sm text-gris-texto tabular-nums">{mes.total}</span>
                  <div className="flex w-full flex-1 items-end">
                    <div className="w-full rounded-t-md bg-coral" style={{ height: `${Math.max(6, (mes.total / maxMes) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-gris-texto">{mes.etiqueta}</span>
                </div>
              ))}
            </div>
          )}
        </Tarjeta>

        <Tarjeta className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-tinta">Ingresos por evento</h2>
          {datos.ingresosPorEvento.length === 0 ? (
            <p className="text-[15px] text-gris-texto">Todavía no hay ventas.</p>
          ) : (
            <Barras
              filas={datos.ingresosPorEvento.map((item) => ({ etiqueta: item.nombre, valor: item.ingresos, color: "bg-coral", texto: importe(item.ingresos) }))}
              maximo={Math.max(1, ...datos.ingresosPorEvento.map((item) => item.ingresos))}
            />
          )}
        </Tarjeta>

        <Tarjeta className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-tinta">Ocupación de los publicados</h2>
          {datos.ocupacionPorEvento.length === 0 ? (
            <p className="text-[15px] text-gris-texto">No hay eventos publicados.</p>
          ) : (
            <Barras
              filas={datos.ocupacionPorEvento.map((item) => ({
                etiqueta: item.nombre,
                valor: item.aforo > 0 ? (item.ocupados / item.aforo) * 100 : 0,
                color: "bg-sobre-exito",
                texto: `${item.ocupados} / ${item.aforo}`,
              }))}
              maximo={100}
            />
          )}
        </Tarjeta>
      </div>
    </div>
  );
}

function Leyenda({ color, texto }: { color: string; texto: string }) {
  return (
    <li className="flex items-center gap-2 text-tinta">
      <span aria-hidden="true" className={`size-3 rounded-full ${color}`} />
      {texto}
    </li>
  );
}

function Barras({ filas, maximo }: { filas: { etiqueta: string; valor: number; color: string; texto?: string }[]; maximo: number }) {
  return (
    <dl className="flex flex-col gap-2.5">
      {filas.map((fila) => (
        <div key={fila.etiqueta} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-[15px]">
          <dt className="truncate text-tinta">{fila.etiqueta}</dt>
          <dd className="h-3 overflow-hidden rounded-pildora bg-tinte-100">
            <div className={`h-full rounded-pildora ${fila.color}`} style={{ width: `${Math.min(100, (fila.valor / maximo) * 100)}%` }} />
          </dd>
          <dd className="min-w-8 text-right text-gris-texto tabular-nums">{fila.texto ?? fila.valor}</dd>
        </div>
      ))}
    </dl>
  );
}
