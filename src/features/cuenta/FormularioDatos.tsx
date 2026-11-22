"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft } from "lucide-react";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Aviso } from "@/components/ui/Superficies";
import { RUTAS } from "@/lib/rutas";
import { actualizarPerfil } from "@/features/auth/acciones";

export function FormularioDatos({ nombre, telefono }: { nombre: string; telefono: string }) {
  const [estado, accion, pendiente] = useActionState(actualizarPerfil, null);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link href={RUTAS.cuenta} aria-label="Volver a mi cuenta" className="flex size-11 items-center justify-center rounded-pildora text-tinta hover:bg-superficie-alta">
          <ArrowLeft className="size-6" />
        </Link>
        <h1 className="text-[2rem] font-bold tracking-tight text-tinta">Editar mis datos</h1>
      </div>
      <p className="text-[17px] text-gris-texto">
        El correo y la CURP identifican tu cuenta y no se cambian desde aquí. La CURP está guardada cifrada en el servidor.
      </p>
      {estado?.error ? <Aviso tono="error">{estado.error}</Aviso> : null}
      <form action={accion} className="flex flex-col gap-4" noValidate>
        <Campo etiqueta="Nombre completo" name="nombre" defaultValue={nombre} autoComplete="name" required error={estado?.errores?.nombre} />
        <Campo
          etiqueta="Teléfono (opcional)"
          name="telefono"
          type="tel"
          defaultValue={telefono}
          autoComplete="tel"
          inputMode="tel"
          ayuda="10 a 15 dígitos. Un teléfono nuevo queda pendiente de verificar hasta que exista el envío por SMS."
          error={estado?.errores?.telefono}
        />
        <Boton type="submit" tamano="grande" ancho cargando={pendiente} textoCargando="Guardando…">
          Guardar cambios
        </Boton>
      </form>
    </div>
  );
}
