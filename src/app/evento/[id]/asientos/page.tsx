import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Cascaron } from "@/components/navegacion/Cascaron";
import { EspacioBarraCompra } from "@/components/compra/BarraCompra";
import { ErrorEnZona } from "@/lib/api/errores";
import { RUTAS } from "@/lib/rutas";
import { exigirSesion } from "@/lib/sesion/servidor";
import { asientosDe, obtenerEvento } from "@/features/eventos/api";
import { PlanoAsientosCliente as PlanoAsientos } from "@/features/compra/PlanoAsientosCliente";
import { asientosLibres, cupoDisponible, parsearCantidad, parsearTipo, tiposElegibles } from "@/features/compra/reglas";

export const metadata: Metadata = { title: "Elige tus asientos" };

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tipo?: string; cantidad?: string }>;
}

export default async function PaginaAsientos({ params, searchParams }: Props) {
  const [{ id }, consulta] = await Promise.all([params, searchParams]);
  await exigirSesion(`${RUTAS.evento(id)}/asientos?tipo=${consulta.tipo ?? 0}&cantidad=${consulta.cantidad ?? 1}`);

  const [evento, asientos] = await Promise.all([
    obtenerEvento(id).catch((error: unknown) => {
      if (error instanceof ErrorEnZona && error.estado === 404) notFound();
      throw error;
    }),
    asientosDe(id),
  ]);

  if (!evento.requiereAsiento || !evento.esDePago) redirect(RUTAS.evento(evento.id));

  const tipos = tiposElegibles(evento);
  const tipoId = parsearTipo(consulta.tipo);
  const tipo = tipos.find((item) => item.id === tipoId) ?? tipos[0] ?? null;
  const maximo = cupoDisponible(evento, tipo, asientosLibres(asientos));
  const cantidad = parsearCantidad(consulta.cantidad, maximo);

  return (
    <Cascaron sinBarraInferior ancho="normal">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href={RUTAS.evento(evento.id)}
          aria-label="Volver al evento"
          className="flex size-11 items-center justify-center rounded-pildora text-tinta hover:bg-superficie-alta"
        >
          <ArrowLeft className="size-6" />
        </Link>
        <h1 className="text-[2rem] font-bold tracking-tight text-tinta">
          {cantidad === 1 ? "Elige tu asiento" : `Elige ${cantidad} asientos`}
        </h1>
      </div>
      <PlanoAsientos evento={evento} tipo={tipo} cantidad={cantidad} asientos={asientos} />
      <EspacioBarraCompra />
    </Cascaron>
  );
}
