"use client";

import dynamic from "next/dynamic";
import { Navigation } from "lucide-react";
import { BotonEnlace } from "@/components/ui/Boton";
import { Esqueleto } from "@/components/ui/Estados";

/*
 * Miniatura del mapa del detalle (OpenStreetMap con Leaflet, sin clave, como
 * osmdroid en la app) y botón «Cómo llegar». Leaflet se carga solo en el
 * navegador y bajo demanda para no inflar el paquete inicial.
 */

const MapaLeaflet = dynamic(() => import("./MapaLeaflet").then((modulo) => modulo.MapaLeaflet), {
  ssr: false,
  loading: () => <Esqueleto className="aspect-[2/1] w-full rounded-tarjeta" />,
});

interface PropsMapa {
  latitud: number;
  longitud: number;
  nombre: string;
  direccion?: string | null;
}

export function MapaEvento({ latitud, longitud, nombre, direccion }: PropsMapa) {
  const destino = `https://www.openstreetmap.org/?mlat=${latitud}&mlon=${longitud}#map=17/${latitud}/${longitud}`;
  const geo = `geo:${latitud},${longitud}?q=${latitud},${longitud}(${encodeURIComponent(nombre)})`;
  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[2/1] w-full overflow-hidden rounded-tarjeta bg-superficie-alta">
        <MapaLeaflet latitud={latitud} longitud={longitud} nombre={nombre} />
      </div>
      <div className="flex items-center gap-4">
        <BotonEnlace
          href={typeof navigator !== "undefined" && /Android|iPhone|iPad/i.test(navigator.userAgent) ? geo : destino}
          variante="contorno"
          icono={<Navigation className="size-5" aria-hidden="true" />}
          className="flex-1"
        >
          Cómo llegar
        </BotonEnlace>
        <p className="text-sm leading-tight text-gris-texto tabular-nums">
          Lat {latitud.toFixed(5)}
          <br />
          Lon {longitud.toFixed(5)}
        </p>
      </div>
      {direccion ? <p className="sr-only">{direccion}</p> : null}
    </div>
  );
}
