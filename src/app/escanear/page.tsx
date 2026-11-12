import type { Metadata } from "next";
import { Cascaron } from "@/components/navegacion/Cascaron";
import { TituloPagina } from "@/components/ui/Estados";
import type { EventoDto } from "@/lib/api/tipos";
import { RUTAS } from "@/lib/rutas";
import { exigirRol } from "@/lib/sesion/servidor";
import { eventosPublicados, misEventos, todosLosEventos } from "@/features/eventos/api";
import { Escaner } from "@/features/validacion/Escaner";

export const metadata: Metadata = { title: "Escanear" };

/*
 * Qué eventos puede validar cada cuenta, como en la app: el organizador sus
 * eventos publicados; el administrador todos los publicados; un validador ve el
 * catálogo publicado y el servidor rechaza (403) los eventos donde no fue
 * designado (la API aún no expone «eventos donde estoy designado»).
 */
export default async function PaginaEscanear() {
  const sesion = await exigirRol(["VALIDADOR", "ORGANIZADOR", "ADMIN"], RUTAS.escanear);
  let eventos: EventoDto[] = [];
  if (sesion.roles.includes("ADMIN")) {
    eventos = (await todosLosEventos("PUBLICADO").catch(() => ({ elementos: [] as EventoDto[] }))).elementos;
  } else if (sesion.roles.includes("ORGANIZADOR") && !sesion.roles.includes("VALIDADOR")) {
    eventos = (await misEventos().catch(() => [])).filter((evento) => evento.estado === "PUBLICADO");
  } else {
    const [propios, publicados] = await Promise.all([
      sesion.roles.includes("ORGANIZADOR") ? misEventos().catch(() => []) : Promise.resolve([] as EventoDto[]),
      eventosPublicados({ ciudad: null }).then((lista) => lista.elementos).catch(() => [] as EventoDto[]),
    ]);
    const vistos = new Set<number>();
    eventos = [...propios.filter((evento) => evento.estado === "PUBLICADO"), ...publicados].filter((evento) => {
      if (vistos.has(evento.id)) return false;
      vistos.add(evento.id);
      return true;
    });
  }
  eventos.sort((a, b) => new Date(a.fechaHoraInicio).getTime() - new Date(b.fechaHoraInicio).getTime());

  return (
    <Cascaron ancho="angosto">
      <TituloPagina titulo="Escanear" subtitulo="Valida los boletos en la puerta" className="mb-5" />
      <Escaner eventos={eventos} />
    </Cascaron>
  );
}
