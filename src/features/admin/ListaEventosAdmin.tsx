"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ImageOff } from "lucide-react";
import type { EventoDto, PoliticaCancelacionDto } from "@/lib/api/tipos";
import { corto } from "@/lib/fecha";
import { RUTAS } from "@/lib/rutas";
import { Boton } from "@/components/ui/Boton";
import { Dialogo } from "@/components/ui/Dialogo";
import { EstadoVacio } from "@/components/ui/Estados";
import { EtiquetaEstadoEvento, EtiquetaGratis } from "@/components/ui/Etiquetas";
import { Aviso } from "@/components/ui/Superficies";
import { AreaTexto } from "@/components/ui/Campo";
import { cancelarEvento, quitarPortada } from "@/features/organizador/acciones";

/*
 * Eventos (RF-18): todos los eventos en cualquier estado, con cancelación por
 * moderación (motivo obligatorio, reembolso del 100 %, sin comisión) y «Quitar
 * portada» como red de seguridad humana de la moderación de imágenes.
 */

interface Fila {
  evento: EventoDto;
  politica: PoliticaCancelacionDto | null;
}

interface Props {
  eventos: Fila[];
  total: number;
  filtroEstado: string;
  idAdmin: number;
}

export function ListaEventosAdmin({ eventos, total, filtroEstado, idAdmin }: Props) {
  const router = useRouter();
  const ruta = usePathname();
  const [objetivo, setObjetivo] = useState<Fila | null>(null);
  const [motivo, setMotivo] = useState("");
  const [mensaje, setMensaje] = useState<{ tono: "exito" | "error"; texto: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const cancelar = () => {
    if (!objetivo) return;
    setError(null);
    iniciar(async () => {
      const administrativa = objetivo.evento.organizadorId !== idAdmin;
      const resultado = await cancelarEvento(objetivo.evento.id, motivo, administrativa);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setObjetivo(null);
      setMotivo("");
      setMensaje({
        tono: "exito",
        texto: `«${objetivo.evento.nombre}» cancelado por moderación: ${resultado.datos.boletosAnulados ?? 0} boletos anulados, ${resultado.datos.asistentesNotificados ?? 0} personas avisadas.`,
      });
      router.refresh();
    });
  };

  const quitarImagen = (evento: EventoDto) => {
    setMensaje(null);
    iniciar(async () => {
      const resultado = await quitarPortada(evento.id);
      setMensaje(resultado.ok ? { tono: "exito", texto: `Se quitó la portada de «${evento.nombre}».` } : { tono: "error", texto: resultado.error });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-gris-texto">{total === 1 ? "1 evento" : `${total} eventos`}</p>
        <label className="flex items-center gap-2 text-[15px]">
          <span className="sr-only">Filtrar por estado</span>
          <select
            value={filtroEstado}
            onChange={(cambio) => router.replace(cambio.target.value ? `${ruta}?estado=${cambio.target.value}` : ruta)}
            className="h-12 cursor-pointer rounded-pildora border border-gris-suave bg-superficie px-4 text-[15px] outline-none focus:border-profundo"
          >
            <option value="">Todos los estados</option>
            <option value="PUBLICADO">Publicados</option>
            <option value="BORRADOR">Borradores</option>
            <option value="REALIZADO">Realizados</option>
            <option value="CANCELADO">Cancelados</option>
          </select>
        </label>
      </div>
      {mensaje ? <Aviso tono={mensaje.tono}>{mensaje.texto}</Aviso> : null}

      {eventos.length === 0 ? (
        <EstadoVacio titulo="No hay eventos con ese estado" />
      ) : (
        <ul className="divide-y divide-linea rounded-tarjeta bg-superficie">
          {eventos.map(({ evento, politica }) => (
            <li key={evento.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={RUTAS.evento(evento.id)} className="text-[17px] font-medium text-tinta hover:underline">
                    {evento.nombre}
                  </Link>
                  <EtiquetaEstadoEvento estado={evento.estado} />
                  {!evento.esDePago ? <EtiquetaGratis /> : null}
                </div>
                <p className="text-[15px] text-gris-texto">
                  {evento.lugar} · {corto(evento.fechaHoraInicio)} · {evento.aforo - evento.disponibles} de {evento.aforo} lugares
                  {evento.categoria ? ` · ${evento.categoria}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={RUTAS.panelEvento(evento.id)} className="inline-flex h-10 items-center rounded-pildora px-4 text-sm font-medium text-profundo hover:bg-tinte-50">
                  Panel
                </Link>
                {evento.imagenUrl ? (
                  <Boton variante="contorno" tamano="compacto" icono={<ImageOff className="size-4" aria-hidden="true" />} onClick={() => quitarImagen(evento)} disabled={pendiente}>
                    Quitar portada
                  </Boton>
                ) : null}
                {politica?.permitida ? (
                  <Boton variante="peligro" tamano="compacto" onClick={() => setObjetivo({ evento, politica })}>
                    Cancelar
                  </Boton>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialogo
        abierto={objetivo !== null}
        onCerrar={() => {
          setObjetivo(null);
          setMotivo("");
          setError(null);
        }}
        titulo="Cancelar por moderación"
        bloqueado={pendiente}
        acciones={
          <>
            <Boton variante="contorno" onClick={() => setObjetivo(null)} disabled={pendiente}>
              Volver
            </Boton>
            <Boton variante="peligro" onClick={cancelar} disabled={motivo.trim().length < 5} cargando={pendiente} textoCargando="Cancelando…">
              Cancelar evento
            </Boton>
          </>
        }
      >
        <p className="text-lg font-semibold text-tinta">{objetivo?.evento.nombre}</p>
        <p>
          Se anularán {objetivo?.politica?.boletosAfectados ?? 0} boletos, los asistentes recibirán aviso y el reembolso del 100 %. No se cobra comisión al organizador. Se registra quién canceló y por qué.
        </p>
        <AreaTexto etiqueta="Motivo (obligatorio)" value={motivo} onChange={(cambio) => setMotivo(cambio.target.value)} required ayuda="Explica brevemente la causa; el organizador lo verá en su panel." />
        {error ? <Aviso tono="error">{error}</Aviso> : null}
      </Dialogo>
    </div>
  );
}
