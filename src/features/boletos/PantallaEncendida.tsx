"use client";

import { Sun } from "lucide-react";
import { useMantenerPantalla } from "./useMantenerPantalla";

/** Mantiene la pantalla encendida con el boleto a la vista y lo explica en una línea. */
export function PantallaEncendida({ activo }: { activo: boolean }) {
  const encendida = useMantenerPantalla(activo);
  if (!activo) return null;
  return (
    <p className="flex items-center justify-center gap-2 text-center text-sm text-gris-texto">
      <Sun className="size-4" aria-hidden="true" />
      {encendida ? "La pantalla se mantiene encendida mientras muestras el boleto." : "Sube el brillo de tu pantalla al mostrar el boleto en el acceso."}
    </p>
  );
}
