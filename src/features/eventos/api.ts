import "server-only";

import { apiPublica, apiServidor, apiServidorLista } from "@/lib/api/servidor";
import type {
  AsientoDto,
  CategoriaDto,
  EventoDto,
  EventoSolicitudDto,
  ListaPaginada,
  ReporteDto,
  ValidadorDto,
  PoliticaCancelacionDto,
  CancelacionDto,
  CancelacionResultadoDto,
} from "@/lib/api/tipos";
import { TAMANO_PAGINA } from "@/lib/api/tipos";
import { RADIO_CERCA_KM } from "@/lib/capacidades";

/*
 * Lectura de eventos desde el servidor (componentes de servidor). Equivale a
 * las funciones de eventos de `RepositorioRemoto` en la app Android.
 */

export interface FiltrosCatalogo {
  ciudad?: string | null;
  lat?: number | null;
  lng?: number | null;
  q?: string | null;
  categoriaId?: number | null;
  esDePago?: boolean | null;
  desde?: string | null;
  hasta?: string | null;
  page?: number;
}

/** Eventos publicados: con `lat`/`lng` la API ordena por distancia (CP-17); sin ellos filtra por ciudad. */
export function eventosPublicados(filtros: FiltrosCatalogo = {}): Promise<ListaPaginada<EventoDto>> {
  const conUbicacion = filtros.lat != null && filtros.lng != null;
  return apiServidorLista<EventoDto>("/api/eventos", {
    consulta: {
      ciudad: conUbicacion ? undefined : filtros.ciudad,
      lat: conUbicacion ? filtros.lat : undefined,
      lng: conUbicacion ? filtros.lng : undefined,
      radioKm: conUbicacion ? RADIO_CERCA_KM : undefined,
      q: filtros.q,
      categoriaId: filtros.categoriaId,
      esDePago: filtros.esDePago,
      desde: filtros.desde,
      hasta: filtros.hasta,
      size: TAMANO_PAGINA,
      page: filtros.page ?? 0,
    },
  });
}

/** Detalle con `tiposBoleto`. Un borrador solo lo ve su organizador o un administrador. */
export function obtenerEvento(id: number | string): Promise<EventoDto> {
  return apiServidor<EventoDto>(`/api/eventos/${id}`);
}

export function asientosDe(eventoId: number | string): Promise<AsientoDto[]> {
  return apiServidor<AsientoDto[]>(`/api/eventos/${eventoId}/asientos`);
}

/** Catálogo público; cambia poco, se cachea 10 minutos. */
export function categorias(): Promise<CategoriaDto[]> {
  return apiPublica<CategoriaDto[]>("/api/categorias", { revalidar: 600 });
}

// ------------------------------------------------------------ organizador

export function misEventos(): Promise<EventoDto[]> {
  return apiServidor<EventoDto[]>("/api/organizador/eventos");
}

export function reporteDe(eventoId: number | string): Promise<ReporteDto> {
  return apiServidor<ReporteDto>(`/api/eventos/${eventoId}/reportes`);
}

export function validadoresDe(eventoId: number | string): Promise<ValidadorDto[]> {
  return apiServidor<ValidadorDto[]>(`/api/eventos/${eventoId}/validadores`);
}

export function politicaCancelacion(eventoId: number | string): Promise<PoliticaCancelacionDto> {
  return apiServidor<PoliticaCancelacionDto>(`/api/eventos/${eventoId}/politica-cancelacion`);
}

export function cancelarEvento(
  eventoId: number | string,
  solicitud: CancelacionDto,
): Promise<CancelacionResultadoDto> {
  return apiServidor<CancelacionResultadoDto>(`/api/eventos/${eventoId}/cancelacion`, {
    metodo: "POST",
    cuerpo: solicitud,
  });
}

export function crearEvento(datos: EventoSolicitudDto): Promise<EventoDto> {
  return apiServidor<EventoDto>("/api/eventos", { metodo: "POST", cuerpo: datos });
}

export function modificarEvento(eventoId: number | string, datos: EventoSolicitudDto): Promise<EventoDto> {
  return apiServidor<EventoDto>(`/api/eventos/${eventoId}`, { metodo: "PUT", cuerpo: datos });
}

export function publicarEvento(eventoId: number | string): Promise<EventoDto> {
  return apiServidor<EventoDto>(`/api/eventos/${eventoId}/publicacion`, { metodo: "POST" });
}

// ------------------------------------------------------------ administración

export function todosLosEventos(estado?: string | null): Promise<ListaPaginada<EventoDto>> {
  return apiServidorLista<EventoDto>("/api/admin/eventos", {
    consulta: { estado, size: TAMANO_PAGINA },
  });
}
