"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { UserCheck } from "lucide-react";
import type { PoliticaCancelacionDto, ValidadorDto } from "@/lib/api/tipos";
import { importe } from "@/lib/formato";
import { Boton } from "@/components/ui/Boton";
import { AreaTexto, Campo } from "@/components/ui/Campo";
import { Dialogo } from "@/components/ui/Dialogo";
import { Aviso, Tarjeta } from "@/components/ui/Superficies";
import { cancelarEvento, designarValidador, publicarEvento, quitarValidador } from "./acciones";

/*
 * Acciones del panel del evento: designar y quitar personal de acceso
 * (`usuario_rol` + `evento_personal_acceso` en la API), publicar un borrador y
 * cancelar con el diálogo compartido de RF-14.
 */

export function PersonalAcceso({ eventoId, designados }: { eventoId: number; designados: ValidadorDto[] }) {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [mensaje, setMensaje] = useState<{ tono: "exito" | "error"; texto: string } | null>(null);
  const [pendiente, iniciar] = useTransition();
  const [quitando, setQuitando] = useState<number | null>(null);

  const designar = () => {
    setMensaje(null);
    iniciar(async () => {
      const resultado = await designarValidador(eventoId, correo);
      if (!resultado.ok) {
        setMensaje({ tono: "error", texto: resultado.codigo === "NO_ENCONTRADO" ? "No hay ninguna cuenta registrada con ese correo." : resultado.error });
        return;
      }
      setMensaje({ tono: "exito", texto: `${resultado.datos.nombre} ya puede escanear los boletos de este evento.` });
      setCorreo("");
      router.refresh();
    });
  };

  const quitar = (usuarioId: number) => {
    setMensaje(null);
    setQuitando(usuarioId);
    iniciar(async () => {
      const resultado = await quitarValidador(eventoId, usuarioId);
      setQuitando(null);
      if (!resultado.ok) setMensaje({ tono: "error", texto: resultado.error });
      else router.refresh();
    });
  };

  return (
    <Tarjeta className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-tinta">
        <UserCheck className="size-6 text-coral" aria-hidden="true" />
        Personal de acceso
      </h2>
      <p className="text-[15px] text-gris-texto">
        Quien designes podrá escanear los códigos QR de este evento en la puerta, desde su propia cuenta.
      </p>
      {mensaje ? <Aviso tono={mensaje.tono}>{mensaje.texto}</Aviso> : null}
      <form
        className="flex flex-col gap-3"
        onSubmit={(evento) => {
          evento.preventDefault();
          designar();
        }}
      >
        <Campo etiqueta="Correo de la persona" etiquetaOculta type="email" placeholder="Correo de la persona" value={correo} onChange={(evento) => setCorreo(evento.target.value)} autoComplete="off" />
        <Boton type="submit" ancho disabled={!correo.includes("@")} cargando={pendiente && quitando === null} textoCargando="Designando…">
          Designar como validador
        </Boton>
      </form>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-gris-texto">Designados</p>
        {designados.length === 0 ? (
          <p className="text-[15px] text-gris-texto">Nadie todavía.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-linea">
            {designados.map((persona) => (
              <li key={persona.usuarioId} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[17px] text-tinta">{persona.nombre}</p>
                  <p className="truncate text-[15px] text-gris-texto">{persona.correo}</p>
                </div>
                <Boton variante="peligro" tamano="compacto" className="border-transparente" onClick={() => quitar(persona.usuarioId)} cargando={quitando === persona.usuarioId}>
                  Quitar
                </Boton>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Tarjeta>
  );
}

export function PublicarEvento({ eventoId, tieneCoordenadas }: { eventoId: number; tieneCoordenadas: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  return (
    <Aviso
      tono="aviso"
      titulo="Este evento es un borrador"
      accion={
        <div className="flex flex-col gap-2">
          {error ? <p className="text-error">{error}</p> : null}
          <Boton
            variante="destacado"
            tamano="compacto"
            disabled={!tieneCoordenadas}
            cargando={pendiente}
            textoCargando="Publicando…"
            onClick={() =>
              iniciar(async () => {
                const resultado = await publicarEvento(eventoId);
                if (!resultado.ok) setError(resultado.error);
                else router.refresh();
              })
            }
          >
            Publicar ahora
          </Boton>
        </div>
      }
    >
      {tieneCoordenadas
        ? "Los asistentes no lo ven todavía. Publícalo cuando esté listo."
        : "Para publicarlo primero fija la ubicación en el mapa desde «Editar»."}
    </Aviso>
  );
}

export function CancelarEvento({
  eventoId,
  nombre,
  politica,
  administrativa,
}: {
  eventoId: number;
  nombre: string;
  politica: PoliticaCancelacionDto;
  administrativa: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const requiereMotivo = administrativa || politica.tipo === "ADMINISTRATIVA";
  const conVentas = politica.tipo === "DE_PAGO_CON_VENTAS";

  const confirmar = () => {
    setError(null);
    iniciar(async () => {
      const resultado = await cancelarEvento(eventoId, requiereMotivo ? motivo : null, administrativa);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setAbierto(false);
      router.refresh();
    });
  };

  return (
    <>
      <Tarjeta className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-tinta">Cancelar evento</h2>
        <p className="text-[15px] text-gris-texto">
          {politica.permitida
            ? "Solo se puede cancelar antes del inicio. Los asistentes reciben aviso por correo y, si pagaron, el reembolso del 100 %."
            : (politica.motivoBloqueo ?? "Este evento ya no se puede cancelar.")}
        </p>
        <Boton variante="peligro" ancho disabled={!politica.permitida} onClick={() => setAbierto(true)}>
          Cancelar evento
        </Boton>
      </Tarjeta>
      <Dialogo
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo={administrativa ? "Cancelar por moderación" : "¿Cancelar este evento?"}
        bloqueado={pendiente}
        acciones={
          <>
            <Boton variante="contorno" onClick={() => setAbierto(false)} disabled={pendiente}>
              Volver
            </Boton>
            <Boton variante="peligro" onClick={confirmar} disabled={requiereMotivo && motivo.trim().length < 5} cargando={pendiente} textoCargando="Cancelando…">
              {conVentas ? "Cancelar y reembolsar" : "Cancelar evento"}
            </Boton>
          </>
        }
      >
        <p className="text-lg font-semibold text-tinta">{nombre}</p>
        <ul className="flex flex-col gap-1.5">
          <li>
            {politica.boletosAfectados ?? 0} {politica.boletosAfectados === 1 ? "boleto quedará anulado" : "boletos quedarán anulados"} y sus titulares recibirán un aviso por correo.
          </li>
          {conVentas ? (
            <>
              <li>
                Importe cobrado: <span className="font-medium text-tinta">{importe(politica.importeCobrado)}</span>. Se reembolsa el 100 % (
                {importe(politica.reembolso)}) a los asistentes.
              </li>
              <li>
                Comisión al organizador: <span className="font-medium text-tinta">{importe(politica.comision ?? 0)}</span>.
              </li>
            </>
          ) : politica.tipo === "GRATUITO" ? (
            <li>Es un evento gratuito: no hay cobros que reembolsar.</li>
          ) : politica.tipo === "DE_PAGO_SIN_VENTAS" ? (
            <li>Todavía no hay ventas: no hay nada que reembolsar.</li>
          ) : null}
          <li>Esta acción no se puede deshacer.</li>
        </ul>
        {requiereMotivo ? (
          <AreaTexto etiqueta="Motivo de la cancelación" value={motivo} onChange={(evento) => setMotivo(evento.target.value)} ayuda="Obligatorio para una cancelación administrativa. Se registra junto con quién canceló." required />
        ) : null}
        {error ? <Aviso tono="error">{error}</Aviso> : null}
      </Dialogo>
    </>
  );
}
