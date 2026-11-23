import { Armchair, CalendarDays, MapPin, Ticket } from "lucide-react";
import type { BoletoDto, EventoDto } from "@/lib/api/tipos";
import { cn } from "@/lib/cn";
import { corto } from "@/lib/fecha";
import { boletoKDeN } from "@/lib/formato";
import { EtiquetaEstadoBoleto } from "@/components/ui/Etiquetas";
import { CodigoQr } from "./CodigoQr";

/*
 * Talón del boleto (TicketDetailScreen): mitad superior azul marino con los
 * datos, muescas laterales y línea perforada, y abajo el QR sobre blanco con
 * el código de referencia. Es el elemento más reconocible de EnZona.
 */

interface Props {
  boleto: BoletoDto;
  evento?: EventoDto | null;
  posicion?: { k: number; n: number };
}

export function TalonBoleto({ boleto, evento, posicion }: Props) {
  const eventoCancelado = evento?.estado === "CANCELADO";
  const anulado = eventoCancelado || boleto.estado === "CANCELADO" || boleto.estado === "EXPIRADO";
  const contenido = boleto.contenidoQr ?? `${boleto.codigo}.${boleto.firma ?? ""}`;
  const asiento = boleto.asientoEtiqueta?.split(" · ") ?? [];

  return (
    <article className="talon-vivo mx-auto w-full max-w-md overflow-hidden rounded-tarjeta bg-superficie shadow-tarjeta" aria-label="Tu boleto">
      <div className={cn("relative overflow-hidden bg-marino p-6 text-blanco", !anulado && "franja-luz")}>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[15px]">
            <Ticket className="size-5 text-coral" aria-hidden="true" />
            {posicion ? boletoKDeN(posicion.k, posicion.n) : "Boleto"}
          </span>
          <EtiquetaEstadoBoleto estado={boleto.estado} eventoCancelado={eventoCancelado} className={boleto.estado === "VALIDO" && !anulado ? "latido-exito" : undefined} />
        </div>
        <h2 className="mt-3 text-2xl leading-tight font-bold">{evento?.nombre ?? boleto.eventoNombre ?? "Evento"}</h2>
        <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex gap-3">
            <CalendarDays className="mt-0.5 size-5 shrink-0 text-blanco/80" aria-hidden="true" />
            <div>
              <dt className="text-sm text-blanco/75">Fecha</dt>
              <dd className="text-[17px]">{corto(evento?.fechaHoraInicio ?? boleto.fechaHoraInicio)}</dd>
            </div>
          </div>
          <div className="flex gap-3">
            <MapPin className="mt-0.5 size-5 shrink-0 text-blanco/80" aria-hidden="true" />
            <div>
              <dt className="text-sm text-blanco/75">Lugar</dt>
              <dd className="text-[17px]">{evento?.lugar ?? boleto.lugar ?? ""}</dd>
            </div>
          </div>
          <div className="flex gap-3">
            <Ticket className="mt-0.5 size-5 shrink-0 text-blanco/80" aria-hidden="true" />
            <div>
              <dt className="text-sm text-blanco/75">Tipo</dt>
              <dd className="text-[17px]">{boleto.tipoNombre ?? "Entrada general"}</dd>
            </div>
          </div>
          {boleto.asientoEtiqueta ? (
            <div className="flex gap-3">
              <Armchair className="mt-0.5 size-5 shrink-0 text-blanco/80" aria-hidden="true" />
              <div>
                <dt className="text-sm text-blanco/75">Asiento</dt>
                <dd className="text-[17px]">
                  {asiento[0]}
                  {asiento.length > 1 ? (
                    <>
                      <br />
                      {asiento.slice(1).join(" · ").replace("Asiento ", "")}
                    </>
                  ) : null}
                </dd>
              </div>
            </div>
          ) : null}
        </dl>
      </div>

      {/* Muescas y perforación */}
      <div className="relative h-0">
        <span aria-hidden="true" className="absolute -top-3 -left-3 size-6 rounded-full bg-fondo" />
        <span aria-hidden="true" className="absolute -top-3 -right-3 size-6 rounded-full bg-fondo" />
      </div>
      <div aria-hidden="true" className="mx-6 border-t-2 border-dashed border-linea" />

      <div className="flex flex-col items-center gap-3 px-6 pt-6 pb-7">
        <div className="qr-vivo" data-guia="boleto_qr">
          <CodigoQr contenido={contenido} anulado={anulado} />
        </div>
        <p className="font-mono text-xl font-semibold tracking-wider text-tinta">{boleto.codigo}</p>
        <p className="text-sm text-gris-texto">Código de referencia</p>
      </div>
    </article>
  );
}

/** Mensaje bajo el talón según el estado (misma redacción que la app). */
export function textoEstadoBoleto(boleto: BoletoDto, evento?: EventoDto | null): { tono: "exito" | "info" | "error"; texto: string } {
  if (evento?.estado === "CANCELADO") {
    return { tono: "error", texto: "El evento fue cancelado. Tu reembolso está en proceso; no hace falta que hagas nada." };
  }
  switch (boleto.estado) {
    case "VALIDO":
      return { tono: "exito", texto: "Boleto válido, de un solo uso. Muestra el QR en el acceso." };
    case "USADO":
      return { tono: "info", texto: `Boleto utilizado${boleto.fechaUso ? ` el ${corto(boleto.fechaUso)}` : ""}. Ya no da acceso.` };
    case "EXPIRADO":
      return { tono: "info", texto: "El evento ya pasó; este boleto expiró." };
    default:
      return { tono: "error", texto: "Este boleto fue cancelado." };
  }
}

/** Cuerpo del correo para «Enviar con mi app de correo»: la web no envía correos por sí misma. */
export function enlaceCorreo(boleto: BoletoDto, evento?: EventoDto | null): string {
  const asunto = `Tu boleto EnZona: ${evento?.nombre ?? boleto.eventoNombre ?? "evento"}`;
  const cuerpo = [
    `Evento: ${evento?.nombre ?? boleto.eventoNombre ?? ""}`,
    `Fecha: ${corto(evento?.fechaHoraInicio ?? boleto.fechaHoraInicio)}`,
    `Lugar: ${evento?.lugar ?? boleto.lugar ?? ""}`,
    `Tipo: ${boleto.tipoNombre ?? "Entrada general"}`,
    boleto.asientoEtiqueta ? `Asiento: ${boleto.asientoEtiqueta}` : null,
    `Código: ${boleto.codigo}`,
    `Contenido del QR: ${boleto.contenidoQr ?? ""}`,
    "",
    "Muestra este código en el acceso. Es de un solo uso.",
  ]
    .filter((linea) => linea !== null)
    .join("\n");
  return `mailto:?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}
