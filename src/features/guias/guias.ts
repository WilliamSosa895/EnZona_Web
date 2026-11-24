/*
 * Guías interactivas de la primera vez («tooltip walkthroughs»), equivalentes
 * a `ui/components/GuiaInteractiva.kt` y `data/Guias.kt` de la app Android.
 *
 * Cada pantalla marca sus zonas difíciles con `data-guia="clave"` y declara su
 * recorrido con <GuiaDePantalla>. La guía se abre sola la primera vez que se
 * entra a la pantalla y se recuerda **por cuenta** en el navegador
 * (`enzona:guias:{usuarioId}:{guía}`): no viaja al servidor y se puede
 * reiniciar desde Mi cuenta → «Volver a ver las guías».
 *
 * Este archivo es lógica pura (sin DOM) para poder probarla.
 */

export interface PasoGuia {
  /** Clave del objetivo marcado con `data-guia`; null para un paso sin foco (bienvenida). */
  objetivo?: string | null;
  titulo: string;
  texto: string;
}

export const CLAVES_GUIA = {
  INICIO: "inicio",
  DETALLE_EVENTO: "detalle_evento",
  ASIENTOS: "asientos",
  BOLETO: "boleto",
  ORGANIZADOR: "organizador",
  NUEVO_EVENTO: "nuevo_evento",
  PANEL_EVENTO: "panel_evento",
} as const;

export type ClaveGuia = (typeof CLAVES_GUIA)[keyof typeof CLAVES_GUIA];

const PREFIJO_ALMACEN = "enzona:guias:";

/** Subconjunto de `Storage` que usamos, para poder probar con un objeto simple. */
export interface AlmacenGuias {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
  removeItem(clave: string): void;
  key(indice: number): string | null;
  readonly length: number;
}

export function claveAlmacen(usuarioId: number | string, clave: string): string {
  return `${PREFIJO_ALMACEN}${usuarioId}:${clave}`;
}

/** Sin almacén (navegador que lo bloquea) todas las guías cuentan como vistas. */
export function guiaVista(almacen: AlmacenGuias | null, usuarioId: number | string, clave: string): boolean {
  if (!almacen) return true;
  try {
    return almacen.getItem(claveAlmacen(usuarioId, clave)) === "1";
  } catch {
    return true;
  }
}

export function marcarGuiaVista(almacen: AlmacenGuias | null, usuarioId: number | string, clave: string): void {
  try {
    almacen?.setItem(claveAlmacen(usuarioId, clave), "1");
  } catch {
    // Sin espacio o sin permiso: la guía simplemente volverá a aparecer.
  }
}

/** Vuelve a mostrar a esta cuenta todas las guías. Devuelve cuántas se reiniciaron. */
export function reiniciarGuias(almacen: AlmacenGuias | null, usuarioId: number | string): number {
  if (!almacen) return 0;
  const prefijo = `${PREFIJO_ALMACEN}${usuarioId}:`;
  const claves: string[] = [];
  try {
    for (let indice = 0; indice < almacen.length; indice += 1) {
      const clave = almacen.key(indice);
      if (clave && clave.startsWith(prefijo)) claves.push(clave);
    }
    claves.forEach((clave) => almacen.removeItem(clave));
  } catch {
    return 0;
  }
  return claves.length;
}

// ==================================================================
//  Geometría del dibujo (funciones puras, mismas reglas que en Android)
// ==================================================================

export interface Caja {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Tamano {
  width: number;
  height: number;
}

export interface Punto {
  x: number;
  y: number;
}

export interface Flecha {
  inicio: Punto;
  control: Punto;
  fin: Punto;
}

export const derecha = (caja: Caja): number => caja.left + caja.width;
export const abajo = (caja: Caja): number => caja.top + caja.height;
export const centro = (caja: Caja): Punto => ({ x: caja.left + caja.width / 2, y: caja.top + caja.height / 2 });

export function inflar(caja: Caja, margen: number): Caja {
  return { left: caja.left - margen, top: caja.top - margen, width: caja.width + margen * 2, height: caja.height + margen * 2 };
}

function acotar(valor: number, minimo: number, maximo: number): number {
  if (minimo > maximo) return (minimo + maximo) / 2;
  return Math.min(Math.max(valor, minimo), maximo);
}

/**
 * Dónde va el texto: debajo del foco si cabe, si no encima; sin foco, al
 * centro. Siempre dentro de la pantalla con el margen dado.
 */
export interface Reserva {
  /** Alto ocupado por la barra de botones arriba y abajo: el texto nunca la pisa. */
  arriba: number;
  abajo: number;
}

const SIN_RESERVA: Reserva = { arriba: 0, abajo: 0 };

export function posicionTarjeta(
  foco: Caja | null,
  pantalla: Tamano,
  tarjeta: Tamano,
  separacion: number,
  margen: number,
  reserva: Reserva = SIN_RESERVA,
): Punto {
  const x = Math.max((pantalla.width - tarjeta.width) / 2, margen);
  const limiteSuperior = margen + reserva.arriba;
  const limiteInferior = pantalla.height - margen - reserva.abajo;
  if (!foco) {
    const libre = limiteInferior - limiteSuperior;
    return { x: Math.round(x), y: Math.round(limiteSuperior + Math.max((libre - tarjeta.height) / 2, 0)) };
  }
  // Primero con la separación normal; si no cabe, con la mitad (la flecha queda más corta)
  for (const distancia of [separacion, separacion / 2]) {
    const debajo = abajo(foco) + distancia;
    if (debajo + tarjeta.height <= limiteInferior) return { x: Math.round(x), y: Math.round(debajo) };
    const encima = foco.top - distancia - tarjeta.height;
    if (encima >= limiteSuperior) return { x: Math.round(x), y: Math.round(encima) };
  }
  // No cabe ni arriba ni abajo (objetivo muy alto): se pega al borde que deje más foco visible
  const y = centro(foco).y > pantalla.height / 2 ? limiteSuperior : limiteInferior - tarjeta.height;
  return { x: Math.round(x), y: Math.round(Math.max(y, limiteSuperior)) };
}

/**
 * Traza la flecha desde el borde del texto hasta el borde del foco más cercano.
 * Si el foco está debajo del texto, llega a su borde superior; si está arriba,
 * al inferior. Curva Bézier cuadrática: nace horizontal y llega vertical.
 */
export function trazarFlecha(texto: Caja, foco: Caja, pantalla: Tamano, holgura = 14): Flecha {
  const focoDebajo = foco.top >= abajo(texto);
  const yFin = focoDebajo ? foco.top - holgura : abajo(foco) + holgura;
  // Sale por el lado derecho del texto cuando el foco queda a la derecha; si no, baja/sube desde su primera línea
  const haciaLaDerecha = centro(foco).x > derecha(texto) + holgura * 2;
  const inicio: Punto = haciaLaDerecha
    ? { x: derecha(texto) + holgura, y: centro(texto).y }
    : { x: texto.left + holgura * 2, y: focoDebajo ? abajo(texto) + holgura : texto.top - holgura };
  const xPreferida = haciaLaDerecha ? centro(foco).x : Math.max(inicio.x + holgura * 7, foco.left + holgura * 2);
  const xFin = acotar(acotar(xPreferida, foco.left + holgura, derecha(foco) - holgura), holgura, pantalla.width - holgura);
  const fin: Punto = { x: xFin, y: yFin };
  const control: Punto = haciaLaDerecha ? { x: fin.x, y: inicio.y } : { x: inicio.x, y: (inicio.y + fin.y) / 2 };
  return { inicio, control, fin };
}

/** Trazo SVG de la flecha y de sus dos alas abiertas sobre la tangente final. */
export function trazoFlecha(flecha: Flecha, punta: number): { curva: string; alas: string } {
  const { inicio, control, fin } = flecha;
  const curva = `M ${inicio.x} ${inicio.y} Q ${control.x} ${control.y} ${fin.x} ${fin.y}`;
  const dx = fin.x - control.x;
  const dy = fin.y - control.y;
  const largo = Math.hypot(dx, dy);
  if (largo < 0.5) return { curva, alas: "" };
  const ux = dx / largo;
  const uy = dy / largo;
  const nx = -uy;
  const ny = ux;
  const ala1 = { x: fin.x - ux * punta + nx * punta * 0.55, y: fin.y - uy * punta + ny * punta * 0.55 };
  const ala2 = { x: fin.x - ux * punta - nx * punta * 0.55, y: fin.y - uy * punta - ny * punta * 0.55 };
  return { curva, alas: `M ${ala1.x} ${ala1.y} L ${fin.x} ${fin.y} L ${ala2.x} ${ala2.y}` };
}

/** Trazo SVG del fondo oscuro con el recorte redondeado del foco (regla par-impar). */
export function trazoSombra(pantalla: Tamano, recorte: Caja | null, radio: number): string {
  const fondo = `M 0 0 H ${pantalla.width} V ${pantalla.height} H 0 Z`;
  if (!recorte) return fondo;
  const r = Math.min(radio, recorte.width / 2, recorte.height / 2);
  const x = recorte.left;
  const y = recorte.top;
  const ancho = recorte.width;
  const alto = recorte.height;
  const agujero =
    `M ${x + r} ${y} H ${x + ancho - r} A ${r} ${r} 0 0 1 ${x + ancho} ${y + r} V ${y + alto - r} ` +
    `A ${r} ${r} 0 0 1 ${x + ancho - r} ${y + alto} H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + alto - r} ` +
    `V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;
  return `${fondo} ${agujero}`;
}
