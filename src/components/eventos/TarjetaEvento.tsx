import Link from "next/link";
import { CalendarDays, MapPin, Navigation } from "lucide-react";
import type { EventoDto } from "@/lib/api/tipos";
import { corto } from "@/lib/fecha";
import { distancia, etiquetaPrecio, lugares } from "@/lib/formato";
import { RUTAS } from "@/lib/rutas";
import { EtiquetaAgotado, EtiquetaGratis } from "@/components/ui/Etiquetas";
import { Portada } from "./Portada";

/*
 * Tarjeta del catálogo, como en Inicio de la app: portada con bloque de fecha,
 * nombre, fecha, sede, y abajo el precio (chip «Gratis» coral suave o «Desde $180»
 * en negrita) con los lugares a la derecha. Toda la tarjeta es un enlace.
 */
export function TarjetaEvento({ evento, prioridad }: { evento: EventoDto; prioridad?: boolean }) {
  const agotado = evento.disponibles <= 0;
  return (
    <article className="tarjeta-viva group relative flex flex-col overflow-hidden rounded-tarjeta bg-superficie">
      <Portada
        nombre={evento.nombre}
        categoria={evento.categoria}
        imagenUrl={evento.imagenUrl}
        fechaIso={evento.fechaHoraInicio}
        prioridad={prioridad}
        redondeo="arriba"
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
      />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-xl leading-snug font-semibold text-tinta">
          <Link
            href={RUTAS.evento(evento.id)}
            className="outline-none after:absolute after:inset-0 after:rounded-tarjeta after:content-[''] focus-visible:after:outline-3 focus-visible:after:outline-profundo"
          >
            {evento.nombre}
          </Link>
        </h3>
        <dl className="flex flex-col gap-1.5 text-[15px] text-gris-texto">
          <div className="flex items-center gap-2.5">
            <dt className="sr-only">Fecha</dt>
            <CalendarDays className="size-[18px] shrink-0 text-marino/80" aria-hidden="true" />
            <dd>{corto(evento.fechaHoraInicio)}</dd>
          </div>
          <div className="flex items-center gap-2.5">
            <dt className="sr-only">Lugar</dt>
            <MapPin className="size-[18px] shrink-0 text-marino/80" aria-hidden="true" />
            <dd className="truncate">{evento.lugar}</dd>
          </div>
          {evento.distanciaKm != null ? (
            <div className="flex items-center gap-2.5">
              <dt className="sr-only">Distancia</dt>
              <Navigation className="size-[18px] shrink-0 text-marino/80" aria-hidden="true" />
              <dd>A {distancia(evento.distanciaKm)}</dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          {agotado ? (
            <EtiquetaAgotado />
          ) : evento.esDePago ? (
            <span className="text-xl font-bold text-tinta">{etiquetaPrecio(true, evento.precioDesde)}</span>
          ) : (
            <EtiquetaGratis />
          )}
          <span className="text-[15px] text-gris-texto">{lugares(evento.disponibles)}</span>
        </div>
      </div>
    </article>
  );
}
