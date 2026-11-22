"use client";

import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Entrada orquestada: el contenido aparece al entrar en pantalla, con un
 * retraso escalonado por `orden`. Una sola observación por elemento; con
 * `prefers-reduced-motion` la transición dura 0 ms (globals.css) y sin
 * JavaScript nada queda oculto.
 */

interface Props {
  children: ReactNode;
  /** Posición en la secuencia: cada paso agrega 70 ms. */
  orden?: number;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

export function Revelar({ children, orden = 0, as: Etiqueta = "div", className, style }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;
    if (!("IntersectionObserver" in window)) {
      nodo.classList.add("visible");
      return;
    }
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            nodo.classList.add("visible");
            observador.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  return (
    <Etiqueta ref={ref} className={cn("revelar", className)} style={{ ...style, ["--orden" as string]: orden }}>
      {children}
    </Etiqueta>
  );
}

/** Marca el documento como hidratado para que `.revelar` solo oculte contenido cuando hay JavaScript. */
export function MarcaJs() {
  useEffect(() => {
    document.documentElement.classList.add("js");
  }, []);
  return null;
}
