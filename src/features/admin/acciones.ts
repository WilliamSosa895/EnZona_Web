"use server";

import { revalidatePath } from "next/cache";
import { ErrorEnZona } from "@/lib/api/errores";
import { apiServidor } from "@/lib/api/servidor";
import type { EstadoUsuario, UsuarioDto } from "@/lib/api/tipos";
import { RUTAS } from "@/lib/rutas";
import { exigirRol } from "@/lib/sesion/servidor";

/*
 * Administración (RF-18): activar o bloquear cuentas. El bloqueo aplica de
 * inmediato aunque el token siga vigente (la API lee el estado en cada
 * petición). Los roles no se editan: la API no lo expone (Capacidades).
 */
export async function cambiarEstadoUsuario(
  usuarioId: number,
  estado: Extract<EstadoUsuario, "ACTIVO" | "BLOQUEADO">,
): Promise<{ ok: true; datos: UsuarioDto } | { ok: false; error: string }> {
  await exigirRol(["ADMIN"]);
  try {
    const usuario = await apiServidor<UsuarioDto>(`/api/admin/usuarios/${usuarioId}/estado`, {
      metodo: "PATCH",
      cuerpo: { estado },
    });
    revalidatePath(RUTAS.adminUsuarios);
    revalidatePath(RUTAS.admin);
    return { ok: true, datos: usuario };
  } catch (error) {
    return { ok: false, error: error instanceof ErrorEnZona ? error.message : "No se pudo cambiar el estado." };
  }
}
