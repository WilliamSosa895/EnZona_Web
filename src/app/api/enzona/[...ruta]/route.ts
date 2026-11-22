import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { MENSAJE_SIN_CONEXION } from "@/lib/api/errores";
import { urlApi } from "@/lib/api/servidor";
import { leerTokenDeCookies } from "@/lib/sesion/cookies";

/*
 * Intermediario entre el navegador y EnZona_Api.
 *
 * Reenvía la petición tal cual (método, cuerpo, `Content-Type` e
 * `Idempotency-Key`) y agrega `Authorization: Bearer` con el token de la
 * cookie httpOnly. Devuelve la respuesta de la API con su estado, su cuerpo y
 * las cabeceras de paginación. Las reglas de negocio siguen viviendo en la API.
 */

export const dynamic = "force-dynamic";

const CABECERAS_ENTRADA = ["content-type", "idempotency-key", "accept"];
const CABECERAS_SALIDA = [
  "content-type",
  "x-total-count",
  "x-page",
  "x-page-size",
  "x-total-pages",
  "location",
  "cache-control",
];

async function reenviar(peticion: NextRequest, segmentos: string[]): Promise<Response> {
  const token = leerTokenDeCookies(await cookies());
  // El cliente envía la ruta completa de la API (`/api/eventos/...`) detrás de `/api/enzona`.
  const destino = `${urlApi()}/${segmentos.map(encodeURIComponent).join("/")}${peticion.nextUrl.search}`;

  const cabeceras = new Headers();
  for (const nombre of CABECERAS_ENTRADA) {
    const valor = peticion.headers.get(nombre);
    if (valor) cabeceras.set(nombre, valor);
  }
  if (token) cabeceras.set("Authorization", `Bearer ${token}`);

  const tieneCuerpo = peticion.method !== "GET" && peticion.method !== "HEAD";
  let respuesta: Response;
  try {
    respuesta = await fetch(destino, {
      method: peticion.method,
      headers: cabeceras,
      body: tieneCuerpo ? await peticion.arrayBuffer() : undefined,
      cache: "no-store",
      redirect: "manual",
    });
  } catch {
    return NextResponse.json(
      { status: 0, codigo: "SIN_CONEXION", detail: MENSAJE_SIN_CONEXION },
      { status: 503, headers: { "content-type": "application/problem+json" } },
    );
  }

  const salida = new Headers();
  for (const nombre of CABECERAS_SALIDA) {
    const valor = respuesta.headers.get(nombre);
    if (valor) salida.set(nombre, valor);
  }
  salida.set("cache-control", "no-store");

  return new Response(respuesta.body, { status: respuesta.status, headers: salida });
}

type Contexto = { params: Promise<{ ruta: string[] }> };

export async function GET(peticion: NextRequest, contexto: Contexto) {
  return reenviar(peticion, (await contexto.params).ruta);
}
export async function POST(peticion: NextRequest, contexto: Contexto) {
  return reenviar(peticion, (await contexto.params).ruta);
}
export async function PUT(peticion: NextRequest, contexto: Contexto) {
  return reenviar(peticion, (await contexto.params).ruta);
}
export async function PATCH(peticion: NextRequest, contexto: Contexto) {
  return reenviar(peticion, (await contexto.params).ruta);
}
export async function DELETE(peticion: NextRequest, contexto: Contexto) {
  return reenviar(peticion, (await contexto.params).ruta);
}
