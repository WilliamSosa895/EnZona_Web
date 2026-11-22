"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface PropsDialogo {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
  acciones?: ReactNode;
  /** No se puede cerrar con Escape ni con el fondo (operación en curso). */
  bloqueado?: boolean;
  className?: string;
}

/**
 * Diálogo accesible sobre `<dialog>` nativo: foco atrapado, Escape, fondo
 * oscurecido. Hoja de 28 px como los diálogos Material 3 de la app.
 */
export function Dialogo({ abierto, onCerrar, titulo, children, acciones, bloqueado, className }: PropsDialogo) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialogo-titulo"
      onCancel={(evento) => {
        evento.preventDefault();
        if (!bloqueado) onCerrar();
      }}
      onClick={(evento) => {
        if (bloqueado) return;
        if (evento.target === evento.currentTarget) onCerrar();
      }}
      className={cn(
        "m-auto w-[min(100vw-2rem,32rem)] rounded-hoja bg-superficie p-0 text-tinta shadow-flotante backdrop:bg-tinta/50",
        "open:animate-[aparecer_180ms_ease-out]",
        className,
      )}
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="dialogo-titulo" className="text-xl font-semibold leading-snug">
            {titulo}
          </h2>
          {!bloqueado ? (
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="-mt-1 -mr-2 flex size-10 cursor-pointer items-center justify-center rounded-pildora text-gris-texto hover:bg-superficie-alta"
            >
              <X className="size-5" />
            </button>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-gris-texto">{children}</div>
        {acciones ? <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">{acciones}</div> : null}
      </div>
    </dialog>
  );
}
