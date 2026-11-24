import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { Cascaron } from "@/components/navegacion/Cascaron";
import { Barra, Indicador } from "@/components/ui/Estados";
import { GuiaDePantalla } from "@/features/guias/GuiaDePantalla";
import { pasosPanel } from "@/features/guias/pasos";
import { Etiqueta, EtiquetaEstadoEvento } from "@/components/ui/Etiquetas";
import { Aviso, Tarjeta } from "@/components/ui/Superficies";
import { ErrorEnZona } from "@/lib/api/errores";
import { corto } from "@/lib/fecha";
import { importe } from "@/lib/formato";
import { RUTAS } from "@/lib/rutas";
import { exigirRol } from "@/lib/sesion/servidor";
import { obtenerEvento, politicaCancelacion, reporteDe, validadoresDe } from "@/features/eventos/api";
import { manifiestoDe } from "@/features/validacion/api-servidor";
import { CancelarEvento, PersonalAcceso, PublicarEvento } from "@/features/organizador/PanelAcciones";

export const metadata: Metadata = { title: "Panel del evento" };

/*
 * Panel del evento (EventStatsScreen, RF-17): indicadores, ocupación del
 * aforo, asistencia en puerta, boletos emitidos (del manifiesto), personal de
 * acceso y cancelación con la política calculada en el servidor (RF-14).
 */
export default async function PaginaPanelEvento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sesion = await exigirRol(["ORGANIZADOR", "ADMIN"], RUTAS.panelEvento(id));

  const evento = await obtenerEvento(id).catch((error: unknown) => {
    if (error instanceof ErrorEnZona && (error.estado === 404 || error.estado === 403)) notFound();
    throw error;
  });
  const esBorrador = evento.estado === "BORRADOR";
  const [reporte, manifiesto, validadores, politica] = await Promise.all([
    esBorrador ? null : reporteDe(evento.id).catch(() => null),
    esBorrador ? null : manifiestoDe(evento.id).catch(() => null),
    validadoresDe(evento.id).catch(() => []),
    politicaCancelacion(evento.id).catch(() => null),
  ]);

  const emitidos = reporte?.boletosEmitidos ?? manifiesto?.boletos?.length ?? 0;
  const validados = reporte?.accesosValidados ?? manifiesto?.boletos?.filter((boleto) => boleto.estado === "USADO").length ?? 0;
  const ocupados = evento.aforo - evento.disponibles;
  const esAdmin = sesion.roles.includes("ADMIN");
  const esDueno = evento.organizadorId === sesion.usuario.id;

  const activo = evento.estado !== "CANCELADO" && evento.estado !== "REALIZADO";

  return (
    <Cascaron ancho="normal">
      <GuiaDePantalla clave="panel_evento" pasos={pasosPanel(evento.estado === "CANCELADO", activo && politica !== null)} />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link href={RUTAS.misEventos} aria-label="Volver a mis eventos" className="flex size-11 items-center justify-center rounded-pildora text-tinta hover:bg-superficie-alta">
            <ArrowLeft className="size-6" />
          </Link>
          <h1 className="text-[2rem] font-bold tracking-tight text-tinta">Panel del evento</h1>
        </div>
        {evento.estado !== "CANCELADO" && evento.estado !== "REALIZADO" ? (
          <Link href={RUTAS.editarEvento(evento.id)} aria-label="Editar evento" data-guia="panel_editar" className="flex size-11 items-center justify-center rounded-pildora text-coral hover:bg-coral-suave">
            <Pencil className="size-6" />
          </Link>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold text-tinta">{evento.nombre}</p>
          <p className="text-[17px] text-gris-texto">
            {evento.lugar} · {corto(evento.fechaHoraInicio)}
          </p>
        </div>
        <EtiquetaEstadoEvento estado={evento.estado} />
      </div>

      {evento.estado === "CANCELADO" ? (
        <Aviso tono="error" className="mt-4" titulo="Evento cancelado">
          {evento.motivoCancelacion ? `Motivo: ${evento.motivoCancelacion}. ` : ""}
          Los boletos quedaron anulados y el reembolso del 100 % a los asistentes está en proceso.
          {reporte?.reembolsado ? ` Reembolsado: ${importe(reporte.reembolsado)}.` : ""}
        </Aviso>
      ) : null}

      {esBorrador ? (
        <div className="mt-4">
          <PublicarEvento eventoId={evento.id} tieneCoordenadas={evento.latitud != null && evento.longitud != null} />
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-3" data-guia="panel_metricas">
            <Indicador valor={emitidos} etiqueta="Asistentes" />
            <Indicador valor={validados} etiqueta="Validados" />
            <Indicador valor={importe(reporte?.ingresos ?? 0).replace(".00", "")} etiqueta="Ingresos" />
          </div>
          <div className="flex flex-col gap-5">
            <Barra valor={ocupados} maximo={evento.aforo} etiqueta="Ocupación del aforo" />
            <Barra valor={validados} maximo={Math.max(emitidos, 1)} etiqueta="Asistencia registrada en puerta" tono="exito" textoDerecha={`${validados} / ${emitidos}`} />
          </div>

          {reporte?.porTipo && reporte.porTipo.length > 0 ? (
            <Tarjeta className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold text-tinta">Por tipo de boleto</h2>
              <ul className="divide-y divide-linea">
                {reporte.porTipo.map((tipo) => (
                  <li key={tipo.tipoBoletoId ?? tipo.nombre} className="flex items-center justify-between gap-3 py-2 text-[15px]">
                    <span className="text-tinta">
                      {tipo.nombre} <span className="text-gris-texto">· {importe(tipo.precio)}</span>
                    </span>
                    <span className="text-gris-texto tabular-nums">
                      {tipo.vendidos ?? 0} vendidos · {tipo.disponibles ?? 0} libres
                    </span>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          ) : null}

          <section aria-labelledby="boletos-emitidos" className="flex flex-col gap-3" data-guia="panel_boletos">
            <h2 id="boletos-emitidos" className="text-xl font-semibold text-tinta">
              Boletos emitidos
            </h2>
            {!manifiesto || !manifiesto.boletos || manifiesto.boletos.length === 0 ? (
              <p className="text-[15px] text-gris-texto">Todavía no se han emitido boletos.</p>
            ) : (
              <ul className="divide-y divide-linea rounded-tarjeta bg-superficie px-5">
                {manifiesto.boletos.map((boleto) => (
                  <li key={boleto.codigo} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[15px] font-semibold text-tinta">{boleto.codigo}</p>
                      <p className="truncate text-[15px] text-gris-texto">
                        {boleto.tipoBoleto ?? "Entrada general"}
                        {boleto.asiento ? ` · ${boleto.asiento}` : ""}
                      </p>
                    </div>
                    {boleto.estado === "USADO" ? (
                      <Etiqueta tono="exito" tamano="pequena">
                        Validado
                      </Etiqueta>
                    ) : (
                      <Etiqueta tono="marino" tamano="pequena">
                        Vigente
                      </Etiqueta>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          {evento.estado !== "CANCELADO" && evento.estado !== "REALIZADO" ? (
            <div data-guia="panel_personal">
              <PersonalAcceso eventoId={evento.id} designados={validadores} />
            </div>
          ) : null}
          {politica && evento.estado !== "CANCELADO" && evento.estado !== "REALIZADO" ? (
            <div data-guia="panel_cancelar">
              <CancelarEvento
                eventoId={evento.id}
                nombre={evento.nombre}
                politica={politica}
                administrativa={esAdmin && !esDueno}
              />
            </div>
          ) : null}
        </aside>
      </div>
    </Cascaron>
  );
}
