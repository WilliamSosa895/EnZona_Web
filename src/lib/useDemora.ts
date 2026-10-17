import { useEffect, useState } from 'react';

/** Devuelve el valor después de `ms` sin cambios (búsqueda mientras se escribe sin saturar la API). */
export function useDemora<T>(valor: T, ms = 300): T {
  const [demorado, setDemorado] = useState(valor);
  useEffect(() => {
    const t = window.setTimeout(() => setDemorado(valor), ms);
    return () => window.clearTimeout(t);
  }, [valor, ms]);
  return demorado;
}
