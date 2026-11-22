import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

/*
 * La sesión es el JWT de EnZona_Api (60 min por defecto). Se guarda en una
 * cookie httpOnly que el navegador nunca lee: el intermediario de Next la
 * convierte en `Authorization: Bearer`. Es el equivalente web de
 * `EncryptedSharedPreferences` en la app Android.
 */

export const NOMBRE_COOKIE_TOKEN = process.env.ENZONA_COOKIE?.trim() || "enzona_sesion";
/** true cuando la sesión se abrió por «Acceso para organizadores y personal». */
export const NOMBRE_COOKIE_PERSONAL = `${NOMBRE_COOKIE_TOKEN}_personal`;

/** Vigencia por defecto cuando la API no informa `expiraEnSegundos`. */
const SEGUNDOS_POR_DEFECTO = 60 * 60;

type CookiesLegibles = Pick<ReadonlyRequestCookies, "get">;

export function leerTokenDeCookies(cookies: CookiesLegibles): string | null {
  return cookies.get(NOMBRE_COOKIE_TOKEN)?.value ?? null;
}

export function leerAccesoPersonal(cookies: CookiesLegibles): boolean {
  return cookies.get(NOMBRE_COOKIE_PERSONAL)?.value === "1";
}

export function opcionesCookieSesion(expiraEnSegundos?: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: expiraEnSegundos && expiraEnSegundos > 0 ? expiraEnSegundos : SEGUNDOS_POR_DEFECTO,
  };
}
