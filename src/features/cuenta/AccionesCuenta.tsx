"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LogOut, Megaphone } from "lucide-react";
import { Boton } from "@/components/ui/Boton";
import { Dialogo } from "@/components/ui/Dialogo";
import { Aviso, Tarjeta } from "@/components/ui/Superficies";
import { cerrarSesion, convertirseEnOrganizador, dejarDeSerOrganizador } from "@/features/auth/acciones";

/*
 * Rol de organizador (RF-04, v3): «Convertirme en organizador» pide
 * confirmación en un diálogo y muestra el aviso «Ahora eres organizador»;
 * «Dejar de ser organizador» se bloquea con eventos vigentes, si es el único
 * rol o si la cuenta es administradora (la API responde 409 ROL_EN_USO).
 */

interface Props {
  modo: "convertirse" | "dejar";
  motivoBloqueo?: string | null;
}

export function TarjetaRolOrganizador({ modo, motivoBloqueo }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [mensaje, setMensaje] = useState<{ tono: "exito" | "error"; texto: string } | null>(null);
  const [pendiente, iniciar] = useTransition();

  const ejecutar = () => {
    iniciar(async () => {
      const resultado = modo === "convertirse" ? await convertirseEnOrganizador() : await dejarDeSerOrganizador();
      setAbierto(false);
      if (resultado.error) {
        setMensaje({ tono: "error", texto: resultado.error });
        return;
      }
      setMensaje({
        tono: "exito",
        texto: modo === "convertirse" ? "Ahora eres organizador. Ya puedes crear eventos desde «Mis eventos»." : "Dejaste de ser organizador. Conservas tu cuenta de asistente.",
      });
      router.refresh();
    });
  };

  if (modo === "convertirse") {
    return (
      <>
        <Tarjeta className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-xl font-semibold text-tinta">
            <Megaphone className="size-6 text-coral" aria-hidden="true" />
            ¿Quieres publicar tus propios eventos?
          </p>
          <p className="text-[17px] leading-snug text-gris-texto">
            Como organizador puedes crear eventos gratuitos o de pago, definir el aforo y los asientos, y llevar el control de acceso. Sigues conservando tu cuenta de asistente.
          </p>
          {mensaje ? <Aviso tono={mensaje.tono}>{mensaje.texto}</Aviso> : null}
          <Boton variante="destacado" tamano="grande" ancho onClick={() => setAbierto(true)}>
            Convertirme en organizador
          </Boton>
        </Tarjeta>
        <Dialogo
          abierto={abierto}
          onCerrar={() => setAbierto(false)}
          titulo="¿Convertirte en organizador?"
          bloqueado={pendiente}
          acciones={
            <>
              <Boton variante="contorno" onClick={() => setAbierto(false)} disabled={pendiente}>
                Cancelar
              </Boton>
              <Boton variante="destacado" onClick={ejecutar} cargando={pendiente} textoCargando="Activando…">
                Sí, convertirme
              </Boton>
            </>
          }
        >
          <p>Se agregará el rol de organizador a tu cuenta y aparecerá la pestaña «Mis eventos». Podrás dejar el rol después si no tienes eventos vigentes.</p>
        </Dialogo>
      </>
    );
  }

  return (
    <>
      <Tarjeta className="flex flex-col gap-3">
        <p className="text-xl font-semibold text-tinta">Rol de organizador</p>
        <p className="text-[17px] leading-snug text-gris-texto">
          {motivoBloqueo ?? "Puedes dejar el rol de organizador cuando quieras. Conservas tu cuenta de asistente."}
        </p>
        {mensaje ? <Aviso tono={mensaje.tono}>{mensaje.texto}</Aviso> : null}
        <Boton variante="peligro" onClick={() => setAbierto(true)} disabled={Boolean(motivoBloqueo)}>
          Dejar de ser organizador
        </Boton>
      </Tarjeta>
      <Dialogo
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo="¿Dejar de ser organizador?"
        bloqueado={pendiente}
        acciones={
          <>
            <Boton variante="contorno" onClick={() => setAbierto(false)} disabled={pendiente}>
              Cancelar
            </Boton>
            <Boton variante="peligro" onClick={ejecutar} cargando={pendiente} textoCargando="Quitando…">
              Dejar el rol
            </Boton>
          </>
        }
      >
        <p>Dejarás de ver «Mis eventos» y no podrás crear eventos nuevos. Tus boletos y tu cuenta de asistente no cambian.</p>
      </Dialogo>
    </>
  );
}

export function BotonCerrarSesion() {
  const [pendiente, iniciar] = useTransition();
  return (
    <button
      type="button"
      disabled={pendiente}
      onClick={() => iniciar(async () => cerrarSesion())}
      className="flex w-full cursor-pointer items-center gap-4 rounded-tarjeta bg-superficie px-5 py-4 text-left text-[17px] text-error hover:bg-superficie-baja disabled:cursor-wait disabled:opacity-60"
    >
      <LogOut className="size-6 shrink-0" aria-hidden="true" />
      <span>{pendiente ? "Cerrando sesión…" : "Cerrar sesión"}</span>
    </button>
  );
}
