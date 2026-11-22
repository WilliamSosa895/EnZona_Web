import type { Metadata } from "next";
import { sesionActual } from "@/lib/sesion/servidor";
import { usuarios as listarUsuarios } from "@/features/admin/api";
import { TablaUsuarios } from "@/features/admin/TablaUsuarios";

export const metadata: Metadata = { title: "Usuarios · Administración" };

export default async function PaginaAdminUsuarios({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  const [consulta, sesion] = await Promise.all([searchParams, sesionActual()]);
  const lista = await listarUsuarios({ q: consulta.q, estado: consulta.estado });
  return <TablaUsuarios usuarios={lista.elementos} total={lista.paginacion.total} idPropio={sesion?.usuario.id ?? 0} filtroTexto={consulta.q ?? ""} filtroEstado={consulta.estado ?? ""} />;
}
