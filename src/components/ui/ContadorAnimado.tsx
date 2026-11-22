"use client";

import { useEffect, useRef, useState } from "react";

/*
 * Cifra que sube desde cero hasta su valor cuando entra en pantalla (indicadores
 * del organizador y la administración). Con movimiento reducido muestra el
 * valor final de inmediato. Solo anima números; el formateo lo pone el padre.
 */
export function ContadorAnimado({
  valor,
  duracionMs = 900,
  formatear = (n: number) => Math.round(n).toLocaleString("es-MX"),
}: {
  valor: number;
  duracionMs?: number;
  formatear?: (n: number) => string;
}) {
  const [mostrado, setMostrado] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const animado = useRef(false);

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducido || !("IntersectionObserver" in window)) {
      const cuadro = requestAnimationFrame(() => setMostrado(valor));
      return () => cancelAnimationFrame(cuadro);
    }
    const observador = new IntersectionObserver((entradas) => {
      if (!entradas.some((entrada) => entrada.isIntersecting) || animado.current) return;
      animado.current = true;
      observador.disconnect();
      const inicio = performance.now();
      const paso = (ahora: number) => {
        const t = Math.min(1, (ahora - inicio) / duracionMs);
        const suavizado = 1 - Math.pow(1 - t, 3);
        setMostrado(valor * suavizado);
        if (t < 1) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    });
    observador.observe(nodo);
    return () => observador.disconnect();
  }, [valor, duracionMs]);

  return (
    <span ref={ref} className="tabular-nums">
      {formatear(mostrado)}
    </span>
  );
}
