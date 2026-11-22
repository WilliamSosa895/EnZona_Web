"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ErrorEnZona } from "@/lib/api/errores";
import { apiServidor } from "@/lib/api/servidor";
import type {
  RegistroDto,
  RegistroRespuestaDto,
  SesionRespuestaDto,
  UsuarioDto,
  VerificacionDto,
  VerificacionRespuestaDto,
} from "@/lib/api/tipos";
import { RUTAS } from "@/lib/rutas";
import {
  NOMBRE_COOKIE_PERSONAL,
  NOMBRE_COOKIE_TOKEN,
  opcionesCookieSesion,
} from "@/lib/sesion/cookies";
import { destinoPorRol, rolPrincipal } from "@/lib/sesion/servidor";
import { esCurp } from "./validaciones";

/*
 * Acciones de servidor de identidad (RF-01 a RF-03). Hablan con EnZona_Api y
 * guardan el JWT en una cookie httpOnly. Las reglas (bloqueo por intentos,
 * no enumerar correos, verificación en dos pasos) viven en la API.
 */

export interface ResultadoAccion {
  error?: string;
  codigo?: string;
  errores?: Record<string, string>;
}

function resultadoDesde(error: unknown): ResultadoAccion {
  if (error instanceof ErrorEnZona) {
    const errores: Record<string, string> = {};
    for (const item of error.errores) errores[item.campo] = item.mensaje;
    return { error: error.message, codigo: error.codigo, errores };
  }
  return { error: "No se pudo completar la operación. Inténtalo de nuevo." };
}

/** Destino seguro tras el acceso: solo rutas internas. */
function destinoSeguro(volver: string | null | undefined): string | null {
  if (!volver || !volver.startsWith("/") || volver.startsWith("//")) return null;
  return volver;
}

const esquemaSesion = z.object({
  identificador: z.string().trim().min(1, "Escribe tu correo, teléfono o CURP."),
  contrasena: z.string().min(1, "Escribe tu contraseña."),
  accesoPersonal: z.boolean(),
  volver: z.string().optional(),
});

export async function iniciarSesion(_previo: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const entrada = esquemaSesion.safeParse({
    identificador: datos.get("identificador"),
    contrasena: datos.get("contrasena"),
    accesoPersonal: datos.get("accesoPersonal") === "1",
    volver: datos.get("volver")?.toString(),
  });
  if (!entrada.success) {
    const errores: Record<string, string> = {};
    for (const problema of entrada.error.issues) errores[String(problema.path[0])] = problema.message;
    return { error: "Revisa los datos.", errores };
  }
  const { identificador, contrasena, accesoPersonal, volver } = entrada.data;

  let sesion: SesionRespuestaDto;
  try {
    sesion = await apiServidor<SesionRespuestaDto>("/api/auth/sesion", {
      metodo: "POST",
      cuerpo: { identificador, contrasena },
    });
  } catch (error) {
    if (error instanceof ErrorEnZona && error.cuentaPendiente && identificador.includes("@")) {
      // La API no devuelve el id: con el correo se puede ir a la pantalla del código.
      redirect(RUTAS.verificacion(identificador));
    }
    return resultadoDesde(error);
  }

  const roles = sesion.usuario.roles ?? ["ASISTENTE"];
  const esPersonal = roles.some((rol) => rol !== "ASISTENTE");
  if (accesoPersonal && !esPersonal) {
    return {
      error: "Esta cuenta no tiene rol de organizador, validador ni administrador. Entra por el acceso de asistentes.",
      codigo: "SIN_ROL_PERSONAL",
    };
  }

  const jar = await cookies();
  const opciones = opcionesCookieSesion(sesion.expiraEnSegundos);
  jar.set(NOMBRE_COOKIE_TOKEN, sesion.token, opciones);
  jar.set(NOMBRE_COOKIE_PERSONAL, accesoPersonal ? "1" : "0", { ...opciones, httpOnly: false });

  const destino = destinoSeguro(volver) ?? (accesoPersonal ? destinoPorRol(rolPrincipal(roles)) : RUTAS.inicio);
  redirect(destino);
}

export async function cerrarSesion(): Promise<void> {
  const jar = await cookies();
  jar.delete(NOMBRE_COOKIE_TOKEN);
  jar.delete(NOMBRE_COOKIE_PERSONAL);
  redirect(RUTAS.login);
}

const esquemaRegistro = z
  .object({
    nombre: z.string().trim().min(3, "Escribe tu nombre completo.").max(120, "Máximo 120 caracteres."),
    correo: z.string().trim().email("Escribe un correo válido.").max(180),
    curp: z
      .string()
      .trim()
      .toUpperCase()
      .refine(esCurp, "La CURP debe tener 18 caracteres con el formato oficial."),
    contrasena: z
      .string()
      .min(8, "Mínimo 8 caracteres.")
      .max(72, "Máximo 72 caracteres.")
      .refine((valor) => /[A-Za-z]/.test(valor) && /\d/.test(valor), "Incluye letras y números."),
    confirmacion: z.string(),
    organizador: z.boolean(),
    aceptaAvisoPrivacidad: z.literal(true, { error: "Debes aceptar el aviso de privacidad." }),
  })
  .refine((datos) => datos.contrasena === datos.confirmacion, {
    path: ["confirmacion"],
    message: "Las contraseñas no coinciden.",
  });

export async function registrar(_previo: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const entrada = esquemaRegistro.safeParse({
    nombre: datos.get("nombre"),
    correo: datos.get("correo"),
    curp: datos.get("curp"),
    contrasena: datos.get("contrasena"),
    confirmacion: datos.get("confirmacion"),
    organizador: datos.get("organizador") === "1",
    aceptaAvisoPrivacidad: datos.get("aceptaAvisoPrivacidad") === "1",
  });
  if (!entrada.success) {
    const errores: Record<string, string> = {};
    for (const problema of entrada.error.issues) errores[String(problema.path[0])] = problema.message;
    return { error: "Revisa los datos marcados.", errores };
  }
  const cuerpo: RegistroDto = {
    nombre: entrada.data.nombre,
    correo: entrada.data.correo,
    telefono: null, // sin proveedor de SMS, la cuenta quedaría pendiente para siempre
    curp: entrada.data.curp,
    contrasena: entrada.data.contrasena,
    organizador: entrada.data.organizador,
    aceptaAvisoPrivacidad: true,
  };
  try {
    await apiServidor<RegistroRespuestaDto>("/api/auth/registro", { metodo: "POST", cuerpo });
  } catch (error) {
    return resultadoDesde(error);
  }
  redirect(RUTAS.verificacion(entrada.data.correo));
}

const esquemaVerificacion = z.object({
  correo: z.string().trim().email(),
  codigo: z.string().trim().regex(/^\d{6}$/, "El código tiene 6 dígitos."),
});

export interface ResultadoVerificacion extends ResultadoAccion {
  completa?: boolean;
  siguienteCanal?: "TELEFONO" | null;
}

export async function verificarCodigo(
  _previo: ResultadoVerificacion | null,
  datos: FormData,
): Promise<ResultadoVerificacion> {
  const entrada = esquemaVerificacion.safeParse({ correo: datos.get("correo"), codigo: datos.get("codigo") });
  if (!entrada.success) return { error: "El código tiene 6 dígitos.", errores: { codigo: "El código tiene 6 dígitos." } };
  const canal = (datos.get("canal")?.toString() === "TELEFONO" ? "TELEFONO" : "CORREO") as VerificacionDto["canal"];
  try {
    const respuesta = await apiServidor<VerificacionRespuestaDto>("/api/auth/verificacion", {
      metodo: "POST",
      cuerpo: { correo: entrada.data.correo, canal, codigo: entrada.data.codigo },
    });
    const pendientes = respuesta.verificacionesPendientes ?? [];
    if (respuesta.estado === "ACTIVO" || pendientes.length === 0) {
      return { completa: true };
    }
    return { completa: false, siguienteCanal: pendientes.includes("TELEFONO") ? "TELEFONO" : null };
  } catch (error) {
    return resultadoDesde(error);
  }
}

export async function reenviarCodigo(correo: string, canal: "CORREO" | "TELEFONO" = "CORREO"): Promise<ResultadoAccion> {
  try {
    await apiServidor<void>("/api/auth/verificacion/reenvio", { metodo: "POST", cuerpo: { correo, canal } });
    return {};
  } catch (error) {
    return resultadoDesde(error);
  }
}

export async function solicitarRecuperacion(_previo: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const correo = z.string().trim().email().safeParse(datos.get("correo"));
  if (!correo.success) return { error: "Escribe un correo válido.", errores: { correo: "Escribe un correo válido." } };
  try {
    await apiServidor<void>("/api/auth/contrasena/recuperacion", { metodo: "POST", cuerpo: { correo: correo.data } });
    return {};
  } catch (error) {
    return resultadoDesde(error);
  }
}

const esquemaRestablecer = z
  .object({
    correo: z.string().trim().email(),
    codigo: z.string().trim().regex(/^\d{6}$/, "El código tiene 6 dígitos."),
    nuevaContrasena: z
      .string()
      .min(8, "Mínimo 8 caracteres.")
      .max(72)
      .refine((valor) => /[A-Za-z]/.test(valor) && /\d/.test(valor), "Incluye letras y números."),
    confirmacion: z.string(),
  })
  .refine((datos) => datos.nuevaContrasena === datos.confirmacion, {
    path: ["confirmacion"],
    message: "Las contraseñas no coinciden.",
  });

export async function restablecerContrasena(_previo: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const entrada = esquemaRestablecer.safeParse({
    correo: datos.get("correo"),
    codigo: datos.get("codigo"),
    nuevaContrasena: datos.get("nuevaContrasena"),
    confirmacion: datos.get("confirmacion"),
  });
  if (!entrada.success) {
    const errores: Record<string, string> = {};
    for (const problema of entrada.error.issues) errores[String(problema.path[0])] = problema.message;
    return { error: "Revisa los datos marcados.", errores };
  }
  try {
    await apiServidor<void>("/api/auth/contrasena/restablecimiento", {
      metodo: "POST",
      cuerpo: {
        correo: entrada.data.correo,
        codigo: entrada.data.codigo,
        nuevaContrasena: entrada.data.nuevaContrasena,
      },
    });
    return {};
  } catch (error) {
    return resultadoDesde(error);
  }
}

// ------------------------------------------------------------ perfil (RF-04)

const esquemaPerfil = z.object({
  nombre: z.string().trim().min(3, "Escribe tu nombre completo.").max(120),
  telefono: z
    .string()
    .trim()
    .transform((valor) => valor.replace(/[\s()-]/g, ""))
    .refine((valor) => valor === "" || /^\+?\d{10,15}$/.test(valor), "Escribe 10 a 15 dígitos."),
});

export async function actualizarPerfil(_previo: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const entrada = esquemaPerfil.safeParse({ nombre: datos.get("nombre"), telefono: datos.get("telefono") ?? "" });
  if (!entrada.success) {
    const errores: Record<string, string> = {};
    for (const problema of entrada.error.issues) errores[String(problema.path[0])] = problema.message;
    return { error: "Revisa los datos marcados.", errores };
  }
  try {
    await apiServidor<UsuarioDto>("/api/usuarios/me", {
      metodo: "PUT",
      cuerpo: { nombre: entrada.data.nombre, telefono: entrada.data.telefono || null },
    });
  } catch (error) {
    return resultadoDesde(error);
  }
  redirect(RUTAS.cuenta);
}

const esquemaCambioContrasena = z
  .object({
    actual: z.string().min(1, "Escribe tu contraseña actual."),
    nueva: z
      .string()
      .min(8, "Mínimo 8 caracteres.")
      .max(72)
      .refine((valor) => /[A-Za-z]/.test(valor) && /\d/.test(valor), "Incluye letras y números."),
    confirmacion: z.string(),
  })
  .refine((datos) => datos.nueva === datos.confirmacion, {
    path: ["confirmacion"],
    message: "Las contraseñas no coinciden.",
  });

export async function cambiarContrasena(_previo: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const entrada = esquemaCambioContrasena.safeParse({
    actual: datos.get("actual"),
    nueva: datos.get("nueva"),
    confirmacion: datos.get("confirmacion"),
  });
  if (!entrada.success) {
    const errores: Record<string, string> = {};
    for (const problema of entrada.error.issues) errores[String(problema.path[0])] = problema.message;
    return { error: "Revisa los datos marcados.", errores };
  }
  try {
    await apiServidor<void>("/api/usuarios/me/contrasena", {
      metodo: "PUT",
      cuerpo: { actual: entrada.data.actual, nueva: entrada.data.nueva },
    });
    return {};
  } catch (error) {
    return resultadoDesde(error);
  }
}

export async function convertirseEnOrganizador(): Promise<ResultadoAccion> {
  try {
    await apiServidor<UsuarioDto>("/api/usuarios/me/roles/organizador", { metodo: "POST" });
    return {};
  } catch (error) {
    return resultadoDesde(error);
  }
}

export async function dejarDeSerOrganizador(): Promise<ResultadoAccion> {
  try {
    await apiServidor<UsuarioDto>("/api/usuarios/me/roles/organizador", { metodo: "DELETE" });
    return {};
  } catch (error) {
    return resultadoDesde(error);
  }
}
