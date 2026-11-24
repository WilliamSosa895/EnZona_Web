import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, CalendarRange } from "lucide-react";
import { Cascaron } from "@/components/navegacion/Cascaron";
import { BotonEnlace } from "@/components/ui/Boton";
import { Barra, EstadoVacio, Indicador, TituloPagina } from "@/components/ui/Estados";
import { GuiaDePantalla } from "@/features/guias/GuiaDePantalla";
import { pasosOrganizador } from "@/features/guias/pasos";
import { EtiquetaEstadoEvento } from "@/components/ui/Etiquetas";
import type { EventoDto, ReporteDto } from "@/lib/api/tipos";
import { aNumero, importe } from "@/lib/formato";
import { corto } from "@/lib/fecha";
import { RUTAS } from "@/lib/rutas";
import { exigirRol } from "@/lib/sesion/servidor";
import { misEventos, reporteDe } from "@/features/eventos/api";

export const metadata: Metadata = { title: "Mis eventos" };

/*
 * Mis eventos (OrganizerHomeScreen): indicadores de publicados, asistentes e
 * ingresos y la lista de eventos con su ocupación. Los ingresos y asistentes
 * salen del reporte de cada evento (RF-17), pedidos en paralelo.
 */
export default async function PaginaMisEventos() {
  const sesion = await exigirRol(["ORGANIZADOR", "ADMIN"], RUTAS.misEventos);
  const eventos = await misEventos();
  const reportes = await Promise.all(
    eventos.filter((evento) => evento.estado !== "BORRADOR").map((evento) => reporteDe(evento.id).catch(() => null)),
  );
  const resumen = resumir(eventos, reportes);
  const ordenados = [...eventos].sort((a, b) => new Date(a.fechaHoraInicio).getTime() - new Date(b.fechaHoraInicio).getTime());

  return (
    <Cascaron ancho="normal">
      <TituloPagina
        titulo="Mis eventos"
        subtitulo={sesion.usuario.nombre}
        accion={
          <span data-guia="org_nuevo" className="hidden sm:inline-flex">
            <BotonEnlace href={RUTAS.nuevoEvento} variante="destacado" icono={<CalendarPlus className="size-5" aria-hidden="true" />}>
              Nuevo evento
            </BotonEnlace>
          </span>
        }
      />
      <GuiaDePantalla clave="organizador" pasos={pasosOrganizador(eventos.length > 0)} />
      <div className="mt-6 grid grid-cols-3 gap-3" data-guia="org_metricas">
        <Indicador valor={resumen.publicados} etiqueta="Publicados" />
        <Indicador valor={resumen.asistentes} etiqueta="Asistentes" />
        <Indicador valor={importe(resumen.ingresos).replace(".00", "")} etiqueta="Ingresos" />
      </div>

      {eventos.length === 0 ? (
        <EstadoVacio
          icono={<CalendarRange />}
          titulo="Todavía no tienes eventos"
          descripcion="Crea tu primer evento: puede ser gratuito o de pago, con o sin asientos numerados."
          accion={
            <BotonEnlace href={RUTAS.nuevoEvento} variante="destacado">
              Nuevo evento
            </BotonEnlace>
          }
        />
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {ordenados.map((evento, indice) => (
            <li key={evento.id} data-guia={indice === 0 ? "org_evento" : undefined}>
              <Link href={RUTAS.panelEvento(evento.id)} className="flex flex-col gap-3 rounded-tarjeta bg-superficie p-5 transition-shadow hover:shadow-tarjeta">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xl leading-snug font-semibold text-tinta">{evento.nombre}</p>
                  <EtiquetaEstadoEvento estado={evento.estado} />
                </div>
                <p className="text-[15px] text-gris-texto">
                  {evento.lugar} · {corto(evento.fechaHoraInicio)}
                </p>
                <Barra
                  valor={evento.aforo - evento.disponibles}
                  maximo={evento.aforo}
                  etiqueta=""
                  textoDerecha=""
                />
                <p className="-mt-2 text-[15px] text-gris-texto">
                  {evento.aforo - evento.disponibles} de {evento.aforo} lugares · {evento.disponibles} disponibles
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href={RUTAS.nuevoEvento}
        data-guia="org_nuevo"
        className="fixed right-4 bottom-[calc(var(--barra-inferior)+1rem)] z-20 flex h-14 items-center gap-2 rounded-tarjeta bg-coral px-5 text-[17px] font-medium text-tinta shadow-flotante hover:bg-[#ee5a30] sm:hidden"
      >
        <CalendarPlus className="size-6" aria-hidden="true" />
        Nuevo evento
      </Link>
    </Cascaron>
  );
}

function resumir(eventos: EventoDto[], reportes: (ReporteDto | null)[]) {
  let publicados = 0;
  let asistentes = 0;
  let ingresos = 0;
  for (const evento of eventos) if (evento.estado === "PUBLICADO") publicados += 1;
  for (const reporte of reportes) {
    if (!reporte) continue;
    asistentes += reporte.boletosEmitidos ?? 0;
    ingresos += aNumero(reporte.ingresos);
  }
  return { publicados, asistentes, ingresos };
}
