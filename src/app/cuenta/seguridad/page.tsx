import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleDashed } from "lucide-react";
import { Cascaron } from "@/components/navegacion/Cascaron";
import { Tarjeta } from "@/components/ui/Superficies";
import { RUTAS } from "@/lib/rutas";
import { exigirSesion } from "@/lib/sesion/servidor";
import { FormularioContrasena } from "@/features/cuenta/FormularioContrasena";

export const metadata: Metadata = { title: "Seguridad" };

export default async function PaginaSeguridad() {
  const { usuario } = await exigirSesion(RUTAS.seguridad);
  return (
    <Cascaron ancho="angosto">
      <div className="flex items-center gap-2">
        <Link href={RUTAS.cuenta} aria-label="Volver a mi cuenta" className="flex size-11 items-center justify-center rounded-pildora text-tinta hover:bg-superficie-alta">
          <ArrowLeft className="size-6" />
        </Link>
        <h1 className="text-[2rem] font-bold tracking-tight text-tinta">Seguridad</h1>
      </div>

      <div className="mt-6 flex flex-col gap-6">
        <Tarjeta className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-tinta">Estado de verificación</h2>
          <Verificacion etiqueta="Correo electrónico" verificado={usuario.correoVerificado !== false} />
          <Verificacion
            etiqueta="Teléfono"
            verificado={Boolean(usuario.telefonoVerificado)}
            detalle={usuario.telefono ? undefined : "Sin teléfono registrado"}
          />
          <p className="text-[15px] text-gris-texto">CURP: guardada cifrada en el servidor; nunca se muestra ni viaja a este dispositivo.</p>
        </Tarjeta>
        <FormularioContrasena />
      </div>
    </Cascaron>
  );
}

function Verificacion({ etiqueta, verificado, detalle }: { etiqueta: string; verificado: boolean; detalle?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[17px] text-tinta">{etiqueta}</span>
      <span className={`flex items-center gap-1.5 text-[15px] font-medium ${verificado ? "text-sobre-exito" : "text-gris-texto"}`}>
        {verificado ? <CheckCircle2 className="size-5" aria-hidden="true" /> : <CircleDashed className="size-5" aria-hidden="true" />}
        {detalle ?? (verificado ? "Verificado" : "Pendiente")}
      </span>
    </div>
  );
}
