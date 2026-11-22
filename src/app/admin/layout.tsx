import type { ReactNode } from "react";
import { Cascaron } from "@/components/navegacion/Cascaron";
import { TituloPagina } from "@/components/ui/Estados";
import { RUTAS } from "@/lib/rutas";
import { exigirRol } from "@/lib/sesion/servidor";
import { PestanasAdmin } from "@/features/admin/PestanasAdmin";

export default async function LayoutAdmin({ children }: { children: ReactNode }) {
  await exigirRol(["ADMIN"], RUTAS.admin);
  return (
    <Cascaron ancho="normal">
      <TituloPagina titulo="Administración" subtitulo="Resumen, usuarios y eventos de la plataforma" />
      <PestanasAdmin />
      <div className="mt-6">{children}</div>
    </Cascaron>
  );
}
