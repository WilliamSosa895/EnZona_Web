"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Boton } from "@/components/ui/Boton";
import { Campo, Casilla } from "@/components/ui/Campo";
import { Aviso } from "@/components/ui/Superficies";
import { RUTAS } from "@/lib/rutas";
import { registrar } from "./acciones";

/**
 * Registro (RF-01): nombre, correo, CURP, contraseña y aviso de privacidad
 * (LFPDPPP). Sin teléfono: la API envía el código por correo y no hay SMS.
 */
export function FormularioRegistro() {
  const [estado, accion, pendiente] = useActionState(registrar, null);
  const [acepta, setAcepta] = useState(false);
  const [organizador, setOrganizador] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href={RUTAS.login}
          aria-label="Volver al acceso"
          className="flex size-11 items-center justify-center rounded-pildora text-tinta hover:bg-superficie-alta"
        >
          <ArrowLeft className="size-6" />
        </Link>
        <h1 className="text-[2rem] font-bold tracking-tight">Crear cuenta</h1>
      </div>
      <p className="text-[17px] leading-snug text-gris-texto">
        Tu CURP se usa como dato de verificación de identidad y se almacena cifrado, conforme a la LFPDPPP.
      </p>

      {estado?.error ? <Aviso tono="error">{estado.error}</Aviso> : null}

      <form action={accion} className="flex flex-col gap-4" noValidate>
        <Campo
          etiqueta="Nombre completo"
          name="nombre"
          autoComplete="name"
          required
          maxLength={120}
          error={estado?.errores?.nombre}
        />
        <Campo
          etiqueta="Correo electrónico"
          name="correo"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          ayuda="Te enviaremos un código de verificación a este correo."
          error={estado?.errores?.correo}
        />
        <Campo
          etiqueta="CURP"
          name="curp"
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={18}
          required
          ayuda="18 caracteres. Ejemplo: ASIS020404MVZSNN09"
          error={estado?.errores?.curp}
          className="[&_input]:uppercase"
        />
        <Campo
          etiqueta="Contraseña"
          name="contrasena"
          type="password"
          autoComplete="new-password"
          required
          ayuda="De 8 a 72 caracteres, con letras y números."
          error={estado?.errores?.contrasena}
        />
        <Campo
          etiqueta="Confirmar contraseña"
          name="confirmacion"
          type="password"
          autoComplete="new-password"
          required
          error={estado?.errores?.confirmacion}
        />
        <input type="hidden" name="organizador" value={organizador ? "1" : "0"} />
        <Casilla
          etiqueta="Quiero publicar mis propios eventos (rol de organizador)"
          checked={organizador}
          onChange={setOrganizador}
        />
        <input type="hidden" name="aceptaAvisoPrivacidad" value={acepta ? "1" : "0"} />
        <Casilla
          checked={acepta}
          onChange={setAcepta}
          error={estado?.errores?.aceptaAvisoPrivacidad}
          etiqueta={
            <span>
              He leído y acepto el{" "}
              <Link href={RUTAS.privacidad} target="_blank" className="font-medium text-profundo hover:underline">
                aviso de privacidad
              </Link>
              .
            </span>
          }
        />
        <Boton type="submit" tamano="grande" ancho cargando={pendiente} textoCargando="Creando cuenta…" className="mt-2">
          Crear cuenta
        </Boton>
      </form>
    </div>
  );
}
