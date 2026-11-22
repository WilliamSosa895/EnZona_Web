"use server";

import { revalidatePath } from "next/cache";
import { ErrorEnZona } from "@/lib/api/errores";
import { apiServidor } from "@/lib/api/servidor";
import type {
  CancelacionResultadoDto,
  EventoDto,
  EventoSolicitudDto,
  ValidadorDto,
} from "@/lib/api/tipos";
import { RUTAS } from "@/lib/rutas";
import { exigirRol } from "@/lib/sesion/servidor";

/*
 * Acciones del organizador (RF-08, RF-13, RF-14, RF-17). La web propone y la
 * API dispone: política de modificación, publicación con coordenadas y fecha
 * futura, cancelación con reembolso del 100 % y designación de validadores.
 */

export type Resultado<T = undefined> = { ok: true; datos: T } | { ok: false; error: string; codigo?: string };

async function ejecutar<T>(operacion: () => Promise<T>): Promise<Resultado<T>> {
  try {
    return { ok: true, datos: await operacion() };
  } catch (error) {
    if (error instanceof ErrorEnZona) return { ok: false, error: error.message, codigo: error.codigo };
    return { ok: false, error: "No se pudo completar la operación. Inténtalo de nuevo." };
  }
}

export async function guardarEvento(datos: EventoSolicitudDto, eventoId?: number): Promise<Resultado<EventoDto>> {
  await exigirRol(["ORGANIZADOR", "ADMIN"]);
  const resultado = await ejecutar(() =>
    eventoId
      ? apiServidor<EventoDto>(`/api/eventos/${eventoId}`, { metodo: "PUT", cuerpo: datos })
      : apiServidor<EventoDto>("/api/eventos", { metodo: "POST", cuerpo: datos }),
  );
  if (resultado.ok) {
    revalidatePath(RUTAS.misEventos);
    revalidatePath(RUTAS.panelEvento(resultado.datos.id));
    revalidatePath(RUTAS.inicio);
  }
  return resultado;
}

export async function publicarEvento(eventoId: number): Promise<Resultado<EventoDto>> {
  await exigirRol(["ORGANIZADOR", "ADMIN"]);
  const resultado = await ejecutar(() => apiServidor<EventoDto>(`/api/eventos/${eventoId}/publicacion`, { metodo: "POST" }));
  if (resultado.ok) {
    revalidatePath(RUTAS.misEventos);
    revalidatePath(RUTAS.panelEvento(eventoId));
    revalidatePath(RUTAS.inicio);
  }
  return resultado;
}

/** Sube la portada ya recortada y reducida en el navegador; la API la modera y la guarda en su almacén. */
export async function subirPortada(eventoId: number, formulario: FormData): Promise<Resultado<EventoDto>> {
  await exigirRol(["ORGANIZADOR", "ADMIN"]);
  const archivo = formulario.get("imagen");
  if (!(archivo instanceof File) || archivo.size === 0) return { ok: false, error: "Elige una imagen." };
  const cuerpo = new FormData();
  cuerpo.set("imagen", archivo, archivo.name || "portada.jpg");
  const resultado = await ejecutar(() => apiServidor<EventoDto>(`/api/eventos/${eventoId}/imagen`, { metodo: "POST", formulario: cuerpo }));
  if (resultado.ok) {
    revalidatePath(RUTAS.panelEvento(eventoId));
    revalidatePath(RUTAS.evento(eventoId));
    revalidatePath(RUTAS.inicio);
  }
  return resultado;
}

export async function quitarPortada(eventoId: number): Promise<Resultado<EventoDto>> {
  await exigirRol(["ORGANIZADOR", "ADMIN"]);
  const resultado = await ejecutar(() => apiServidor<EventoDto>(`/api/eventos/${eventoId}/imagen`, { metodo: "DELETE" }));
  if (resultado.ok) {
    revalidatePath(RUTAS.panelEvento(eventoId));
    revalidatePath(RUTAS.evento(eventoId));
    revalidatePath(RUTAS.inicio);
    revalidatePath(RUTAS.adminEventos);
  }
  return resultado;
}

export async function cancelarEvento(
  eventoId: number,
  motivo: string | null,
  administrativa: boolean,
): Promise<Resultado<CancelacionResultadoDto>> {
  await exigirRol(administrativa ? ["ADMIN"] : ["ORGANIZADOR", "ADMIN"]);
  const resultado = await ejecutar(() =>
    apiServidor<CancelacionResultadoDto>(`/api/eventos/${eventoId}/cancelacion`, {
      metodo: "POST",
      cuerpo: { motivo: motivo?.trim() || null, aceptaComision: true },
    }),
  );
  if (resultado.ok) {
    revalidatePath(RUTAS.misEventos);
    revalidatePath(RUTAS.panelEvento(eventoId));
    revalidatePath(RUTAS.adminEventos);
    revalidatePath(RUTAS.inicio);
  }
  return resultado;
}

export async function designarValidador(eventoId: number, correo: string): Promise<Resultado<ValidadorDto>> {
  await exigirRol(["ORGANIZADOR", "ADMIN"]);
  const resultado = await ejecutar(() =>
    apiServidor<ValidadorDto>(`/api/eventos/${eventoId}/validadores`, { metodo: "POST", cuerpo: { correo: correo.trim() } }),
  );
  if (resultado.ok) revalidatePath(RUTAS.panelEvento(eventoId));
  return resultado;
}

export async function quitarValidador(eventoId: number, usuarioId: number): Promise<Resultado<undefined>> {
  await exigirRol(["ORGANIZADOR", "ADMIN"]);
  const resultado = await ejecutar(() =>
    apiServidor<void>(`/api/eventos/${eventoId}/validadores/${usuarioId}`, { metodo: "DELETE" }).then(() => undefined),
  );
  if (resultado.ok) revalidatePath(RUTAS.panelEvento(eventoId));
  return resultado;
}
