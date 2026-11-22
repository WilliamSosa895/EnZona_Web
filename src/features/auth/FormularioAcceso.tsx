"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Aviso } from "@/components/ui/Superficies";
import { LogoEnZona } from "@/components/marca/LogoEnZona";
import { RUTAS } from "@/lib/rutas";
import { iniciarSesion } from "./acciones";

interface Props {
  accesoPersonal: boolean;
  volver?: string;
  mensaje?: string;
}

/**
 * Pantalla de acceso, igual que LoginScreen: logo grande, lema, dos campos,
 * botón marino, enlace a registro y el acceso separado para el personal.
 */
export function FormularioAcceso({ accesoPersonal, volver, mensaje }: Props) {
  const [estado, accion, pendiente] = useActionState(iniciarSesion, null);

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-4 pt-4 text-center">
        <LogoEnZona alto={72} />
        <p className="text-lg text-gris-texto">
          {accesoPersonal ? "Acceso para organizadores y personal" : "Descubre y accede a los eventos de tu zona"}
        </p>
      </div>

      {mensaje ? <Aviso tono="exito">{mensaje}</Aviso> : null}
      {estado?.error ? (
        <Aviso tono="error" accion={estado.codigo === "CUENTA_BLOQUEADA" ? null : undefined}>
          {estado.error}
        </Aviso>
      ) : null}

      <form action={accion} className="flex w-full flex-col gap-4" noValidate>
        <input type="hidden" name="accesoPersonal" value={accesoPersonal ? "1" : "0"} />
        {volver ? <input type="hidden" name="volver" value={volver} /> : null}
        <Campo
          etiqueta="Correo, teléfono o CURP"
          etiquetaOculta
          name="identificador"
          placeholder="Correo, teléfono o CURP"
          autoComplete="username"
          autoCapitalize="none"
          required
          error={estado?.errores?.identificador}
        />
        <Campo
          etiqueta="Contraseña"
          etiquetaOculta
          name="contrasena"
          type="password"
          placeholder="Contraseña"
          autoComplete="current-password"
          required
          error={estado?.errores?.contrasena}
        />
        <Boton type="submit" tamano="grande" ancho cargando={pendiente} textoCargando="Entrando…" className="mt-2">
          Iniciar sesión
        </Boton>
      </form>

      <div className="flex flex-col items-center gap-4 text-center text-[15px]">
        <Link href={RUTAS.recuperar} className="font-medium text-profundo hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
        {accesoPersonal ? (
          <Link href={RUTAS.login} className="font-medium text-gris-texto hover:text-tinta hover:underline">
            Acceso para asistentes
          </Link>
        ) : (
          <>
            <Link href={RUTAS.registro} className="font-medium text-profundo hover:underline">
              ¿No tienes cuenta? Regístrate
            </Link>
            <Link href={RUTAS.loginPersonal} className="font-medium text-gris-texto hover:text-tinta hover:underline">
              Acceso para organizadores y personal
            </Link>
          </>
        )}
        <Link href={RUTAS.inicio} className="text-gris-texto hover:underline">
          Explorar eventos sin cuenta
        </Link>
      </div>
    </div>
  );
}
