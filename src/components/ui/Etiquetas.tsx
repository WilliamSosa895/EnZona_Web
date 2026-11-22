import type { ReactNode } from "react";
import { Ban, CheckCircle2, Clock, Armchair, Tag, FileEdit, Flag, AlertTriangle } from "lucide-react";
import type { EstadoBoleto, EstadoEvento, EstadoUsuario } from "@/lib/api/tipos";
import { cn } from "@/lib/cn";

/*
 * Etiquetas (`ui/components/Etiquetas.kt`). Cada estado se comunica con color,
 * icono y texto: nunca solo con color. Parejas verificadas de la paleta v2.
 */

export type TonoEtiqueta = "neutro" | "marino" | "coral" | "exito" | "aviso" | "error" | "info";

const TONOS: Record<TonoEtiqueta, string> = {
  neutro: "bg-superficie-alta text-gris-texto",
  marino: "bg-tinte-100 text-marino",
  coral: "bg-coral-suave text-tinta",
  exito: "bg-exito-contenedor text-sobre-exito",
  aviso: "bg-aviso-contenedor text-sobre-aviso",
  error: "bg-error-contenedor text-sobre-error",
  info: "bg-info-contenedor text-sobre-info",
};

interface PropsEtiqueta {
  tono?: TonoEtiqueta;
  icono?: ReactNode;
  children: ReactNode;
  className?: string;
  tamano?: "normal" | "pequena";
}

export function Etiqueta({ tono = "neutro", icono, children, className, tamano = "normal" }: PropsEtiqueta) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pildora font-medium whitespace-nowrap",
        tamano === "normal" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs",
        TONOS[tono],
        className,
      )}
    >
      {icono ? (
        <span aria-hidden="true" className="flex shrink-0 items-center [&>svg]:size-4">
          {icono}
        </span>
      ) : null}
      {children}
    </span>
  );
}

const ESTADOS_BOLETO: Record<EstadoBoleto, { texto: string; tono: TonoEtiqueta; icono: ReactNode }> = {
  VALIDO: { texto: "Válido", tono: "exito", icono: <CheckCircle2 /> },
  USADO: { texto: "Usado", tono: "neutro", icono: <Clock /> },
  CANCELADO: { texto: "Cancelado", tono: "error", icono: <Ban /> },
  EXPIRADO: { texto: "Expirado", tono: "neutro", icono: <Clock /> },
};

export function EtiquetaEstadoBoleto({
  estado,
  eventoCancelado,
  className,
}: {
  estado: EstadoBoleto | undefined;
  eventoCancelado?: boolean;
  className?: string;
}) {
  if (eventoCancelado) {
    return (
      <Etiqueta tono="error" icono={<Ban />} className={className}>
        Evento cancelado · reembolso en proceso
      </Etiqueta>
    );
  }
  const config = ESTADOS_BOLETO[estado ?? "CANCELADO"];
  return (
    <Etiqueta tono={config.tono} icono={config.icono} className={className}>
      {config.texto}
    </Etiqueta>
  );
}

const ESTADOS_EVENTO: Record<EstadoEvento, { texto: string; tono: TonoEtiqueta; icono: ReactNode }> = {
  BORRADOR: { texto: "Borrador", tono: "neutro", icono: <FileEdit /> },
  PUBLICADO: { texto: "Publicado", tono: "exito", icono: <CheckCircle2 /> },
  REALIZADO: { texto: "Realizado", tono: "marino", icono: <Flag /> },
  CANCELADO: { texto: "Cancelado", tono: "error", icono: <Ban /> },
};

export function EtiquetaEstadoEvento({ estado, className }: { estado: EstadoEvento | undefined; className?: string }) {
  const config = ESTADOS_EVENTO[estado ?? "PUBLICADO"];
  return (
    <Etiqueta tono={config.tono} icono={config.icono} className={className}>
      {config.texto}
    </Etiqueta>
  );
}

const ESTADOS_USUARIO: Record<EstadoUsuario, { texto: string; tono: TonoEtiqueta; icono: ReactNode }> = {
  ACTIVO: { texto: "Activa", tono: "exito", icono: <CheckCircle2 /> },
  PENDIENTE: { texto: "Pendiente", tono: "aviso", icono: <AlertTriangle /> },
  BLOQUEADO: { texto: "Bloqueada", tono: "error", icono: <Ban /> },
};

export function EtiquetaEstadoUsuario({ estado }: { estado: EstadoUsuario | undefined }) {
  const config = ESTADOS_USUARIO[estado ?? "ACTIVO"];
  return (
    <Etiqueta tono={config.tono} icono={config.icono}>
      {config.texto}
    </Etiqueta>
  );
}

export function EtiquetaGratis({ className }: { className?: string }) {
  return (
    <Etiqueta tono="coral" className={className}>
      Gratis
    </Etiqueta>
  );
}

export function EtiquetaAgotado() {
  return (
    <Etiqueta tono="error" icono={<Ban />}>
      Agotado
    </Etiqueta>
  );
}

export function EtiquetaAsientos() {
  return (
    <Etiqueta tono="marino" icono={<Armchair />}>
      Asientos numerados
    </Etiqueta>
  );
}

export function EtiquetaCategoria({ nombre }: { nombre: string | null | undefined }) {
  if (!nombre) return null;
  return (
    <Etiqueta tono="info" icono={<Tag />}>
      {nombre}
    </Etiqueta>
  );
}

export const NOMBRES_ROL: Record<string, string> = {
  ASISTENTE: "Asistente",
  ORGANIZADOR: "Organizador",
  VALIDADOR: "Validador",
  ADMIN: "Administrador",
};

export function EtiquetaRol({ rol }: { rol: string }) {
  return (
    <Etiqueta tono="marino" className="border border-gris-suave bg-tinte-100">
      {NOMBRES_ROL[rol] ?? rol}
    </Etiqueta>
  );
}
