import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Barra de compra: en móvil va fija abajo (como en la app), en escritorio se
 * integra al panel lateral. Siempre muestra el total final y una sola acción
 * destacada en coral.
 */
export function BarraCompra({ resumen, accion, className }: { resumen: ReactNode; accion: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "barra-viva fixed inset-x-0 bottom-0 z-20 border-t border-linea bg-superficie px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]",
        "lg:static lg:rounded-tarjeta lg:border lg:p-5",
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 lg:max-w-none">
        <p className="text-[17px] font-semibold text-tinta">{resumen}</p>
        {accion}
      </div>
    </div>
  );
}

/** Espacio que la barra fija ocupa en móvil para que el contenido no quede debajo. */
export function EspacioBarraCompra() {
  return <div aria-hidden="true" className="h-32 lg:hidden" />;
}
