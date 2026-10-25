import { createContext } from 'react';
import type { ClaveGuia } from './almacen';

/** Un paso de la guía. Sin `objetivo` es un paso sin foco (bienvenida) y el texto va centrado. */
export interface PasoGuia {
  /** Valor del atributo `data-guia` del elemento que se ilumina. */
  objetivo?: string;
  titulo: string;
  texto: string;
}

export interface ValorGuias {
  /** Abre la guía si no se ha visto y no hay otra en pantalla. Devuelve si se abrió. */
  pedir: (clave: ClaveGuia, pasos: PasoGuia[]) => boolean;
  /** La pantalla se cerró a mitad de la guía: se oculta sin marcarla como vista. */
  cancelar: (clave: ClaveGuia) => void;
}

export const GuiasContext = createContext<ValorGuias | null>(null);
