"use client";

import dynamic from "next/dynamic";
import type { EventoDto } from "@/lib/api/tipos";
import { Esqueleto } from "@/components/ui/Estados";

/**
 * El validador usa la cámara y el almacenamiento local del dispositivo, así
 * que se renderiza solo en el navegador.
 */
const EscanerInterno = dynamic(() => import("./EscanerInterno").then((modulo) => modulo.EscanerInterno), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Cargando el validador">
      <Esqueleto className="h-14 w-full" />
      <Esqueleto className="h-11 w-40 rounded-pildora" />
      <Esqueleto className="aspect-[3/4] w-full rounded-tarjeta sm:aspect-video" />
    </div>
  ),
});

export function Escaner({ eventos }: { eventos: EventoDto[] }) {
  return <EscanerInterno eventos={eventos} />;
}
