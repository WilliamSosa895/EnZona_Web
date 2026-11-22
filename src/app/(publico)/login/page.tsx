import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sesionActual } from "@/lib/sesion/servidor";
import { RUTAS } from "@/lib/rutas";
import { FormularioAcceso } from "@/features/auth/FormularioAcceso";

export const metadata: Metadata = { title: "Iniciar sesión" };

interface Props {
  searchParams: Promise<{ acceso?: string; volver?: string; mensaje?: string }>;
}

export default async function PaginaLogin({ searchParams }: Props) {
  const parametros = await searchParams;
  const sesion = await sesionActual();
  if (sesion) redirect(parametros.volver?.startsWith("/") ? parametros.volver : RUTAS.inicio);

  return (
    <FormularioAcceso
      accesoPersonal={parametros.acceso === "personal"}
      volver={parametros.volver}
      mensaje={parametros.mensaje}
    />
  );
}
