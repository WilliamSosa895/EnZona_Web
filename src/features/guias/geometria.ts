/*
 * Geometría de la guía interactiva (posicionTarjeta y trazarFlecha de ui/components/GuiaInteractiva.kt).
 * Funciones puras, en píxeles de la ventana, para poder probarlas sin navegador.
 */

export interface Punto {
  x: number;
  y: number;
}

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Tamano {
  ancho: number;
  alto: number;
}

/** Flecha curva (Bézier cuadrática) del texto al foco: nace horizontal y llega vertical, como trazada a mano. */
export interface Flecha {
  inicio: Punto;
  control: Punto;
  fin: Punto;
}

const limitar = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));

export const centro = (r: Rect): Punto => ({ x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 });

export const inflar = (r: Rect, margen: number): Rect => ({
  left: r.left - margen,
  top: r.top - margen,
  right: r.right + margen,
  bottom: r.bottom + margen,
});

/**
 * Dónde va el texto: debajo del foco si cabe, si no encima; sin foco, al centro. Siempre dentro de la pantalla.
 * En horizontal se alinea con el foco (en el teléfono queda al margen, como el apunte a mano de Android).
 */
export function posicionTarjeta(
  foco: Rect | null,
  pantalla: Tamano,
  tarjeta: Tamano,
  separacion: number,
  margen: number,
): Punto {
  const xMaxima = pantalla.ancho - tarjeta.ancho - margen;
  if (!foco) {
    return {
      x: Math.max(margen, (pantalla.ancho - tarjeta.ancho) / 2),
      y: Math.max(margen, (pantalla.alto - tarjeta.alto) / 2),
    };
  }
  const x = limitar(foco.left, margen, xMaxima);
  const debajo = foco.bottom + separacion;
  const encima = foco.top - separacion - tarjeta.alto;
  let y: number;
  if (debajo + tarjeta.alto + margen <= pantalla.alto) y = debajo;
  else if (encima >= margen) y = encima;
  // No cabe ni arriba ni abajo (objetivo muy alto): se pega al borde que deje más foco visible.
  else if (centro(foco).y > pantalla.alto / 2) y = margen;
  else y = pantalla.alto - margen - tarjeta.alto;
  return { x, y: Math.max(margen, y) };
}

/**
 * Traza la flecha desde el borde del texto hasta el borde del foco más cercano. Si el foco está debajo del texto,
 * llega a su borde superior; si está arriba, al inferior.
 */
export function trazarFlecha(texto: Rect, foco: Rect, pantalla: Tamano, holgura = 14): Flecha {
  const focoDebajo = foco.top >= texto.bottom;
  const yFin = focoDebajo ? foco.top - holgura : foco.bottom + holgura;
  // Sale por el lado derecho del texto cuando el foco queda a la derecha; si no, baja o sube desde su inicio.
  const haciaLaDerecha = centro(foco).x > texto.right + holgura * 2;
  const inicio: Punto = haciaLaDerecha
    ? { x: texto.right + holgura, y: centro(texto).y }
    : { x: texto.left + holgura * 2, y: focoDebajo ? texto.bottom + holgura : texto.top - holgura };
  const xDeseada = haciaLaDerecha ? centro(foco).x : Math.max(inicio.x + holgura * 7, foco.left + holgura * 2);
  const xFin = limitar(limitar(xDeseada, foco.left + holgura, foco.right - holgura), holgura, pantalla.ancho - holgura);
  const fin = { x: xFin, y: yFin };
  const control = haciaLaDerecha ? { x: fin.x, y: inicio.y } : { x: inicio.x, y: (inicio.y + fin.y) / 2 };
  return { inicio, control, fin };
}

/** Las dos alas de la punta, sobre la tangente final (dirección control → fin). */
export function alasDeFlecha(f: Flecha, punta: number): [Punto, Punto] | null {
  const dx = f.fin.x - f.control.x;
  const dy = f.fin.y - f.control.y;
  const largo = Math.hypot(dx, dy);
  if (largo < 0.5) return null;
  const u = { x: dx / largo, y: dy / largo };
  const n = { x: -u.y, y: u.x };
  const base = { x: f.fin.x - u.x * punta, y: f.fin.y - u.y * punta };
  return [
    { x: base.x + n.x * punta * 0.55, y: base.y + n.y * punta * 0.55 },
    { x: base.x - n.x * punta * 0.55, y: base.y - n.y * punta * 0.55 },
  ];
}
