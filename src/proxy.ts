import { NextResponse, type NextRequest } from "next/server";
import { NOMBRE_COOKIE_TOKEN } from "@/lib/sesion/cookies";
import { PREFIJOS_PROTEGIDOS, RUTAS, SUFIJOS_PROTEGIDOS_DE_EVENTO } from "@/lib/rutas";

/*
 * Protección de rutas (Next 16 `proxy`): sin cookie de sesión, las pantallas
 * privadas llevan al acceso y guardan a dónde volver. La autorización real por
 * rol la aplica cada página con `exigirRol` y, en última instancia, la API.
 */
export function proxy(peticion: NextRequest) {
  const { pathname, search } = peticion.nextUrl;
  const protegida =
    PREFIJOS_PROTEGIDOS.some((prefijo) => pathname === prefijo || pathname.startsWith(`${prefijo}/`)) ||
    (pathname.startsWith("/evento/") &&
      SUFIJOS_PROTEGIDOS_DE_EVENTO.some((sufijo) => pathname.endsWith(sufijo)));

  if (!protegida) return NextResponse.next();

  const tieneSesion = peticion.cookies.has(NOMBRE_COOKIE_TOKEN);
  if (tieneSesion) return NextResponse.next();

  const destino = new URL(RUTAS.login, peticion.url);
  destino.searchParams.set("volver", `${pathname}${search}`);
  return NextResponse.redirect(destino);
}

export const config = {
  matcher: ["/((?!api|_next|icon.svg|logo|favicon.ico).*)"],
};
