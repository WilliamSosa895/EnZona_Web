import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Cascaron } from "@/components/navegacion/Cascaron";
import { RUTAS } from "@/lib/rutas";
import { exigirRol } from "@/lib/sesion/servidor";
import { categorias } from "@/features/eventos/api";
import { FormularioEvento } from "@/features/organizador/FormularioEvento";

export const metadata: Metadata = { title: "Nuevo evento" };

export default async function PaginaNuevoEvento() {
  await exigirRol(["ORGANIZADOR", "ADMIN"], RUTAS.nuevoEvento);
  const listaCategorias = await categorias().catch(() => []);
  return (
    <Cascaron ancho="angosto">
      <div className="mb-6 flex items-center gap-2">
        <Link href={RUTAS.misEventos} aria-label="Volver a mis eventos" className="flex size-11 items-center justify-center rounded-pildora text-tinta hover:bg-superficie-alta">
          <ArrowLeft className="size-6" />
        </Link>
        <h1 className="text-[2rem] font-bold tracking-tight text-tinta">Nuevo evento</h1>
      </div>
      <FormularioEvento evento={null} categorias={listaCategorias} portadaActual={null} />
    </Cascaron>
  );
}
