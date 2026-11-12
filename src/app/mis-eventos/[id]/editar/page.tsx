import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Cascaron } from "@/components/navegacion/Cascaron";
import { Aviso } from "@/components/ui/Superficies";
import { urlPortada } from "@/components/eventos/Portada";
import { ErrorEnZona } from "@/lib/api/errores";
import { RUTAS } from "@/lib/rutas";
import { exigirRol } from "@/lib/sesion/servidor";
import { categorias, obtenerEvento } from "@/features/eventos/api";
import { FormularioEvento } from "@/features/organizador/FormularioEvento";

export const metadata: Metadata = { title: "Editar evento" };

export default async function PaginaEditarEvento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirRol(["ORGANIZADOR", "ADMIN"], RUTAS.editarEvento(id));
  const [evento, listaCategorias] = await Promise.all([
    obtenerEvento(id).catch((error: unknown) => {
      if (error instanceof ErrorEnZona && (error.estado === 404 || error.estado === 403)) notFound();
      throw error;
    }),
    categorias().catch(() => []),
  ]);
  if (evento.estado === "CANCELADO" || evento.estado === "REALIZADO") redirect(RUTAS.panelEvento(evento.id));

  return (
    <Cascaron ancho="angosto">
      <div className="mb-6 flex items-center gap-2">
        <Link href={RUTAS.panelEvento(evento.id)} aria-label="Volver al panel" className="flex size-11 items-center justify-center rounded-pildora text-tinta hover:bg-superficie-alta">
          <ArrowLeft className="size-6" />
        </Link>
        <h1 className="text-[2rem] font-bold tracking-tight text-tinta">Editar evento</h1>
      </div>
      {evento.estado === "PUBLICADO" ? (
        <Aviso tono="info" className="mb-6">
          En un evento publicado no cambia la modalidad (de pago o con asientos), el aforo no baja de lo vendido y el precio de un tipo con ventas se conserva (RF-13).
        </Aviso>
      ) : null}
      <FormularioEvento evento={evento} categorias={listaCategorias} portadaActual={urlPortada(evento.imagenUrl)} />
    </Cascaron>
  );
}
