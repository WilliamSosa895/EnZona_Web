import "server-only";

import { cookies } from "next/headers";
import { leerTokenDeCookies } from "@/lib/sesion/cookies";
import { construirConsulta, construirPeticion, pedir, procesarLista, procesarRespuesta } from "./respuesta";
import type { OpcionesLlamada } from "./respuesta";
import type { ListaPaginada } from "./tipos";

/**
 * Dónde está EnZona_Api. El navegador nunca la llama directamente: las
 * páginas la consultan desde el servidor de Next y el navegador pasa por el
 * intermediario de `app/api/enzona`. Así el token vive en una cookie httpOnly
 * y no hace falta cambiar `CORS_ORIGINS` en la API.
 */
export function urlApi(): string {
  const base = process.env.ENZONA_API_URL?.trim() || "http://localhost:8080";
  return base.replace(/\/+$/, "");
}

/** Llamada a la API desde componentes de servidor, acciones y route handlers. */
export async function apiServidor<T>(ruta: string, opciones: OpcionesLlamada = {}): Promise<T> {
  const token = leerTokenDeCookies(await cookies());
  const peticion = construirPeticion(opciones, token);
  if (opciones.revalidar !== undefined) {
    peticion.cache = undefined;
    peticion.next = { revalidate: opciones.revalidar };
  }
  const respuesta = await pedir(`${urlApi()}${ruta}${construirConsulta(opciones.consulta)}`, peticion);
  return procesarRespuesta<T>(respuesta);
}

/** Igual que `apiServidor`, pero con la paginación de las cabeceras. */
export async function apiServidorLista<T>(
  ruta: string,
  opciones: OpcionesLlamada = {},
): Promise<ListaPaginada<T>> {
  const token = leerTokenDeCookies(await cookies());
  const peticion = construirPeticion(opciones, token);
  const respuesta = await pedir(`${urlApi()}${ruta}${construirConsulta(opciones.consulta)}`, peticion);
  return procesarLista<T>(respuesta);
}

/** Llamada pública (sin token) que puede cachearse: catálogo de categorías, detalle público. */
export async function apiPublica<T>(ruta: string, opciones: OpcionesLlamada = {}): Promise<T> {
  const peticion = construirPeticion(opciones, null);
  if (opciones.revalidar !== undefined) {
    peticion.cache = undefined;
    peticion.next = { revalidate: opciones.revalidar };
  }
  const respuesta = await pedir(`${urlApi()}${ruta}${construirConsulta(opciones.consulta)}`, peticion);
  return procesarRespuesta<T>(respuesta);
}
