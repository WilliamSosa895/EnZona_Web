"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { MailCheck } from "lucide-react";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Aviso } from "@/components/ui/Superficies";
import { SEGUNDOS_REENVIO } from "@/lib/capacidades";
import { RUTAS } from "@/lib/rutas";
import { reenviarCodigo, verificarCodigo, type ResultadoVerificacion } from "./acciones";
import { soloCodigo } from "./validaciones";

/**
 * Verificación en dos pasos (RF-02): código del correo y, si la cuenta tuviera
 * teléfono, el del teléfono. Cuenta 60 s antes de permitir «Reenviar código»
 * (la API descarta reenvíos más seguidos) y separa el error de reenvío del de
 * verificación, como en OtpScreen.
 */
export function FormularioVerificacion({ correo }: { correo: string }) {
  const [canal, setCanal] = useState<"CORREO" | "TELEFONO">("CORREO");
  const [codigo, setCodigo] = useState("");
  const [estado, accion, pendiente] = useActionState(
    async (previo: ResultadoVerificacion | null, datos: FormData) => {
      const resultado = await verificarCodigo(previo, datos);
      if (resultado.completa === false && resultado.siguienteCanal === "TELEFONO") {
        setCanal("TELEFONO");
        setCodigo("");
      }
      return resultado;
    },
    null,
  );
  const [segundos, setSegundos] = useState(SEGUNDOS_REENVIO);
  const [mensajeReenvio, setMensajeReenvio] = useState<{ tono: "exito" | "error"; texto: string } | null>(null);
  const [reenviando, iniciarReenvio] = useTransition();

  useEffect(() => {
    if (segundos <= 0) return;
    const temporizador = setTimeout(() => setSegundos((valor) => valor - 1), 1000);
    return () => clearTimeout(temporizador);
  }, [segundos]);

  if (estado?.completa) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-exito-contenedor text-sobre-exito">
          <MailCheck className="size-10" aria-hidden="true" />
        </span>
        <h1 className="text-[2rem] font-bold tracking-tight">Cuenta verificada</h1>
        <p className="text-[17px] text-gris-texto">Ya puedes iniciar sesión con tu correo y tu contraseña.</p>
        <Link
          href={RUTAS.login}
          className="inline-flex h-boton-principal w-full items-center justify-center rounded-pildora bg-marino px-6 text-base font-medium text-blanco hover:bg-[#182e4b]"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  const reenviar = () => {
    setMensajeReenvio(null);
    iniciarReenvio(async () => {
      const resultado = await reenviarCodigo(correo, canal);
      if (resultado.error) {
        setMensajeReenvio({ tono: "error", texto: resultado.error });
      } else {
        setMensajeReenvio({ tono: "exito", texto: "Te enviamos un código nuevo. El anterior ya no sirve." });
        setSegundos(SEGUNDOS_REENVIO);
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[2rem] font-bold tracking-tight">Verifica tu cuenta</h1>
        <p className="mt-2 text-[17px] leading-snug text-gris-texto">
          {canal === "CORREO" ? (
            <>
              Enviamos un código de 6 dígitos a <span className="font-medium text-tinta">{correo}</span>. Si no lo ves,
              revisa la carpeta de correo no deseado.
            </>
          ) : (
            <>Ahora escribe el código que enviamos a tu teléfono.</>
          )}
        </p>
      </div>

      {estado?.error ? <Aviso tono="error">{estado.error}</Aviso> : null}
      {mensajeReenvio ? <Aviso tono={mensajeReenvio.tono}>{mensajeReenvio.texto}</Aviso> : null}

      <form action={accion} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="correo" value={correo} />
        <input type="hidden" name="canal" value={canal} />
        <Campo
          etiqueta="Código de verificación"
          name="codigo"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          value={codigo}
          onChange={(evento) => setCodigo(soloCodigo(evento.target.value))}
          required
          error={estado?.errores?.codigo}
          className="[&_input]:text-center [&_input]:text-2xl [&_input]:tracking-[0.5em] [&_input]:font-semibold"
        />
        <Boton
          type="submit"
          tamano="grande"
          ancho
          disabled={codigo.length !== 6}
          cargando={pendiente}
          textoCargando="Verificando…"
        >
          Verificar
        </Boton>
      </form>

      <div className="flex flex-col items-center gap-3 text-center text-[15px]">
        <Boton variante="texto" onClick={reenviar} disabled={segundos > 0} cargando={reenviando}>
          {segundos > 0 ? `Reenviar código (${segundos} s)` : "Reenviar código"}
        </Boton>
        <Link href={RUTAS.login} className="text-gris-texto hover:underline">
          Volver al acceso
        </Link>
      </div>
    </div>
  );
}
