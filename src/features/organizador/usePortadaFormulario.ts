import { useCallback, useState } from 'react';
import { eventosApi } from '@/api/eventos';
import type { Evento } from '@/api/tipos';
import { ENCUADRE_INICIAL, recortar, type Encuadre } from '@/lib/portada';

/** Estado de la portada en el formulario: se elige y encuadra aquí y se sube después de guardar el evento. */
export interface EstadoPortada {
  /** Imagen elegida (ya enderezada y reducida); null si no se eligió una nueva. */
  imagen: HTMLCanvasElement | null;
  encuadre: Encuadre;
  /** La persona pidió quitar la portada que el evento ya tenía. */
  quitar: boolean;
}

/** Hook del formulario: el estado de la portada y la operación que la aplica al evento ya guardado. */
export function usePortadaFormulario(urlActual: string | null) {
  const [estado, setEstado] = useState<EstadoPortada>({ imagen: null, encuadre: ENCUADRE_INICIAL, quitar: false });
  const [error, setError] = useState<string | null>(null);

  /**
   * Sube la portada recortada o la quita, una vez que el evento existe en el servidor. Devuelve el evento
   * actualizado, o null si no había nada que cambiar.
   */
  const aplicar = useCallback(
    async (eventoId: number): Promise<Evento | null> => {
      if (estado.imagen) return eventosApi.subirImagen(eventoId, await recortar(estado.imagen, estado.encuadre));
      if (estado.quitar && urlActual) return eventosApi.quitarImagen(eventoId);
      return null;
    },
    [estado, urlActual],
  );

  return { estado, setEstado, error, setError, aplicar, urlActual };
}
