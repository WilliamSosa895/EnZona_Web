import type { Metadata } from "next";
import Link from "next/link";
import { QrCode, Ticket } from "lucide-react";
import { Cascaron } from "@/components/navegacion/Cascaron";
import { BloqueFecha } from "@/components/eventos/Portada";
import { BotonEnlace } from "@/components/ui/Boton";
import { EstadoVacio, TituloPagina } from "@/components/ui/Estados";
import { EtiquetaEstadoBoleto } from "@/components/ui/Etiquetas";
import type { BoletoDto, EventoDto } from "@/lib/api/tipos";
import { bloque, hora, yaComenzo } from "@/lib/fecha";
import { boletoKDeN } from "@/lib/formato";
import { RUTAS } from "@/lib/rutas";
import { exigirSesion } from "@/lib/sesion/servidor";
import { agruparPorOrden, eventosDeBoletos, misBoletos, posicionEnOrden } from "@/features/boletos/api";

export const metadata: Metadata = { title: "Mis boletos" };

/*
 * Mis boletos (TicketsScreen): «Vigentes» (válidos de eventos que no han
 * pasado ni se cancelaron) y «Anteriores» (usados, cancelados, expirados o de
 * eventos ya realizados). Cada boleto se consulta por separado.
 */
export default async function PaginaMisBoletos() {
  await exigirSesion(RUTAS.misBoletos);
  const boletos = await misBoletos();
  const eventos = await eventosDeBoletos(boletos);
  const grupos = agruparPorOrden(boletos);

  const esVigente = (boleto: BoletoDto) => {
    const evento = eventos.get(boleto.eventoId);
    if (evento?.estado === "CANCELADO") return false;
    if (boleto.estado !== "VALIDO") return false;
    return !yaComenzo(evento?.fechaHoraFin ?? evento?.fechaHoraInicio ?? boleto.fechaHoraInicio);
  };
  const vigentes = boletos.filter(esVigente);
  const anteriores = boletos.filter((boleto) => !esVigente(boleto));

  return (
    <Cascaron ancho="normal">
      <TituloPagina titulo="Mis boletos" />
      {boletos.length === 0 ? (
        <EstadoVacio
          icono={<Ticket />}
          titulo="Todavía no tienes boletos"
          descripcion="Cuando confirmes tu asistencia o compres boletos, aparecerán aquí con su código QR."
          accion={<BotonEnlace href={RUTAS.inicio}>Explorar eventos</BotonEnlace>}
        />
      ) : (
        <div className="mt-6 flex flex-col gap-8">
          <Seccion titulo="Vigentes" boletos={vigentes} eventos={eventos} grupos={grupos} vacio="No tienes boletos vigentes." />
          {anteriores.length > 0 ? (
            <Seccion titulo="Anteriores" boletos={anteriores} eventos={eventos} grupos={grupos} atenuado />
          ) : null}
        </div>
      )}
    </Cascaron>
  );
}

function Seccion({
  titulo,
  boletos,
  eventos,
  grupos,
  vacio,
  atenuado,
}: {
  titulo: string;
  boletos: BoletoDto[];
  eventos: Map<number, EventoDto | null>;
  grupos: Map<number, BoletoDto[]>;
  vacio?: string;
  atenuado?: boolean;
}) {
  return (
    <section aria-labelledby={`seccion-${titulo}`} className="flex flex-col gap-3">
      <h2 id={`seccion-${titulo}`} className="text-xl font-semibold text-gris-texto">
        {titulo} · {boletos.length}
      </h2>
      {boletos.length === 0 ? (
        <p className="text-[15px] text-gris-texto">{vacio}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {boletos.map((boleto) => {
            const evento = eventos.get(boleto.eventoId);
            const posicion = posicionEnOrden(boleto, grupos);
            const fecha = bloque(evento?.fechaHoraInicio ?? boleto.fechaHoraInicio);
            return (
              <li key={boleto.id}>
                <Link
                  href={RUTAS.boleto(boleto.id)}
                  className={`flex items-center gap-4 rounded-tarjeta bg-superficie p-4 transition-shadow hover:shadow-tarjeta ${atenuado ? "opacity-80" : ""}`}
                >
                  <BloqueFecha dia={fecha.dia} mes={fecha.mes} tono="coral" className="h-[4.5rem] min-w-[4.5rem]" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="truncate text-lg font-semibold text-tinta">{evento?.nombre ?? boleto.eventoNombre}</p>
                    {posicion.n > 1 ? <p className="text-[15px] font-medium text-profundo">{boletoKDeN(posicion.k, posicion.n)}</p> : null}
                    <p className="truncate text-[15px] text-gris-texto">
                      {hora(evento?.fechaHoraInicio ?? boleto.fechaHoraInicio)} · {evento?.lugar ?? boleto.lugar}
                    </p>
                    <p className="truncate text-[15px] text-gris-texto">
                      {boleto.tipoNombre ?? "Entrada general"}
                      {boleto.asientoEtiqueta ? ` · ${boleto.asientoEtiqueta}` : ""}
                    </p>
                    <EtiquetaEstadoBoleto estado={boleto.estado} eventoCancelado={evento?.estado === "CANCELADO"} className="mt-1 self-start" />
                  </div>
                  <QrCode className="size-9 shrink-0 text-marino" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
