import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { Cascaron } from "@/components/navegacion/Cascaron";
import { CampanaBoleto } from "@/components/marca/CampanaBoleto";
import { BotonEnlace } from "@/components/ui/Boton";
import { Tarjeta } from "@/components/ui/Superficies";
import { RUTAS } from "@/lib/rutas";
import { sesionActual } from "@/lib/sesion/servidor";

export const metadata: Metadata = { title: "Notificaciones" };

/*
 * Notificaciones (NotificacionesScreen v6): con EnZona_Api no hay centro de
 * notificaciones dentro de la app; los avisos llegan por correo. La pantalla
 * lo explica, igual que en Android.
 */
export default async function PaginaNotificaciones() {
  const sesion = await sesionActual();
  return (
    <Cascaron ancho="angosto">
      <div className="flex items-center gap-2">
        <Link href={RUTAS.inicio} aria-label="Volver a Inicio" className="flex size-11 items-center justify-center rounded-pildora text-tinta hover:bg-superficie-alta">
          <ArrowLeft className="size-6" />
        </Link>
        <h1 className="titulo-vivo text-[2rem] font-black tracking-tight text-tinta">Notificaciones</h1>
      </div>

      <Tarjeta className="mt-6 flex flex-col items-center gap-4 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-tinte-50">
          <CampanaBoleto className="size-10" />
        </span>
        <h2 className="text-xl font-semibold text-tinta">Tus avisos llegan por correo</h2>
        <p className="max-w-md text-[17px] leading-relaxed text-gris-texto">
          EnZona te escribe a{" "}
          {sesion?.usuario.correo ? <span className="font-medium text-tinta">{sesion.usuario.correo}</span> : "tu correo registrado"}{" "}
          cuando compras o confirmas boletos, cuando un evento al que vas cambia de fecha o lugar y si se cancela.
        </p>
        <p className="flex items-center gap-2 text-[15px] text-gris-texto">
          <Mail className="size-5" aria-hidden="true" />
          Si no ves un aviso, revisa la carpeta de correo no deseado.
        </p>
        <BotonEnlace href={RUTAS.misBoletos} variante="contorno">
          Ver mis boletos
        </BotonEnlace>
      </Tarjeta>
    </Cascaron>
  );
}
