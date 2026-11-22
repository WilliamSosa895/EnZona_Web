import type { Metadata } from "next";
import { Cascaron } from "@/components/navegacion/Cascaron";
import { RUTAS } from "@/lib/rutas";
import { exigirSesion } from "@/lib/sesion/servidor";
import { FormularioDatos } from "@/features/cuenta/FormularioDatos";

export const metadata: Metadata = { title: "Editar mis datos" };

export default async function PaginaDatos() {
  const sesion = await exigirSesion(RUTAS.editarDatos);
  return (
    <Cascaron ancho="angosto">
      <FormularioDatos nombre={sesion.usuario.nombre} telefono={sesion.usuario.telefono ?? ""} />
    </Cascaron>
  );
}
