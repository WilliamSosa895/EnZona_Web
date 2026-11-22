import type { ReactNode } from "react";

/** Pantallas sin sesión (acceso, registro, verificación): centradas y sin barra de navegación. */
export default function LayoutPublico({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-8 sm:justify-center sm:py-12">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
