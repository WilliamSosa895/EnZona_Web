import { env } from '@/config/env';
import type { Pagina, ProblemaApi } from './tipos';

/**
 * Error de la API con el `codigo` estable de EnZona. La interfaz decide con base en `codigo`,
 * nunca en el texto de `detail`, que puede cambiar (docs/CODIGOS_DE_ERROR.md de la API).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly codigo: string;
  readonly errores: { campo: string; mensaje: string }[];

  constructor(problema: ProblemaApi) {
    super(problema.detail || problema.title || 'Error de la API');
    this.name = 'ApiError';
    this.status = problema.status;
    this.codigo = problema.codigo ?? codigoPorEstado(problema.status);
    this.errores = problema.errores ?? [];
  }

  /** Mensaje de validación de un campo concreto (cuando `codigo` es VALIDACION). */
  errorDeCampo(campo: string): string | undefined {
    return this.errores.find((e) => e.campo === campo)?.mensaje;
  }
}

function codigoPorEstado(status: number): string {
  if (status === 0) return 'SIN_CONEXION';
  if (status === 401) return 'NO_AUTENTICADO';
  if (status === 403) return 'ACCESO_DENEGADO';
  if (status === 404) return 'NO_ENCONTRADO';
  if (status === 429) return 'DEMASIADOS_INTENTOS';
  if (status >= 500) return 'ERROR_INTERNO';
  return 'SOLICITUD_INVALIDA';
}

// ---------------------------------------------------------------- sesión

interface ConfigSesion {
  obtenerToken: () => string | null;
  /** Se llama cuando una petición autenticada responde 401 (token vencido o inválido). */
  alNoAutenticado: () => void;
}

let sesion: ConfigSesion = { obtenerToken: () => null, alNoAutenticado: () => undefined };

/** El módulo de autenticación registra aquí cómo obtener el token y qué hacer si vence. */
export function configurarSesion(config: ConfigSesion): void {
  sesion = config;
}

// ---------------------------------------------------------------- peticiones

type Consulta = Record<string, string | number | boolean | undefined | null>;

export interface OpcionesPeticion {
  cuerpo?: unknown;
  consulta?: Consulta;
  cabeceras?: Record<string, string>;
  senal?: AbortSignal;
  /** false para endpoints públicos: no envía el token aunque exista. */
  autenticada?: boolean;
}

const TIEMPO_LIMITE_MS = 20_000;

function construirUrl(ruta: string, consulta?: Consulta): string {
  const url = new URL(`${env.apiUrl}${ruta}`);
  if (consulta) {
    for (const [clave, valor] of Object.entries(consulta)) {
      if (valor !== undefined && valor !== null && valor !== '') url.searchParams.set(clave, String(valor));
    }
  }
  return url.toString();
}

function combinarSenales(senal?: AbortSignal): AbortSignal {
  const limite = AbortSignal.timeout(TIEMPO_LIMITE_MS);
  if (!senal) return limite;
  if ('any' in AbortSignal) return AbortSignal.any([senal, limite]);
  return senal;
}

async function leerProblema(respuesta: Response): Promise<ProblemaApi> {
  try {
    const cuerpo = (await respuesta.json()) as Partial<ProblemaApi>;
    return { ...cuerpo, status: respuesta.status };
  } catch {
    return { status: respuesta.status, detail: respuesta.statusText };
  }
}

async function ejecutar(metodo: string, ruta: string, opciones: OpcionesPeticion = {}): Promise<Response> {
  const cabeceras: Record<string, string> = { Accept: 'application/json', ...opciones.cabeceras };
  if (opciones.cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';

  const token = opciones.autenticada === false ? null : sesion.obtenerToken();
  if (token) cabeceras.Authorization = `Bearer ${token}`;

  let respuesta: Response;
  try {
    respuesta = await fetch(construirUrl(ruta, opciones.consulta), {
      method: metodo,
      headers: cabeceras,
      body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
      signal: combinarSenales(opciones.senal),
      credentials: 'omit',
      cache: 'no-store',
    });
  } catch (causa) {
    if (causa instanceof DOMException && causa.name === 'AbortError' && opciones.senal?.aborted) throw causa;
    throw new ApiError({
      status: 0,
      codigo: 'SIN_CONEXION',
      detail: 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.',
    });
  }

  if (!respuesta.ok) {
    const problema = await leerProblema(respuesta);
    if (respuesta.status === 401 && token) sesion.alNoAutenticado();
    throw new ApiError(problema);
  }
  return respuesta;
}

/** Petición que devuelve el cuerpo JSON (o undefined si la respuesta no tiene cuerpo). */
export async function peticion<T>(metodo: string, ruta: string, opciones?: OpcionesPeticion): Promise<T> {
  const respuesta = await ejecutar(metodo, ruta, opciones);
  if (respuesta.status === 204 || respuesta.status === 202) return undefined as T;
  const texto = await respuesta.text();
  return (texto ? JSON.parse(texto) : undefined) as T;
}

/** Petición paginada: el arreglo viene en el cuerpo y los totales en X-Total-Count, X-Page, etc. */
export async function peticionPaginada<T>(ruta: string, opciones?: OpcionesPeticion): Promise<Pagina<T>> {
  const respuesta = await ejecutar('GET', ruta, opciones);
  const elementos = ((await respuesta.json()) as T[]) ?? [];
  const numero = (cabecera: string, porDefecto: number) => {
    const valor = Number(respuesta.headers.get(cabecera));
    return Number.isFinite(valor) && respuesta.headers.has(cabecera) ? valor : porDefecto;
  };
  return {
    elementos,
    total: numero('X-Total-Count', elementos.length),
    pagina: numero('X-Page', 0),
    tamano: numero('X-Page-Size', elementos.length),
    totalPaginas: numero('X-Total-Pages', 1),
  };
}
