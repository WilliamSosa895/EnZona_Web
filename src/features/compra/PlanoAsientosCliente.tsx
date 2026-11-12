"use client";

import dynamic from "next/dynamic";
import { Esqueleto } from "@/components/ui/Estados";

/**
 * El plano lee la selección guardada en sessionStorage al iniciar, así que se
 * renderiza solo en el navegador para que servidor y cliente no difieran.
 */
export const PlanoAsientosCliente = dynamic(() => import("./PlanoAsientos").then((modulo) => modulo.PlanoAsientos), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Cargando plano de asientos">
      <Esqueleto className="h-8 w-64" />
      <Esqueleto className="h-6 w-40" />
      <Esqueleto className="h-96 w-full rounded-tarjeta" />
    </div>
  ),
});
