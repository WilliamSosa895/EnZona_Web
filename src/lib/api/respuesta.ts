import { errorDesdeProblema, errorSinConexion, ErrorEnZona } from "./errores";
import type { ListaPaginada, Paginacion, ProblemaDto } from "./tipos";

/** Opciones comunes a cualquier llamada a la API, en servidor o en navegador. */
export interface OpcionesLlamada {
  metodo?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  cuerpo?: unknown;
  /** Cuerpo multipart (portada del evento): se envía tal cual, sin cabecera JSON. */
  formulario?: FormData;
  /** Clave de idempotencia de `POST /api/ordenes`. */
  claveIdempotencia?: string;
  /** Parámetros de consulta; los `undefined` y `null` se omiten. */
  consulta?: Record<string, string | number | boolean | null | undefined>;
  /** Revalidación de la caché de Next en el servidor (segundos). Por defecto no se cachea. */
  revalidar?: number;
  signal?: AbortSignal;
}

export function construirConsulta(consulta?: OpcionesLlamada["consulta"]): string {
  if (!consulta) return "";
  const parametros = new URLSearchParams();
  for (const [clave, valor] of Object.entries(consulta)) {
    if (valor === undefined || valor === null || valor === "") continue;
    parametros.set(clave, String(valor));
  }
  const texto = parametros.toString();
  return texto ? `?${texto}` : "";
}

export function construirPeticion(opciones: OpcionesLlamada, token?: string | null): RequestInit {
  const cabeceras = new Headers();
  cabeceras.set("Accept", "application/json, application/problem+json");
  if (token) cabeceras.set("Authorization", `Bearer ${token}`);
  if (opciones.claveIdempotencia) cabeceras.set("Idempotency-Key", opciones.claveIdempotencia);

  let body: BodyInit | undefined;
  if (opciones.formulario) {
    body = opciones.formulario;
  } else if (opciones.cuerpo !== undefined) {
    cabeceras.set("Content-Type", "application/json");
    body = JSON.stringify(opciones.cuerpo);
  }

  return {
    method: opciones.metodo ?? "GET",
    headers: cabeceras,
    body,
    signal: opciones.signal,
    cache: "no-store",
  };
}

async function leerProblema(respuesta: Response): Promise<ProblemaDto | null> {
  const tipo = respuesta.headers.get("content-type") ?? "";
  if (!tipo.includes("json")) return null;
  try {
    return (await respuesta.json()) as ProblemaDto;
  } catch {
    return null;
  }
}

/** Convierte la respuesta HTTP en el cuerpo tipado o lanza `ErrorEnZona`. */
export async function procesarRespuesta<T>(respuesta: Response): Promise<T> {
  if (!respuesta.ok) {
    throw errorDesdeProblema(respuesta.status, await leerProblema(respuesta));
  }
  if (respuesta.status === 204 || respuesta.status === 202) return undefined as T;
  const texto = await respuesta.text();
  if (!texto) return undefined as T;
  return JSON.parse(texto) as T;
}

export function leerPaginacion(cabeceras: Headers, cantidad: number): Paginacion {
  const entero = (nombre: string, porDefecto: number) => {
    const valor = Number(cabeceras.get(nombre));
    return Number.isFinite(valor) && cabeceras.has(nombre) ? valor : porDefecto;
  };
  return {
    total: entero("X-Total-Count", cantidad),
    pagina: entero("X-Page", 0),
    tamano: entero("X-Page-Size", cantidad),
    totalPaginas: entero("X-Total-Pages", 1),
  };
}

export async function procesarLista<T>(respuesta: Response): Promise<ListaPaginada<T>> {
  const elementos = await procesarRespuesta<T[]>(respuesta);
  const lista = Array.isArray(elementos) ? elementos : [];
  return { elementos: lista, paginacion: leerPaginacion(respuesta.headers, lista.length) };
}

/** Ejecuta `fetch` traduciendo fallos de red a `ErrorEnZona` sin conexión. */
export async function pedir(url: string, peticion: RequestInit): Promise<Response> {
  try {
    return await fetch(url, peticion);
  } catch (error) {
    if (error instanceof ErrorEnZona) throw error;
    throw errorSinConexion();
  }
}
