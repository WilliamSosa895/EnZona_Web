import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ContadorAnimado } from "./ContadorAnimado";

/*
 * Estados de pantalla (`ui/components/Carga.kt` y `Estados.kt`): cargando,
 * vacío con invitación a actuar, e indicador numérico (KPI) coral.
 */

export function IndicadorCarga({ texto = "Cargando…", className }: { texto?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex items-center justify-center gap-3 py-16 text-gris-texto", className)}>
      <span
        aria-hidden="true"
        className="inline-block size-7 animate-spin rounded-full border-[3px] border-tinte-200 border-t-marino"
      />
      <span className="text-[15px]">{texto}</span>
    </div>
  );
}

/** Rectángulo gris que reserva el espacio mientras llegan los datos (evita saltos de layout). */
export function Esqueleto({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-campo bg-superficie-alta", className)} />;
}

interface PropsEstadoVacio {
  icono?: ReactNode;
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
  className?: string;
}

export function EstadoVacio({ icono, titulo, descripcion, accion, className }: PropsEstadoVacio) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-14 text-center", className)}>
      {icono ? (
        <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-tinte-50 text-marino [&>svg]:size-8">
          {icono}
        </span>
      ) : null}
      <p className="text-lg font-semibold text-tinta">{titulo}</p>
      {descripcion ? <p className="max-w-sm text-[15px] text-gris-texto">{descripcion}</p> : null}
      {accion ? <div className="pt-2">{accion}</div> : null}
    </div>
  );
}

interface PropsIndicador {
  valor: ReactNode;
  etiqueta: string;
  className?: string;
}

/** Tarjeta de indicador: número coral grande y etiqueta gris (Mis eventos, Panel, Admin). */
export function Indicador({ valor, etiqueta, className }: PropsIndicador) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-1 rounded-tarjeta bg-superficie px-3 py-5 text-center", className)}>
      <span className="numero-vivo text-2xl font-bold text-coral tabular-nums sm:text-3xl">
        {typeof valor === "number" ? <ContadorAnimado valor={valor} /> : valor}
      </span>
      <span className="text-sm text-gris-texto sm:text-[15px]">{etiqueta}</span>
    </div>
  );
}

interface PropsBarra {
  valor: number;
  maximo: number;
  etiqueta: string;
  tono?: "coral" | "exito" | "marino";
  textoDerecha?: string;
}

const TONOS_BARRA = { coral: "bg-coral", exito: "bg-sobre-exito", marino: "bg-marino" };

/** Barra de progreso con etiqueta y cifra, como «Ocupación del aforo 2 / 50». */
export function Barra({ valor, maximo, etiqueta, tono = "coral", textoDerecha }: PropsBarra) {
  const porcentaje = maximo > 0 ? Math.min(100, Math.round((valor / maximo) * 100)) : 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-[15px]">
        <span className="text-tinta">{etiqueta}</span>
        <span className="text-gris-texto tabular-nums">{textoDerecha ?? `${valor} / ${maximo}`}</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={valor}
        aria-valuemin={0}
        aria-valuemax={maximo}
        aria-label={etiqueta}
        className="relative h-2.5 w-full overflow-hidden rounded-pildora bg-tinte-100"
      >
        <div
          className={cn("h-full rounded-pildora transition-[width] duration-500", TONOS_BARRA[tono])}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}

/** Encabezado de página: título grande y subtítulo gris, alineados a la izquierda como en la app. */
export function TituloPagina({
  titulo,
  subtitulo,
  accion,
  className,
}: {
  titulo: string;
  subtitulo?: ReactNode;
  accion?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="titulo-vivo text-[2rem] leading-tight font-black tracking-tight text-tinta sm:text-[2.75rem]">{titulo}</h1>
        {subtitulo ? <p className="mt-1 text-[17px] text-gris-texto">{subtitulo}</p> : null}
      </div>
      {accion}
    </div>
  );
}
