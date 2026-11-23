import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, CircleHelp, FileText, Globe, LocateFixed, MapPin, Megaphone, ShieldAlert, ShieldCheck, UserPen } from "lucide-react";
import { Cascaron } from "@/components/navegacion/Cascaron";
import { TituloPagina } from "@/components/ui/Estados";
import { EtiquetaRol } from "@/components/ui/Etiquetas";
import { Tarjeta } from "@/components/ui/Superficies";
import { CIUDAD_POR_DEFECTO } from "@/lib/capacidades";
import { RUTAS } from "@/lib/rutas";
import { exigirSesion } from "@/lib/sesion/servidor";
import { misEventos } from "@/features/eventos/api";
import { BotonCerrarSesion, TarjetaRolOrganizador } from "@/features/cuenta/AccionesCuenta";
import { FilaReiniciarGuias } from "@/features/guias/FilaReiniciarGuias";
import paquete from "../../../package.json";

export const metadata: Metadata = { title: "Mi cuenta" };

/*
 * Mi cuenta (ProfileScreen): avatar con inicial, identidad verificada, roles,
 * tarjeta «¿Quieres publicar tus propios eventos?», ajustes de localización,
 * preferencias y ayuda. Sin «Métodos de pago»: la API no los implementa.
 */
export default async function PaginaCuenta() {
  const sesion = await exigirSesion(RUTAS.cuenta);
  const { usuario, roles } = sesion;
  const esOrganizador = roles.includes("ORGANIZADOR");
  const esAdmin = roles.includes("ADMIN");

  // Dejar de ser organizador se bloquea con eventos publicados vigentes, si es el único rol o si es administrador.
  let motivoNoDejar: string | null = null;
  if (esOrganizador) {
    if (esAdmin) motivoNoDejar = "Una cuenta administradora conserva el rol de organizador.";
    else if (roles.length === 1) motivoNoDejar = "Es tu único rol: no puedes quedarte sin ninguno.";
    else {
      const eventos = await misEventos().catch(() => []);
      if (eventos.some((evento) => evento.estado === "PUBLICADO" && evento.disponibles < evento.aforo)) {
        motivoNoDejar = "Tienes eventos publicados con boletos vigentes. Cancélalos o espera a que se realicen.";
      }
    }
  }

  return (
    <Cascaron ancho="angosto">
      <TituloPagina titulo="Mi cuenta" />
      <div className="mt-6 flex flex-col gap-6">
        <Tarjeta className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-degradado-inicio to-enzona text-3xl font-bold text-blanco"
          >
            {usuario.nombre.trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-2xl font-semibold text-tinta">{usuario.nombre}</p>
            <p className="truncate text-[15px] text-gris-texto">{usuario.correo}</p>
            <p className="mt-1 flex items-center gap-1.5 text-[15px] font-medium text-sobre-exito">
              <span aria-hidden="true" className="size-2 rounded-full bg-exito" />
              Identidad verificada
            </p>
          </div>
        </Tarjeta>

        <div className="flex flex-wrap gap-2">
          {roles.map((rol) => (
            <EtiquetaRol key={rol} rol={rol} />
          ))}
        </div>

        {!esOrganizador ? (
          <TarjetaRolOrganizador modo="convertirse" />
        ) : (
          <TarjetaRolOrganizador modo="dejar" motivoBloqueo={motivoNoDejar} />
        )}

        <Grupo titulo="Ajustes de localización">
          <Fila icono={<MapPin />} titulo="Mi ubicación" valor={`${CIUDAD_POR_DEFECTO}, Veracruz`} />
          <Fila icono={<Globe />} titulo="Mi país" valor="México" />
          <Fila
            icono={<LocateFixed />}
            titulo="Contenido basado en mi ubicación"
            detalle="Se activa con «Cerca de mí» en Inicio"
            accion={<InterruptorApagado etiqueta="Contenido basado en mi ubicación" />}
          />
        </Grupo>

        <Grupo titulo="Preferencias">
          <Fila icono={<UserPen />} titulo="Editar mis datos" detalle="Nombre y teléfono" href={RUTAS.editarDatos} />
          <Fila icono={<ShieldCheck />} titulo="Seguridad" detalle="Contraseña y verificación de la cuenta" href={RUTAS.seguridad} />
        </Grupo>

        <Grupo titulo="Ayuda">
          <Fila icono={<CircleHelp />} titulo="¿Necesitas ayuda?" href={RUTAS.ayuda} />
          <FilaReiniciarGuias usuarioId={usuario.id} />
          <Fila icono={<ShieldAlert />} titulo="Privacidad" href={RUTAS.privacidad} />
          <Fila icono={<FileText />} titulo="Legal" href={RUTAS.legal} />
        </Grupo>

        {esOrganizador || esAdmin || roles.includes("VALIDADOR") ? (
          <Grupo titulo="Mi trabajo en EnZona">
            {esOrganizador ? <Fila icono={<Megaphone />} titulo="Mis eventos" href={RUTAS.misEventos} /> : null}
          </Grupo>
        ) : null}

        <BotonCerrarSesion />
        <p className="text-sm text-gris-texto">EnZona · versión {paquete.version} (piloto)</p>
      </div>
    </Cascaron>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`grupo-${titulo}`} className="flex flex-col gap-2">
      <h2 id={`grupo-${titulo}`} className="px-1 text-xl font-semibold text-tinta">
        {titulo}
      </h2>
      <div className="divide-y divide-linea rounded-tarjeta bg-superficie">{children}</div>
    </section>
  );
}

/** Interruptor apagado y sin acción: el permiso de ubicación se da al tocar «Cerca de mí» en Inicio. */
function InterruptorApagado({ etiqueta }: { etiqueta: string }) {
  return (
    <span role="switch" aria-checked="false" aria-disabled="true" aria-label={etiqueta} className="relative h-8 w-14 shrink-0 rounded-pildora bg-tinte-200 opacity-60">
      <span aria-hidden="true" className="absolute top-1 left-0 size-6 translate-x-1 rounded-full bg-blanco shadow-tarjeta" />
    </span>
  );
}

function Fila({
  icono,
  titulo,
  detalle,
  valor,
  href,
  accion,
}: {
  icono: React.ReactNode;
  titulo: string;
  detalle?: string;
  valor?: string;
  href?: string;
  accion?: React.ReactNode;
}) {
  const contenido = (
    <>
      <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center text-gris-texto [&>svg]:size-6">
        {icono}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[17px] text-tinta">{titulo}</span>
        {detalle ? <span className="text-[15px] text-gris-texto">{detalle}</span> : null}
      </span>
      {valor ? <span className="text-[15px] text-profundo">{valor}</span> : null}
      {accion}
      {href ? <ChevronRight className="size-5 shrink-0 text-gris-texto" aria-hidden="true" /> : null}
    </>
  );
  if (href) {
    return (
      <Link href={href} className="flex items-center gap-4 px-5 py-4 hover:bg-superficie-baja">
        {contenido}
      </Link>
    );
  }
  return <div className="flex items-center gap-4 px-5 py-4">{contenido}</div>;
}
