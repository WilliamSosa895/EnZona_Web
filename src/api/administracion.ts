import { peticion, peticionPaginada } from './http';
import type { EstadoEvento, EstadoUsuario, Evento, UsuarioAdmin } from './tipos';

/** Administración de la plataforma (RF-18). Solo para el rol ADMIN. */
export const administracionApi = {
  usuarios: (filtro: { estado?: EstadoUsuario; q?: string; page?: number; size?: number }, senal?: AbortSignal) =>
    peticionPaginada<UsuarioAdmin>('/api/admin/usuarios', { consulta: filtro, senal }),

  cambiarEstado: (id: number, estado: Extract<EstadoUsuario, 'ACTIVO' | 'BLOQUEADO'>) =>
    peticion<UsuarioAdmin>('PATCH', `/api/admin/usuarios/${id}/estado`, { cuerpo: { estado } }),

  eventos: (filtro: { estado?: EstadoEvento; page?: number; size?: number }, senal?: AbortSignal) =>
    peticionPaginada<Evento>('/api/admin/eventos', { consulta: filtro, senal }),
};
