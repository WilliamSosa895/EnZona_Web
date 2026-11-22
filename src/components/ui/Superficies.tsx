import type { HTMLAttributes, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, FlaskConical, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

/*
 * Superficies compartidas (`ui/components/Superficies.kt`): tarjeta blanca de
 * 20 px, aviso con tono, zona de demostración delimitada y filas de dato e
 * importe que usan el detalle, el pago y el boleto.
 */

export function Tarjeta({ className, children, ...resto }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-tarjeta bg-superficie p-5", className)} {...resto}>
      {children}
    </div>
  );
}

export type Tono = "info" | "exito" | "aviso" | "error";

const TONOS: Record<Tono, { caja: string; icono: ReactNode }> = {
  info: {
    caja: "bg-info-contenedor text-sobre-info",
    icono: <Info className="size-5 shrink-0" aria-hidden="true" />,
  },
  exito: {
    caja: "bg-exito-contenedor text-sobre-exito",
    icono: <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />,
  },
  aviso: {
    caja: "bg-aviso-contenedor text-sobre-aviso",
    icono: <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />,
  },
  error: {
    caja: "bg-error-contenedor text-sobre-error",
    icono: <XCircle className="size-5 shrink-0" aria-hidden="true" />,
  },
};

interface PropsAviso {
  tono?: Tono;
  titulo?: string;
  children: ReactNode;
  className?: string;
  accion?: ReactNode;
  /** `alert` para errores que deben anunciarse; `status` para información. */
  rol?: "alert" | "status";
}

export function Aviso({ tono = "info", titulo, children, className, accion, rol }: PropsAviso) {
  const config = TONOS[tono];
  return (
    <div
      role={rol ?? (tono === "error" ? "alert" : "status")}
      className={cn("flex gap-3 rounded-campo px-4 py-3 text-[15px] leading-snug", config.caja, className)}
    >
      <span className="mt-0.5">{config.icono}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {titulo ? <p className="font-semibold">{titulo}</p> : null}
        <div>{children}</div>
        {accion ? <div className="pt-1">{accion}</div> : null}
      </div>
    </div>
  );
}

/** Marco coral punteado que rotula lo que es simulación (pasarela, correo). */
export function ZonaDemostracion({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      aria-label="Zona de demostración"
      className={cn("rounded-tarjeta border border-coral bg-superficie-baja p-4", className)}
    >
      <p className="mb-2 flex items-center gap-2 font-semibold text-coral-oscuro">
        <FlaskConical className="size-5" aria-hidden="true" />
        Zona de demostración
      </p>
      <div className="flex flex-col gap-3 text-[15px] text-gris-texto">{children}</div>
    </section>
  );
}

interface PropsFilaDato {
  icono: ReactNode;
  titulo: ReactNode;
  detalle?: ReactNode;
  className?: string;
  tonoIcono?: "marino" | "claro";
}

/** Fila con icono, texto principal y detalle gris (fecha, sede, cupo). */
export function FilaDato({ icono, titulo, detalle, className, tonoIcono = "marino" }: PropsFilaDato) {
  return (
    <div className={cn("flex items-start gap-4", className)}>
      <span
        aria-hidden="true"
        className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center", tonoIcono === "marino" ? "text-marino" : "text-blanco/85")}
      >
        {icono}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[17px] leading-snug">{titulo}</p>
        {detalle ? <p className="text-[15px] leading-snug text-gris-texto">{detalle}</p> : null}
      </div>
    </div>
  );
}

interface PropsFilaImporte {
  concepto: ReactNode;
  importe: ReactNode;
  destacada?: boolean;
  className?: string;
}

export function FilaImporte({ concepto, importe, destacada, className }: PropsFilaImporte) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4",
        destacada ? "text-xl font-bold text-tinta" : "text-[15px] text-gris-texto",
        className,
      )}
    >
      <span>{concepto}</span>
      <span className={cn("tabular-nums", destacada && "text-2xl")}>{importe}</span>
    </div>
  );
}

/** Separador con guiones como la perforación de un boleto. */
export function Perforacion({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("border-t-2 border-dashed border-linea", className)} />;
}
