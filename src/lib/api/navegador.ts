import { construirConsulta, construirPeticion, pedir, procesarLista, procesarRespuesta } from "./respuesta";
import type { OpcionesLlamada } from "./respuesta";
import type { ListaPaginada } from "./tipos";

/** Prefijo del intermediario de Next que reenvía a EnZona_Api con el token de la cookie. */
export const PREFIJO_PROXY = "/api/enzona";

/**
 * Llamada a la API desde componentes de cliente. Va al intermediario del
 * mismo origen, que agrega `Authorization` desde la cookie httpOnly.
 */
export async function apiNavegador<T>(ruta: string, opciones: OpcionesLlamada = {}): Promise<T> {
  const peticion = construirPeticion(opciones, null);
  const respuesta = await pedir(`${PREFIJO_PROXY}${ruta}${construirConsulta(opciones.consulta)}`, peticion);
  return procesarRespuesta<T>(respuesta);
}

export async function apiNavegadorLista<T>(
  ruta: string,
  opciones: OpcionesLlamada = {},
): Promise<ListaPaginada<T>> {
  const peticion = construirPeticion(opciones, null);
  const respuesta = await pedir(`${PREFIJO_PROXY}${ruta}${construirConsulta(opciones.consulta)}`, peticion);
  return procesarLista<T>(respuesta);
}
