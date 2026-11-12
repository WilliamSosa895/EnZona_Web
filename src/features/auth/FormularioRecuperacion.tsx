"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { ArrowLeft, KeyRound } from "lucide-react";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Aviso } from "@/components/ui/Superficies";
import { SEGUNDOS_REENVIO } from "@/lib/capacidades";
import { RUTAS } from "@/lib/rutas";
import { restablecerContrasena, solicitarRecuperacion, type ResultadoAccion } from "./acciones";
import { soloCodigo } from "./validaciones";

/**
 * «¿Olvidaste tu contraseña?»: la API envía un código de 6 dígitos al correo
 * y responde igual exista o no la cuenta, así que la web no confirma qué
 * correos están registrados. El reenvío respeta los 60 s entre códigos.
 */
export function FormularioRecuperacion() {
  const [paso, setPaso] = useState<"correo" | "codigo" | "listo">("correo");
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [segundos, setSegundos] = useState(0);
  const [estadoSolicitud, solicitar, solicitando] = useActionState(
    async (previo: ResultadoAccion | null, datos: FormData) => {
      const resultado = await solicitarRecuperacion(previo, datos);
      if (!resultado.error) {
        setPaso("codigo");
        setSegundos(SEGUNDOS_REENVIO);
      }
      return resultado;
    },
    null,
  );
  const [estadoCambio, restablecer, cambiando] = useActionState(
    async (previo: ResultadoAccion | null, datos: FormData) => {
      const resultado = await restablecerContrasena(previo, datos);
      if (!resultado.error) setPaso("listo");
      return resultado;
    },
    null,
  );
  const [reenviando, iniciarReenvio] = useTransition();
  const [mensajeReenvio, setMensajeReenvio] = useState<string | null>(null);

  useEffect(() => {
    if (segundos <= 0) return;
    const temporizador = setTimeout(() => setSegundos((valor) => valor - 1), 1000);
    return () => clearTimeout(temporizador);
  }, [segundos]);

  if (paso === "listo") {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-exito-contenedor text-sobre-exito">
          <KeyRound className="size-10" aria-hidden="true" />
        </span>
        <h1 className="text-[2rem] font-bold tracking-tight">Contraseña actualizada</h1>
        <p className="text-[17px] text-gris-texto">Inicia sesión con tu contraseña nueva.</p>
        <Link
          href={RUTAS.login}
          className="inline-flex h-boton-principal w-full items-center justify-center rounded-pildora bg-marino px-6 text-base font-medium text-blanco hover:bg-[#182e4b]"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

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
        <h1 className="text-[2rem] font-bold tracking-tight">Recuperar contraseña</h1>
      </div>

      {paso === "correo" ? (
        <>
          <p className="text-[17px] leading-snug text-gris-texto">
            Escribe el correo de tu cuenta. Si existe, te enviaremos un código de 6 dígitos para elegir una contraseña nueva.
          </p>
          {estadoSolicitud?.error ? <Aviso tono="error">{estadoSolicitud.error}</Aviso> : null}
          <form action={solicitar} className="flex flex-col gap-4" noValidate>
            <Campo
              etiqueta="Correo electrónico"
              name="correo"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={correo}
              onChange={(evento) => setCorreo(evento.target.value)}
              error={estadoSolicitud?.errores?.correo}
            />
            <Boton type="submit" tamano="grande" ancho cargando={solicitando} textoCargando="Enviando…">
              Enviar código
            </Boton>
          </form>
        </>
      ) : (
        <>
          <Aviso tono="info">
            Si <span className="font-medium">{correo}</span> tiene cuenta, ya recibió el código (asunto «Restablece tu contraseña de EnZona»). Revisa también el correo no deseado.
          </Aviso>
          {estadoCambio?.error ? <Aviso tono="error">{estadoCambio.error}</Aviso> : null}
          {mensajeReenvio ? <Aviso tono="exito">{mensajeReenvio}</Aviso> : null}
          <form action={restablecer} className="flex flex-col gap-4" noValidate>
            <input type="hidden" name="correo" value={correo} />
            <Campo
              etiqueta="Código de 6 dígitos"
              name="codigo"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={codigo}
              onChange={(evento) => setCodigo(soloCodigo(evento.target.value))}
              required
              error={estadoCambio?.errores?.codigo}
              className="[&_input]:text-center [&_input]:text-2xl [&_input]:tracking-[0.5em] [&_input]:font-semibold"
            />
            <Campo
              etiqueta="Contraseña nueva"
              name="nuevaContrasena"
              type="password"
              autoComplete="new-password"
              required
              ayuda="De 8 a 72 caracteres, con letras y números."
              error={estadoCambio?.errores?.nuevaContrasena}
            />
            <Campo
              etiqueta="Confirmar contraseña nueva"
              name="confirmacion"
              type="password"
              autoComplete="new-password"
              required
              error={estadoCambio?.errores?.confirmacion}
            />
            <Boton type="submit" tamano="grande" ancho cargando={cambiando} textoCargando="Guardando…">
              Cambiar contraseña
            </Boton>
          </form>
          <div className="flex flex-col items-center gap-2">
            <Boton
              variante="texto"
              disabled={segundos > 0}
              cargando={reenviando}
              onClick={() => {
                setMensajeReenvio(null);
                iniciarReenvio(async () => {
                  const datos = new FormData();
                  datos.set("correo", correo);
                  const resultado = await solicitarRecuperacion(null, datos);
                  if (!resultado.error) {
                    setMensajeReenvio("Te enviamos un código nuevo.");
                    setSegundos(SEGUNDOS_REENVIO);
                  }
                });
              }}
            >
              {segundos > 0 ? `Reenviar código (${segundos} s)` : "Reenviar código"}
            </Boton>
          </div>
        </>
      )}
    </div>
  );
}
