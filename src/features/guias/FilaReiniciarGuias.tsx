"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { reiniciarGuias } from "./guias";
import { almacenGuias } from "./navegador";

/** Mi cuenta → Ayuda → «Volver a ver las guías» (ProfileScreen). */
export function FilaReiniciarGuias({ usuarioId }: { usuarioId: number }) {
  const [mensaje, setMensaje] = useState<string | null>(null);
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => {
          reiniciarGuias(almacenGuias(), usuarioId);
          setMensaje("Listo: las guías volverán a aparecer al entrar a cada pantalla.");
        }}
        className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left hover:bg-superficie-baja"
      >
        <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center text-gris-texto">
          <Lightbulb className="size-6" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[17px] text-tinta">Volver a ver las guías</span>
          <span className="text-[15px] text-gris-texto">Los recorridos de la primera vez se muestran de nuevo en cada pantalla</span>
        </span>
      </button>
      {mensaje ? (
        <p role="status" className="px-5 pb-4 text-[15px] font-medium text-sobre-exito">
          {mensaje}
        </p>
      ) : null}
    </div>
  );
}
