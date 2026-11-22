import type { ReactNode } from "react";
import { sesionActual } from "@/lib/sesion/servidor";
import { cn } from "@/lib/cn";
import { BarraInferior, Cabecera } from "./Navegacion";

interface PropsCascaron {
  children: ReactNode;
  /** Sin barra inferior en móvil (flujos con barra de compra fija). */
  sinBarraInferior?: boolean;
  /** Ancho máximo del contenido. */
  ancho?: "normal" | "angosto" | "amplio";
  className?: string;
}

const ANCHOS = { normal: "max-w-6xl", angosto: "max-w-2xl", amplio: "max-w-7xl" };

/**
 * Cascarón de las pantallas con sesión o catálogo: cabecera en escritorio,
 * barra inferior en móvil y espacio reservado para que nada quede oculto.
 */
export async function Cascaron({ children, sinBarraInferior, ancho = "normal", className }: PropsCascaron) {
  const sesion = await sesionActual();
  const roles = sesion?.roles ?? [];
  const accesoPersonal = sesion?.accesoPersonal ?? false;
  return (
    <div className="flex min-h-dvh flex-col">
      <Cabecera roles={roles} accesoPersonal={accesoPersonal} conSesion={sesion !== null} nombre={sesion?.usuario.nombre} />
      <main
        id="contenido"
        tabIndex={-1}
        className={cn(
          "mx-auto w-full flex-1 px-4 pt-4 sm:px-6 md:pt-8",
          ANCHOS[ancho],
          sinBarraInferior ? "pb-8" : "pb-[calc(var(--barra-inferior)+1.5rem)] md:pb-12",
          className,
        )}
      >
        {children}
      </main>
      {sinBarraInferior ? null : (
        <BarraInferior roles={roles} accesoPersonal={accesoPersonal} conSesion={sesion !== null} />
      )}
    </div>
  );
}
