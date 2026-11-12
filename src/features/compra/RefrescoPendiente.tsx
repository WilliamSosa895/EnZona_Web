"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Mientras la orden esté pendiente de la pasarela, la pantalla se actualiza sola cada pocos segundos. */
export function RefrescoPendiente({ activo, cadaMs = 5000 }: { activo: boolean; cadaMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!activo) return;
    const temporizador = setInterval(() => router.refresh(), cadaMs);
    return () => clearInterval(temporizador);
  }, [activo, cadaMs, router]);
  return null;
}
