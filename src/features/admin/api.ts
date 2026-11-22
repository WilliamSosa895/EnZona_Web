import "server-only";

import { apiServidorLista } from "@/lib/api/servidor";
import type { ListaPaginada, UsuarioDto } from "@/lib/api/tipos";
import { TAMANO_PAGINA } from "@/lib/api/tipos";

export function usuarios(filtros: { estado?: string | null; q?: string | null; page?: number } = {}): Promise<ListaPaginada<UsuarioDto>> {
  return apiServidorLista<UsuarioDto>("/api/admin/usuarios", {
    consulta: { estado: filtros.estado, q: filtros.q, size: TAMANO_PAGINA, page: filtros.page ?? 0 },
  });
}
