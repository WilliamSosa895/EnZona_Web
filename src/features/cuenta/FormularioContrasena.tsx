"use client";

import { useActionState, useEffect, useRef } from "react";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Aviso, Tarjeta } from "@/components/ui/Superficies";
import { cambiarContrasena } from "@/features/auth/acciones";

export function FormularioContrasena() {
  const [estado, accion, pendiente] = useActionState(cambiarContrasena, null);
  const formulario = useRef<HTMLFormElement>(null);
  const exito = estado !== null && !estado.error;

  useEffect(() => {
    if (exito) formulario.current?.reset();
  }, [exito]);

  return (
    <Tarjeta className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-tinta">Cambiar contraseña</h2>
      {estado?.error ? <Aviso tono="error">{estado.error}</Aviso> : null}
      {exito ? <Aviso tono="exito">Tu contraseña se actualizó.</Aviso> : null}
      <form ref={formulario} action={accion} className="flex flex-col gap-4" noValidate>
        <Campo etiqueta="Contraseña actual" name="actual" type="password" autoComplete="current-password" required error={estado?.errores?.actual} />
        <Campo
          etiqueta="Contraseña nueva"
          name="nueva"
          type="password"
          autoComplete="new-password"
          required
          ayuda="De 8 a 72 caracteres, con letras y números."
          error={estado?.errores?.nueva}
        />
        <Campo etiqueta="Confirmar contraseña nueva" name="confirmacion" type="password" autoComplete="new-password" required error={estado?.errores?.confirmacion} />
        <Boton type="submit" ancho cargando={pendiente} textoCargando="Guardando…">
          Cambiar contraseña
        </Boton>
      </form>
    </Tarjeta>
  );
}
