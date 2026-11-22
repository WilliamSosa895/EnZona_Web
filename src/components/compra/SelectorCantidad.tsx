"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Selector de cantidad de 48 px (`ui/components/Cantidad.kt`): el máximo es la
 * disponibilidad real y nunca se puede superar desde la interfaz.
 */
export function SelectorCantidad({
  valor,
  minimo = 1,
  maximo,
  onCambiar,
  etiqueta = "Cantidad de boletos",
}: {
  valor: number;
  minimo?: number;
  maximo: number;
  onCambiar: (valor: number) => void;
  etiqueta?: string;
}) {
  const puedeBajar = valor > minimo;
  const puedeSubir = valor < maximo;
  return (
    <div className="flex items-center gap-3" role="group" aria-label={etiqueta}>
      <BotonRedondo etiqueta="Quitar un boleto" deshabilitado={!puedeBajar} onClick={() => onCambiar(valor - 1)}>
        <Minus className="size-5" aria-hidden="true" />
      </BotonRedondo>
      <output aria-live="polite" className="min-w-8 text-center text-2xl font-bold text-tinta tabular-nums">
        {valor}
      </output>
      <BotonRedondo etiqueta="Agregar un boleto" deshabilitado={!puedeSubir} onClick={() => onCambiar(valor + 1)}>
        <Plus className="size-5" aria-hidden="true" />
      </BotonRedondo>
    </div>
  );
}

function BotonRedondo({
  etiqueta,
  deshabilitado,
  onClick,
  children,
}: {
  etiqueta: string;
  deshabilitado: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      disabled={deshabilitado}
      onClick={onClick}
      className={cn(
        "flex size-12 cursor-pointer items-center justify-center rounded-full bg-tinte-50 text-marino transition-colors hover:bg-tinte-100 disabled:cursor-not-allowed disabled:text-gris-suave disabled:hover:bg-tinte-50",
      )}
    >
      {children}
    </button>
  );
}
