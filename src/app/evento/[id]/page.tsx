import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, Users } from "lucide-react";
import { Cascaron } from "@/components/navegacion/Cascaron";
import { Portada } from "@/components/eventos/Portada";
import { MapaEvento } from "@/components/eventos/MapaEvento";
import { EtiquetaAsientos, EtiquetaCategoria, EtiquetaGratis } from "@/components/ui/Etiquetas";
import { FilaDato, Tarjeta } from "@/components/ui/Superficies";
import { EspacioBarraCompra } from "@/components/compra/BarraCompra";
import { ErrorEnZona } from "@/lib/api/errores";
import { intervalo } from "@/lib/fecha";
import { RUTAS } from "@/lib/rutas";
import { sesionActual } from "@/lib/sesion/servidor";
import { obtenerEvento } from "@/features/eventos/api";
import { misBoletos } from "@/features/boletos/api";
import { CompraEvento } from "@/features/compra/CompraEvento";
import { textoCupo } from "@/features/compra/reglas";

/*
 * Detalle del evento (RF-05, RF-10, RF-11). Escritorio: dos columnas, con el
 * selector y el total fijos a la derecha. Móvil: una columna y barra de compra
 * fija abajo, como en EventDetailScreen.
 */

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const evento = await obtenerEvento(id);
    return {
      title: evento.nombre,
      description: evento.descripcion?.slice(0, 160) ?? `${evento.nombre} en ${evento.lugar}`,
    };
  } catch {
    return { title: "Evento" };
  }
}

export default async function PaginaEvento({ params }: Props) {
  const { id } = await params;
  const [evento, sesion] = await Promise.all([
    obtenerEvento(id).catch((error: unknown) => {
      if (error instanceof ErrorEnZona && error.estado === 404) notFound();
      throw error;
    }),
    sesionActual(),
  ]);

  // Una confirmación gratuita por persona: si ya tiene boleto vigente se avisa (RF-10).
  const yaTieneBoleto =
    sesion && !evento.esDePago
      ? await misBoletos()
          .then((lista) =>
            lista.some((boleto) => boleto.eventoId === evento.id && (boleto.estado === "VALIDO" || boleto.estado === "USADO")),
          )
          .catch(() => false)
      : false;

  const cupo = textoCupo(evento);
  const tieneCoordenadas = evento.latitud != null && evento.longitud != null;

  return (
    <Cascaron sinBarraInferior ancho="normal">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href={RUTAS.inicio}
          aria-label="Volver a los eventos"
          className="flex size-11 items-center justify-center rounded-pildora text-tinta hover:bg-superficie-alta"
        >
          <ArrowLeft className="size-6" />
        </Link>
        <span className="text-[15px] text-gris-texto">Eventos</span>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <article className="flex flex-col gap-6">
          <Portada
            nombre={evento.nombre}
            categoria={evento.categoria}
            imagenUrl={evento.imagenUrl}
            prioridad
            sizes="(min-width: 1024px) 720px, 100vw"
          />
          <div className="flex flex-col gap-3">
            <h1 className="text-[2rem] leading-tight font-bold tracking-tight text-tinta sm:text-4xl">{evento.nombre}</h1>
            <div className="flex flex-wrap gap-2">
              <EtiquetaCategoria nombre={evento.categoria} />
              {!evento.esDePago ? <EtiquetaGratis /> : null}
              {evento.requiereAsiento ? <EtiquetaAsientos /> : null}
            </div>
          </div>

          <Tarjeta className="flex flex-col gap-5">
            <FilaDato
              icono={<CalendarDays className="size-6" />}
              titulo={intervalo(evento.fechaHoraInicio, evento.fechaHoraFin)}
              detalle={`Hora local del evento (${evento.ciudad ?? "Orizaba"})`}
            />
            <FilaDato icono={<MapPin className="size-6" />} titulo={evento.lugar} detalle={evento.direccion} />
            <FilaDato icono={<Users className="size-6" />} titulo={cupo.titulo} detalle={cupo.detalle} />
          </Tarjeta>

          {tieneCoordenadas ? (
            <MapaEvento
              latitud={evento.latitud!}
              longitud={evento.longitud!}
              nombre={evento.nombre}
              direccion={evento.direccion}
            />
          ) : null}

          {evento.descripcion ? (
            <section aria-labelledby="acerca" className="flex flex-col gap-2">
              <h2 id="acerca" className="text-xl font-semibold text-tinta">
                Acerca del evento
              </h2>
              <p className="max-w-prose text-[17px] leading-relaxed whitespace-pre-line text-gris-texto">{evento.descripcion}</p>
            </section>
          ) : null}
        </article>

        <aside className="lg:sticky lg:top-24">
          <CompraEvento evento={evento} conSesion={sesion !== null} yaTieneBoleto={yaTieneBoleto} />
        </aside>
      </div>
      <EspacioBarraCompra />
    </Cascaron>
  );
}
