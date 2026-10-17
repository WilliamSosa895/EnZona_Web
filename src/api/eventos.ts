import { peticion, peticionPaginada } from './http';
import type {
  Asiento,
  CancelacionRespuesta,
  Categoria,
  Evento,
  EventoSolicitud,
  FiltroEventos,
  PoliticaCancelacion,
  Reporte,
  Validador,
} from './tipos';

/** Módulos de eventos, cancelación y reportes (RF-05 a RF-09, RF-13, RF-14, RF-17, RF-19). */
export const eventosApi = {
  listar: (filtro: FiltroEventos, senal?: AbortSignal) =>
    peticionPaginada<Evento>('/api/eventos', { consulta: { ...filtro }, senal }),

  detalle: (id: number, senal?: AbortSignal) => peticion<Evento>('GET', `/api/eventos/${id}`, { senal }),

  categorias: (senal?: AbortSignal) => peticion<Categoria[]>('GET', '/api/categorias', { senal, autenticada: false }),

  delOrganizador: (senal?: AbortSignal) => peticion<Evento[]>('GET', '/api/organizador/eventos', { senal }),

  crear: (datos: EventoSolicitud) => peticion<Evento>('POST', '/api/eventos', { cuerpo: datos }),

  modificar: (id: number, datos: EventoSolicitud) => peticion<Evento>('PUT', `/api/eventos/${id}`, { cuerpo: datos }),

  publicar: (id: number) => peticion<Evento>('POST', `/api/eventos/${id}/publicacion`),

  asientos: (id: number, senal?: AbortSignal) => peticion<Asiento[]>('GET', `/api/eventos/${id}/asientos`, { senal }),

  validadores: (id: number, senal?: AbortSignal) =>
    peticion<Validador[]>('GET', `/api/eventos/${id}/validadores`, { senal }),

  designarValidador: (id: number, correo: string) =>
    peticion<Validador>('POST', `/api/eventos/${id}/validadores`, { cuerpo: { correo } }),

  retirarValidador: (id: number, usuarioId: number) =>
    peticion<void>('DELETE', `/api/eventos/${id}/validadores/${usuarioId}`),

  politicaCancelacion: (id: number, senal?: AbortSignal) =>
    peticion<PoliticaCancelacion>('GET', `/api/eventos/${id}/politica-cancelacion`, { senal }),

  cancelar: (id: number, motivo: string | null) =>
    peticion<CancelacionRespuesta>('POST', `/api/eventos/${id}/cancelacion`, { cuerpo: { motivo } }),

  reporte: (id: number, senal?: AbortSignal) => peticion<Reporte>('GET', `/api/eventos/${id}/reportes`, { senal }),
};
