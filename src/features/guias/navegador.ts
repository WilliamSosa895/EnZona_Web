import type { AlmacenGuias } from "./guias";

/** `localStorage` si el navegador lo permite; null en modo privado estricto o sin permiso. */
export function almacenGuias(): AlmacenGuias | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Cuenta con sesión, publicada por el cascarón en `<main data-usuario>`.
 * Sin sesión no hay guías (en la app se guardan por `usuarioId`).
 */
export function usuarioActual(): string | null {
  const valor = document.getElementById("contenido")?.dataset.usuario;
  return valor && valor !== "" ? valor : null;
}

/** Primer elemento visible marcado con `data-guia="clave"` (puede haber uno por tamaño de pantalla). */
export function buscarObjetivo(clave: string): HTMLElement | null {
  const candidatos = document.querySelectorAll<HTMLElement>(`[data-guia="${CSS.escape(clave)}"]`);
  for (const elemento of candidatos) {
    const caja = elemento.getBoundingClientRect();
    if (caja.width > 0 && caja.height > 0) return elemento;
  }
  return null;
}
