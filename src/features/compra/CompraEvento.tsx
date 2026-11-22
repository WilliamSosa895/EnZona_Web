"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { CalendarDays, MapPin, Ticket, Users } from "lucide-react";
import type { EventoDto, TipoBoletoDto } from "@/lib/api/tipos";
import { ErrorEnZona, mensajeDeError } from "@/lib/api/errores";
import { cn } from "@/lib/cn";
import { corto } from "@/lib/fecha";
import { importeMxn, precio, totalDe, boletos as textoBoletos } from "@/lib/formato";
import { RUTAS } from "@/lib/rutas";
import { Boton, BotonEnlace } from "@/components/ui/Boton";
import { Dialogo } from "@/components/ui/Dialogo";
import { Aviso, FilaDato } from "@/components/ui/Superficies";
import { BarraCompra } from "@/components/compra/BarraCompra";
import { SelectorCantidad } from "@/components/compra/SelectorCantidad";
import { crearOrden } from "./api";
import { cupoDisponible, estadoDelDetalle, nuevaClaveIdempotencia, tiposElegibles, type EstadoDetalle } from "./reglas";

/*
 * Panel de compra del detalle (RF-09, RF-10, RF-11). Replica el flujo de
 * EventDetailScreen: tipos de boleto, cantidad hasta la disponibilidad real,
 * total = precio × N y una sola acción:
 *  - gratuito: «Confirmar asistencia» abre un diálogo explícito y emite el boleto;
 *  - de pago con asiento: «Elegir N asientos»;
 *  - de pago sin asiento: «Comprar N boletos».
 */

interface Props {
  evento: EventoDto;
  conSesion: boolean;
  /** La persona ya tiene boleto vigente de este evento gratuito (una confirmación por persona). */
  yaTieneBoleto: boolean;
}

export function CompraEvento({ evento, conSesion, yaTieneBoleto }: Props) {
  const router = useRouter();
  const tipos = useMemo(() => tiposElegibles(evento), [evento]);
  const [tipoId, setTipoId] = useState<number | null>(() => (tipos.find((item) => (item.disponibles ?? 0) > 0) ?? tipos[0])?.id ?? null);
  const tipo = tipos.find((item) => item.id === tipoId) ?? null;
  const maximo = cupoDisponible(evento, tipo);
  const [cantidadElegida, setCantidad] = useState(1);
  // Si al cambiar de tipo baja el máximo, la cantidad se revalida a la vista.
  const cantidad = Math.max(1, Math.min(cantidadElegida, Math.max(1, maximo)));
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const [clave, setClave] = useState(() => nuevaClaveIdempotencia());

  const estado = estadoDelDetalle(evento);
  const total = evento.esDePago ? totalDe(tipo?.precio, cantidad) : 0;
  const destinoLogin = `${RUTAS.login}?volver=${encodeURIComponent(RUTAS.evento(evento.id))}`;

  const confirmarGratis = () => {
    setError(null);
    iniciar(async () => {
      try {
        const orden = await crearOrden(
          { eventoId: evento.id, tipoBoletoId: null, cantidad: 1, asientosIds: [], metodo: "GRATIS", tokenPago: null },
          clave,
        );
        const primerBoleto = orden.boletos?.[0];
        router.push(primerBoleto ? RUTAS.boleto(primerBoleto.id) : RUTAS.orden(orden.ordenId));
      } catch (causa) {
        if (causa instanceof ErrorEnZona && causa.codigo === "CONFIRMACION_DUPLICADA") {
          setError("Ya confirmaste tu asistencia a este evento. Revisa Mis boletos.");
        } else {
          setError(mensajeDeError(causa));
        }
        setClave(nuevaClaveIdempotencia());
      }
    });
  };

  const bloqueo = textoBloqueo(estado, yaTieneBoleto, evento);

  return (
    <div className="flex flex-col gap-5">
      {bloqueo ? (
        <Aviso tono={bloqueo.tono}>
          {bloqueo.texto}
          {yaTieneBoleto ? (
            <>
              {" "}
              <a href={RUTAS.misBoletos} className="font-medium underline">
                Ver mis boletos
              </a>
            </>
          ) : null}
        </Aviso>
      ) : null}

      {evento.esDePago && tipos.length > 0 && !bloqueo ? (
        <section aria-labelledby="titulo-tipos" className="flex flex-col gap-3">
          <h2 id="titulo-tipos" className="text-xl font-semibold text-tinta">
            Elige tu boleto
          </h2>
          <div role="radiogroup" aria-label="Tipo de boleto" className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sin-scrollbar lg:mx-0 lg:flex-col lg:px-0">
            {tipos.map((item) => (
              <TarjetaTipo key={item.id} tipo={item} elegido={item.id === tipoId} onElegir={() => setTipoId(item.id)} />
            ))}
          </div>
          {tipos.length > 1 ? (
            <p className="text-[15px] text-gris-texto lg:hidden">Desliza para ver los {tipos.length} tipos de boleto.</p>
          ) : null}
        </section>
      ) : null}

      {evento.esDePago && !bloqueo ? (
        <section aria-labelledby="titulo-cantidad" className="rounded-tarjeta bg-superficie p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 id="titulo-cantidad" className="text-xl font-semibold text-tinta">
                Cantidad de boletos
              </h2>
              <p className="text-[15px] text-gris-texto">
                {maximo > 0 ? `Hasta ${maximo} disponibles` : "Sin disponibilidad para este tipo"}
              </p>
            </div>
            <SelectorCantidad valor={cantidad} maximo={Math.max(1, maximo)} onCambiar={setCantidad} />
          </div>
          <p className="mt-3 text-[15px] text-gris-texto">
            {precio(tipo?.precio)} × {cantidad} = {importeMxn(total)}. Cada boleto tendrá su propio código QR.
          </p>
          {evento.requiereAsiento ? (
            <p className="mt-2 text-[15px] text-gris-texto">
              En el siguiente paso elegirás {cantidad === 1 ? "el asiento" : `los ${cantidad} asientos`} en el plano del recinto.
            </p>
          ) : null}
        </section>
      ) : null}

      {!evento.esDePago && !bloqueo ? (
        <p className="text-[15px] text-gris-texto">
          Confirmar asistencia aparta un lugar a tu nombre y genera tu boleto QR. No hay ningún cobro.
        </p>
      ) : null}

      {error ? <Aviso tono="error">{error}</Aviso> : null}

      <BarraCompra
        resumen={
          bloqueo ? (
            bloqueo.resumen
          ) : evento.esDePago ? (
            <>
              {importeMxn(total)} · {textoBoletos(cantidad)} · total final
            </>
          ) : (
            "Gratis · sin cobro"
          )
        }
        accion={
          bloqueo ? (
            <Boton variante="destacado" tamano="grande" ancho disabled>
              {bloqueo.boton}
            </Boton>
          ) : !conSesion ? (
            <BotonEnlace href={destinoLogin} variante="destacado" tamano="grande" ancho>
              {evento.esDePago ? "Inicia sesión para comprar" : "Inicia sesión para confirmar"}
            </BotonEnlace>
          ) : evento.esDePago ? (
            <BotonEnlace
              href={
                evento.requiereAsiento
                  ? RUTAS.asientos(evento.id, tipoId, cantidad)
                  : RUTAS.pago(evento.id, tipoId, cantidad)
              }
              variante="destacado"
              tamano="grande"
              ancho
            >
              {evento.requiereAsiento
                ? cantidad === 1
                  ? "Elegir asiento"
                  : `Elegir ${cantidad} asientos`
                : cantidad === 1
                  ? "Comprar boleto"
                  : `Comprar ${cantidad} boletos`}
            </BotonEnlace>
          ) : (
            <Boton variante="destacado" tamano="grande" ancho onClick={() => setConfirmando(true)}>
              Confirmar asistencia
            </Boton>
          )
        }
      />

      <Dialogo
        abierto={confirmando}
        onCerrar={() => (enviando ? null : setConfirmando(false))}
        titulo="Confirmar asistencia"
        bloqueado={enviando}
        acciones={
          <>
            <Boton variante="contorno" onClick={() => setConfirmando(false)} disabled={enviando}>
              Cancelar
            </Boton>
            <Boton variante="destacado" onClick={confirmarGratis} cargando={enviando} textoCargando="Confirmando…">
              Confirmar
            </Boton>
          </>
        }
      >
        <p className="text-lg font-semibold text-tinta">{evento.nombre}</p>
        <FilaDato icono={<CalendarDays className="size-5" />} titulo={corto(evento.fechaHoraInicio)} />
        <FilaDato icono={<MapPin className="size-5" />} titulo={evento.lugar} detalle={evento.direccion} />
        <FilaDato
          icono={<Users className="size-5" />}
          titulo={`${evento.disponibles} lugares disponibles`}
          detalle={`Aforo de ${evento.aforo} personas`}
        />
        <p className="flex items-center gap-2 pt-1 text-tinta">
          <Ticket className="size-5 text-coral" aria-hidden="true" />
          Se emitirá un boleto QR a tu nombre. No se realiza ningún cobro.
        </p>
        {error ? <Aviso tono="error">{error}</Aviso> : null}
      </Dialogo>
    </div>
  );
}

function TarjetaTipo({ tipo, elegido, onElegir }: { tipo: TipoBoletoDto; elegido: boolean; onElegir: () => void }) {
  const agotado = (tipo.disponibles ?? 0) <= 0;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={elegido}
      disabled={agotado}
      onClick={onElegir}
      className={cn(
        "flex w-44 shrink-0 cursor-pointer flex-col items-start gap-1 rounded-tarjeta border-2 p-4 text-left transition-colors lg:w-full lg:flex-row lg:items-center lg:justify-between",
        elegido ? "border-marino bg-tinte-50" : "border-transparente bg-superficie hover:bg-superficie-baja",
        agotado && "cursor-not-allowed opacity-60",
      )}
    >
      <span className="flex items-center gap-2 text-lg font-semibold text-tinta">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-5 items-center justify-center rounded-full border-2",
            elegido ? "border-marino" : "border-gris-suave",
          )}
        >
          {elegido ? <span className="size-2.5 rounded-full bg-marino" /> : null}
        </span>
        {tipo.nombre}
      </span>
      <span className="flex flex-col lg:items-end">
        <span className="text-2xl font-bold text-tinta">{precio(tipo.precio)}</span>
        <span className="text-[15px] text-gris-texto">{agotado ? "Agotado" : `${tipo.disponibles} disponibles`}</span>
      </span>
    </button>
  );
}

function textoBloqueo(
  estado: EstadoDetalle,
  yaTieneBoleto: boolean,
  evento: EventoDto,
): { texto: string; resumen: string; boton: string; tono: "info" | "error" | "aviso" } | null {
  switch (estado) {
    case "cancelado":
      return {
        texto: evento.motivoCancelacion
          ? `Este evento fue cancelado. ${evento.motivoCancelacion}`
          : "Este evento fue cancelado. Si tenías boletos, el reembolso está en proceso.",
        resumen: "Evento cancelado",
        boton: "Evento cancelado",
        tono: "error",
      };
    case "realizado":
      return { texto: "Este evento ya se realizó.", resumen: "Evento realizado", boton: "Evento realizado", tono: "info" };
    case "no-publicado":
      return { texto: "Este evento todavía no está publicado.", resumen: "Borrador", boton: "No disponible", tono: "info" };
    case "comenzo":
      return { texto: "Este evento ya comenzó; ya no se venden boletos.", resumen: "Evento en curso", boton: "Ya comenzó", tono: "info" };
    case "agotado":
      return { texto: "Se agotaron los lugares de este evento.", resumen: "Sin lugares", boton: "Agotado", tono: "aviso" };
    default:
      if (yaTieneBoleto && !evento.esDePago) {
        return {
          texto: "Ya tienes un boleto para este evento.",
          resumen: "Ya tienes tu boleto",
          boton: "Asistencia confirmada",
          tono: "info",
        };
      }
      return null;
  }
}
