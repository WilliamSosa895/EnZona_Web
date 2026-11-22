import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ErrorEnZona } from "@/lib/api/errores";
import { apiServidor } from "@/lib/api/servidor";
import type { Rol, UsuarioDto } from "@/lib/api/tipos";
import { RUTAS } from "@/lib/rutas";
import { leerAccesoPersonal, leerTokenDeCookies } from "./cookies";

export interface SesionActual {
  usuario: UsuarioDto;
  roles: Rol[];
  accesoPersonal: boolean;
}

/**
 * Perfil de la cuenta con sesión, leído de `GET /api/usuarios/me` una vez por
 * petición (React.cache). Los roles se leen del servidor y no del token: así un
 * bloqueo o un rol nuevo aplican de inmediato, como exige la API.
 */
export const sesionActual = cache(async (): Promise<SesionActual | null> => {
  const jar = await cookies();
  const token = leerTokenDeCookies(jar);
  if (!token) return null;
  try {
    const usuario = await apiServidor<UsuarioDto>("/api/usuarios/me");
    const roles = usuario.roles && usuario.roles.length > 0 ? usuario.roles : (["ASISTENTE"] as Rol[]);
    return { usuario, roles, accesoPersonal: leerAccesoPersonal(jar) };
  } catch (error) {
    if (error instanceof ErrorEnZona && (error.sesionVencida || error.estado === 403)) return null;
    throw error;
  }
});

/** Exige sesión; si no hay, lleva al acceso y vuelve después a `destino`. */
export async function exigirSesion(destino?: string): Promise<SesionActual> {
  const sesion = await sesionActual();
  if (!sesion) {
    const volver = destino ? `?volver=${encodeURIComponent(destino)}` : "";
    redirect(`${RUTAS.login}${volver}`);
  }
  return sesion;
}

/** Exige uno de los roles indicados; sin él, vuelve al inicio. */
export async function exigirRol(roles: Rol[], destino?: string): Promise<SesionActual> {
  const sesion = await exigirSesion(destino);
  if (!roles.some((rol) => sesion.roles.includes(rol))) redirect(RUTAS.inicio);
  return sesion;
}

export function tieneRol(sesion: SesionActual | null, rol: Rol): boolean {
  return sesion?.roles.includes(rol) ?? false;
}

export function esPersonal(sesion: SesionActual | null): boolean {
  return sesion?.roles.some((rol) => rol !== "ASISTENTE") ?? false;
}

/** Rol con el que se decide la pantalla principal tras el acceso de personal. */
export function rolPrincipal(roles: Rol[]): Rol {
  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("ORGANIZADOR")) return "ORGANIZADOR";
  if (roles.includes("VALIDADOR")) return "VALIDADOR";
  return "ASISTENTE";
}

export function destinoPorRol(rol: Rol): string {
  switch (rol) {
    case "ADMIN":
      return RUTAS.admin;
    case "ORGANIZADOR":
      return RUTAS.misEventos;
    case "VALIDADOR":
      return RUTAS.escanear;
    default:
      return RUTAS.inicio;
  }
}
