/*
 * Qué guías interactivas (recorridos de la primera vez) ya vio esta persona en este navegador (data/Guias.kt en
 * Android). Hay guías para asistentes y organizadores; el validador y el administrador no las tienen: su pantalla
 * es de trabajo y se explica sola. Se guarda en localStorage: no viaja al servidor y se reinicia desde
 * Perfil → «Volver a ver las guías».
 */

/** Claves de las guías (una por pantalla que necesita explicación), las mismas que en Android. */
export const CLAVES_GUIA = {
  INICIO: 'inicio',
  DETALLE_EVENTO: 'detalle_evento',
  ASIENTOS: 'asientos',
  BOLETO: 'boleto',
  ORGANIZADOR: 'organizador',
  NUEVO_EVENTO: 'nuevo_evento',
  PANEL_EVENTO: 'panel_evento',
} as const;

export type ClaveGuia = (typeof CLAVES_GUIA)[keyof typeof CLAVES_GUIA];

const CLAVE_ALMACEN = 'enzona.guias';

let habilitadas = true;
let version = 0;
const suscriptores = new Set<() => void>();

function avisar() {
  version++;
  suscriptores.forEach((s) => s());
}

function leer(): Set<string> {
  try {
    const crudo = localStorage.getItem(CLAVE_ALMACEN);
    const lista = crudo ? (JSON.parse(crudo) as unknown) : [];
    return new Set(Array.isArray(lista) ? lista.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

function escribir(vistas: Set<string>) {
  try {
    localStorage.setItem(CLAVE_ALMACEN, JSON.stringify([...vistas]));
  } catch {
    // Sin almacenamiento: la guía no se vuelve a abrir mientras la página siga abierta (ver `enMemoria`).
  }
}

/** Guías vistas en esta página cuando el almacenamiento no está disponible. */
const enMemoria = new Set<string>();

/**
 * Activa o desactiva todas las guías. Las pruebas automáticas las desactivan para que nunca aparezcan encima de
 * lo que se está probando (como Android sin `Guias.iniciar`).
 */
export function configurarGuias(opciones: { habilitadas: boolean }): void {
  habilitadas = opciones.habilitadas;
  avisar();
}

export function guiaVista(clave: string): boolean {
  return !habilitadas || enMemoria.has(clave) || leer().has(clave);
}

export function marcarGuiaVista(clave: string): void {
  enMemoria.add(clave);
  const vistas = leer();
  vistas.add(clave);
  escribir(vistas);
  avisar();
}

/** Vuelve a mostrar todas las guías la próxima vez que se abra cada pantalla. */
export function reiniciarGuias(): void {
  enMemoria.clear();
  try {
    localStorage.removeItem(CLAVE_ALMACEN);
  } catch {
    // Nada que borrar.
  }
  avisar();
}

/** Para useSyncExternalStore: las pantallas vuelven a pedir su guía cuando se reinician. */
export function suscribirGuias(alCambiar: () => void): () => void {
  suscriptores.add(alCambiar);
  return () => suscriptores.delete(alCambiar);
}

export const versionGuias = () => version;
