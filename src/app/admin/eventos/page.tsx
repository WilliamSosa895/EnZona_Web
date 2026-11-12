import type { Metadata } from "next";
import { todosLosEventos, politicaCancelacion } from "@/features/eventos/api";
import { sesionActual } from "@/lib/sesion/servidor";
import { ListaEventosAdmin } from "@/features/admin/ListaEventosAdmin";

export const metadata: Metadata = { title: "Eventos · Administración" };

export default async function PaginaAdminEventos({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const [consulta, sesion] = await Promise.all([searchParams, sesionActual()]);
  const lista = await todosLosEventos(consulta.estado || null);
  const eventos = [...lista.elementos].sort((a, b) => new Date(b.fechaHoraInicio).getTime() - new Date(a.fechaHoraInicio).getTime());
  const politicas = await Promise.all(
    eventos.map((evento) =>
      evento.estado === "PUBLICADO" || evento.estado === "BORRADOR" ? politicaCancelacion(evento.id).catch(() => null) : Promise.resolve(null),
    ),
  );
  return (
    <ListaEventosAdmin
      eventos={eventos.map((evento, indice) => ({ evento, politica: politicas[indice] }))}
      total={lista.paginacion.total}
      filtroEstado={consulta.estado ?? ""}
      idAdmin={sesion?.usuario.id ?? 0}
    />
  );
}
