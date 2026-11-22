"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, ScanLine, ShieldCheck, Ticket, User } from "lucide-react";
import type { Rol } from "@/lib/api/tipos";
import { cn } from "@/lib/cn";
import { RUTAS } from "@/lib/rutas";
import { LogoEnZona } from "@/components/marca/LogoEnZona";

/*
 * Navegación por rol, igual que la barra inferior de la app:
 *  - asistente: Inicio · Mis boletos · Perfil
 *  - organizador: + Mis eventos
 *  - administrador: + Admin
 *  - validador que entró por el acceso de personal: Escanear · Perfil
 * En escritorio es una cabecera; en móvil, barra fija inferior.
 */

interface Destino {
  href: string;
  texto: string;
  icono: typeof Home;
  activo: (ruta: string) => boolean;
}

export function destinosPara(roles: Rol[], accesoPersonal: boolean, conSesion: boolean): Destino[] {
  const soloValidador = accesoPersonal && roles.includes("VALIDADOR") && !roles.includes("ORGANIZADOR") && !roles.includes("ADMIN");
  if (soloValidador) {
    return [
      { href: RUTAS.escanear, texto: "Escanear", icono: ScanLine, activo: (r) => r.startsWith("/escanear") },
      { href: RUTAS.cuenta, texto: "Perfil", icono: User, activo: (r) => r.startsWith("/cuenta") },
    ];
  }
  const destinos: Destino[] = [
    { href: RUTAS.inicio, texto: "Inicio", icono: Home, activo: (r) => r === "/" || r.startsWith("/evento") },
    {
      href: RUTAS.misBoletos,
      texto: "Mis boletos",
      icono: Ticket,
      activo: (r) => r.startsWith("/mis-boletos") || r.startsWith("/boleto") || r.startsWith("/orden"),
    },
  ];
  if (roles.includes("ORGANIZADOR")) {
    destinos.push({
      href: RUTAS.misEventos,
      texto: "Mis eventos",
      icono: CalendarDays,
      activo: (r) => r.startsWith("/mis-eventos"),
    });
  }
  if (roles.includes("VALIDADOR") || roles.includes("ORGANIZADOR") || roles.includes("ADMIN")) {
    destinos.push({ href: RUTAS.escanear, texto: "Escanear", icono: ScanLine, activo: (r) => r.startsWith("/escanear") });
  }
  if (roles.includes("ADMIN")) {
    destinos.push({ href: RUTAS.admin, texto: "Admin", icono: ShieldCheck, activo: (r) => r.startsWith("/admin") });
  }
  destinos.push({
    href: conSesion ? RUTAS.cuenta : RUTAS.login,
    texto: conSesion ? "Perfil" : "Entrar",
    icono: User,
    activo: (r) => r.startsWith("/cuenta") || r.startsWith("/login"),
  });
  return destinos;
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
        <Link href={RUTAS.inicio} aria-label="EnZona, inicio" className="flex items-center rounded-campo">
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
      <ul className="mx-auto flex h-(--barra-inferior) max-w-xl items-stretch justify-around px-2">
        {destinos.map((destino) => {
          const activo = destino.activo(ruta);
          const Icono = destino.icono;
          return (
            <li key={destino.href} className="flex flex-1">
              <Link
                href={destino.href}
                aria-current={activo ? "page" : undefined}
                className="flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium"
              >
                <span
                  className={cn(
                    "nav-vivo flex h-8 w-16 items-center justify-center rounded-pildora",
                    activo ? "bg-marino text-blanco" : "text-gris-texto",
                  )}
                >
                  <Icono className="size-5" aria-hidden="true" />
                </span>
                <span className={activo ? "text-marino" : "text-gris-texto"}>{destino.texto}</span>
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
