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
import { Pago } from "@/features/compra/Pago";
import { cupoDisponible, parsearAsientos, parsearCantidad, parsearTipo, tiposElegibles } from "@/features/compra/reglas";

export const metadata: Metadata = { title: "Pago" };

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tipo?: string; cantidad?: string; asientos?: string }>;
}

export default async function PaginaPago({ params, searchParams }: Props) {
  const [{ id }, consulta] = await Promise.all([params, searchParams]);
  const idsAsientos = parsearAsientos(consulta.asientos);
  await exigirSesion(RUTAS.pago(id, consulta.tipo ?? 0, Number(consulta.cantidad ?? 1), idsAsientos));

  const evento = await obtenerEvento(id).catch((error: unknown) => {
    if (error instanceof ErrorEnZona && error.estado === 404) notFound();
    throw error;
  });
  if (!evento.esDePago) redirect(RUTAS.evento(evento.id));

  const tipos = tiposElegibles(evento);
  const tipo = tipos.find((item) => item.id === parsearTipo(consulta.tipo)) ?? tipos[0] ?? null;
  const cantidad = parsearCantidad(consulta.cantidad, cupoDisponible(evento, tipo));

  let asientos: Awaited<ReturnType<typeof asientosDe>> = [];
  if (evento.requiereAsiento) {
    if (idsAsientos.length !== cantidad) redirect(RUTAS.asientos(evento.id, tipo?.id ?? null, cantidad));
    const plano = await asientosDe(evento.id);
    asientos = idsAsientos.map((asientoId) => plano.find((asiento) => asiento.id === asientoId)).filter(Boolean) as typeof plano;
    if (asientos.length !== cantidad) redirect(RUTAS.asientos(evento.id, tipo?.id ?? null, cantidad));
  }

  const volver = evento.requiereAsiento ? RUTAS.asientos(evento.id, tipo?.id ?? null, cantidad) : RUTAS.evento(evento.id);

  return (
    <Cascaron sinBarraInferior ancho="normal">
      <div className="mb-4 flex items-center gap-2">
        <Link href={volver} aria-label="Volver" className="flex size-11 items-center justify-center rounded-pildora text-tinta hover:bg-superficie-alta">
          <ArrowLeft className="size-6" />
        </Link>
        <h1 className="text-[2rem] font-bold tracking-tight text-tinta">Pago</h1>
      </div>
      <Pago evento={evento} tipo={tipo} cantidad={cantidad} asientos={asientos} />
      <EspacioBarraCompra />
    </Cascaron>
  );
}
