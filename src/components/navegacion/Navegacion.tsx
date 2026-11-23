"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, ScanLine, ShieldCheck, Ticket, User } from "lucide-react";
import type { Rol } from "@/lib/api/tipos";
import { cn } from "@/lib/cn";
import { RUTAS } from "@/lib/rutas";
import { LogoEnZona } from "@/components/marca/LogoEnZona";

/*
 * Navegación por rol y por tipo de acceso, igual que la barra inferior de la app:
 *  - acceso normal: Inicio · Mis boletos · (Mis eventos) · (Admin) · Perfil
 *  - acceso de personal: solo las pestañas del personal · Perfil
 *      organizador → Mis eventos · validador → Escanear · administrador → Admin
 * Nunca más de cinco pestañas. En escritorio es una cabecera; en móvil, barra
 * fija inferior.
 */

interface Destino {
  href: string;
  texto: string;
  icono: typeof Home;
  activo: (ruta: string) => boolean;
}

const INICIO: Destino = { href: RUTAS.inicio, texto: "Inicio", icono: Home, activo: (r) => r === "/" || r.startsWith("/evento") || r.startsWith("/notificaciones") };
const MIS_BOLETOS: Destino = {
  href: RUTAS.misBoletos,
  texto: "Mis boletos",
  icono: Ticket,
  activo: (r) => r.startsWith("/mis-boletos") || r.startsWith("/boleto") || r.startsWith("/orden"),
};
const MIS_EVENTOS: Destino = { href: RUTAS.misEventos, texto: "Mis eventos", icono: CalendarDays, activo: (r) => r.startsWith("/mis-eventos") };
const ESCANEAR: Destino = { href: RUTAS.escanear, texto: "Escanear", icono: ScanLine, activo: (r) => r.startsWith("/escanear") };
const ADMIN: Destino = { href: RUTAS.admin, texto: "Admin", icono: ShieldCheck, activo: (r) => r.startsWith("/admin") };

export function destinosPara(roles: Rol[], accesoPersonal: boolean, conSesion: boolean): Destino[] {
  const perfil: Destino = {
    href: conSesion ? RUTAS.cuenta : RUTAS.login,
    texto: conSesion ? "Perfil" : "Entrar",
    icono: User,
    activo: (r) => r.startsWith("/cuenta") || r.startsWith("/login"),
  };
  const esPersonal = roles.some((rol) => rol !== "ASISTENTE");

  if (accesoPersonal && esPersonal) {
    const destinos: Destino[] = [];
    if (roles.includes("ORGANIZADOR")) destinos.push(MIS_EVENTOS);
    if (roles.includes("VALIDADOR")) destinos.push(ESCANEAR);
    if (roles.includes("ADMIN")) destinos.push(ADMIN);
    return [...destinos, perfil];
  }

  const destinos: Destino[] = [INICIO, MIS_BOLETOS];
  if (roles.includes("ORGANIZADOR")) destinos.push(MIS_EVENTOS);
  if (roles.includes("VALIDADOR") && !roles.includes("ORGANIZADOR")) destinos.push(ESCANEAR);
  if (roles.includes("ADMIN")) destinos.push(ADMIN);
  return [...destinos, perfil].slice(0, 5);
}

interface PropsNavegacion {
  roles: Rol[];
  accesoPersonal: boolean;
  conSesion: boolean;
  nombre?: string;
}

export function Cabecera({ roles, accesoPersonal, conSesion, nombre }: PropsNavegacion) {
  const ruta = usePathname();
  const destinos = destinosPara(roles, accesoPersonal, conSesion);
  return (
    <header className="sticky top-0 z-30 hidden border-b border-linea bg-fondo/90 backdrop-blur md:block">
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between gap-6 px-6">
        <Link href={accesoPersonal && roles.some((rol) => rol !== "ASISTENTE") ? destinos[0].href : RUTAS.inicio} aria-label="EnZona, inicio" className="flex items-center rounded-campo">
          <LogoEnZona alto={40} />
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-1">
          {destinos.map((destino) => {
            const activo = destino.activo(ruta);
            const Icono = destino.icono;
            return (
              <Link
                key={destino.href}
                href={destino.href}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "nav-vivo flex h-11 items-center gap-2 rounded-pildora px-4 text-[15px] font-medium",
                  activo ? "bg-marino text-blanco" : "text-gris-texto hover:bg-tinte-50 hover:text-tinta",
                )}
              >
                <Icono className="size-5" aria-hidden="true" />
                <span>{destino.texto === "Perfil" && nombre ? primerNombre(nombre) : destino.texto}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export function BarraInferior({ roles, accesoPersonal, conSesion }: PropsNavegacion) {
  const ruta = usePathname();
  const destinos = destinosPara(roles, accesoPersonal, conSesion);
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-superficie pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto flex h-(--barra-inferior) max-w-xl items-stretch justify-around px-1">
        {destinos.map((destino) => {
          const activo = destino.activo(ruta);
          const Icono = destino.icono;
          return (
            <li key={destino.href} className="flex min-w-0 flex-1">
              <Link
                href={destino.href}
                aria-current={activo ? "page" : undefined}
                className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 text-[11px] font-medium"
              >
                <span
                  className={cn(
                    "nav-vivo flex h-8 w-14 items-center justify-center rounded-pildora",
                    activo ? "bg-marino text-blanco" : "text-gris-texto",
                  )}
                >
                  <Icono className="size-5" aria-hidden="true" />
                </span>
                <span className={cn("max-w-full truncate", activo ? "text-marino" : "text-gris-texto")}>{destino.texto}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? nombre;
}
