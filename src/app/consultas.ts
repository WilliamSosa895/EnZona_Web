import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/http';

/**
 * Caché de datos del servidor. Solo se reintenta ante fallas de red o del servidor (5xx); un 4xx es una
 * respuesta definitiva y reintentarlo no cambia el resultado.
 */
export function crearClienteConsultas(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        retry: (intentos, error) =>
          intentos < 2 && error instanceof ApiError && (error.status === 0 || error.status >= 500),
      },
      mutations: { retry: false },
    },
  });
}

/** Claves de caché centralizadas para invalidar de forma consistente. */
export const claves = {
  eventos: (filtro: unknown) => ['eventos', filtro] as const,
  evento: (id: number) => ['evento', id] as const,
  asientos: (id: number) => ['asientos', id] as const,
  categorias: ['categorias'] as const,
  misBoletos: ['boletos'] as const,
  boleto: (id: number) => ['boleto', id] as const,
  orden: (id: number) => ['orden', id] as const,
  perfil: ['perfil'] as const,
  eventosOrganizador: ['organizador', 'eventos'] as const,
  reporte: (id: number) => ['reporte', id] as const,
  politica: (id: number) => ['politica', id] as const,
  validadores: (id: number) => ['validadores', id] as const,
  adminUsuarios: (filtro: unknown) => ['admin', 'usuarios', filtro] as const,
  adminEventos: (filtro: unknown) => ['admin', 'eventos', filtro] as const,
};
