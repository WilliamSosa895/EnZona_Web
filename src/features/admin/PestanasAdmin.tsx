"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { RUTAS } from "@/lib/rutas";

const PESTANAS = [
  { href: RUTAS.admin, texto: "Resumen", exacta: true },
  { href: RUTAS.adminUsuarios, texto: "Usuarios", exacta: false },
  { href: RUTAS.adminEventos, texto: "Eventos", exacta: false },
];

/** Pestañas del panel de administración: la activa en coral con línea azul marino, como en la app. */
export function PestanasAdmin() {
  const ruta = usePathname();
  return (
    <nav aria-label="Secciones de administración" className="mt-6 border-b border-linea">
      <ul className="flex">
        {PESTANAS.map((pestana) => {
          const activa = pestana.exacta ? ruta === pestana.href : ruta.startsWith(pestana.href);
          return (
            <li key={pestana.href} className="flex-1">
              <Link
                href={pestana.href}
                aria-current={activa ? "page" : undefined}
                className={cn(
                  "flex h-12 items-center justify-center border-b-[3px] text-[17px] font-medium transition-colors",
                  activa ? "border-marino text-coral" : "border-transparente text-gris-texto hover:text-tinta",
                )}
              >
                {pestana.texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
