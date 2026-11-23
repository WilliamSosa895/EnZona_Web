import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Cascaron } from "@/components/navegacion/Cascaron";
import { RUTAS } from "@/lib/rutas";
import { CentroNotificaciones } from "@/features/notificaciones/CentroNotificaciones";

export const metadata: Metadata = { title: "Notificaciones" };

/*
 * Notificaciones (NotificacionesScreen v6): con EnZona_Api no hay centro de
 * notificaciones dentro de la app; los avisos llegan por correo. La pantalla
 * lo explica, igual que en Android.
 */
export default function PaginaNotificaciones() {
  return (
    <Cascaron ancho="angosto">
      <div className="flex items-center gap-2">
        <Link href={RUTAS.inicio} aria-label="Volver a Inicio" className="flex size-11 items-center justify-center rounded-pildora text-tinta hover:bg-superficie-alta">
          <ArrowLeft className="size-6" />
        </Link>
        <h1 className="titulo-vivo text-[2rem] font-black tracking-tight text-tinta">Notificaciones</h1>
      </div>

      <CentroNotificaciones />
    </Cascaron>
  );
}
