import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { servidor } from '@/mocks/servidor';
import { ApiError, configurarSesion, peticion, peticionPaginada } from './http';
import { eventosApi } from './eventos';
import { mensajeDeError } from '@/lib/errores';

describe('cliente HTTP de la API', () => {
  it('lee la paginación de las cabeceras X-*', async () => {
    const pagina = await eventosApi.listar({ ciudad: 'Orizaba', size: 2 });
    expect(pagina.elementos).toHaveLength(2);
    expect(pagina.total).toBe(5);
    expect(pagina.totalPaginas).toBe(3);
  });

  it('convierte Problem Details en ApiError con su código', async () => {
    const error = await peticion('GET', '/api/eventos/999').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).codigo).toBe('NO_ENCONTRADO');
    expect(mensajeDeError(error)).toMatch(/No encontramos/);
  });

  it('envía el token y avisa si la API responde 401', async () => {
    const alNoAutenticado = vi.fn();
    configurarSesion({ obtenerToken: () => 'token-vencido', alNoAutenticado });
    let cabecera: string | null = null;
    servidor.use(
      http.get('http://localhost:8080/api/boletos', ({ request }) => {
        cabecera = request.headers.get('Authorization');
        return HttpResponse.json({ status: 401, codigo: 'NO_AUTENTICADO' }, { status: 401 });
      }),
    );
    await expect(peticion('GET', '/api/boletos')).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
    expect(cabecera).toBe('Bearer token-vencido');
    expect(alNoAutenticado).toHaveBeenCalledOnce();
    configurarSesion({ obtenerToken: () => null, alNoAutenticado: () => undefined });
  });

  it('no envía el token a los endpoints públicos', async () => {
    configurarSesion({ obtenerToken: () => 'token', alNoAutenticado: () => undefined });
    let cabecera: string | null = 'sin leer';
    servidor.use(
      http.get('http://localhost:8080/api/categorias', ({ request }) => {
        cabecera = request.headers.get('Authorization');
        return HttpResponse.json([]);
      }),
    );
    await eventosApi.categorias();
    expect(cabecera).toBeNull();
    configurarSesion({ obtenerToken: () => null, alNoAutenticado: () => undefined });
  });

  it('una falla de red se reporta como SIN_CONEXION', async () => {
    servidor.use(http.get('http://localhost:8080/api/categorias', () => HttpResponse.error()));
    await expect(eventosApi.categorias()).rejects.toMatchObject({ codigo: 'SIN_CONEXION', status: 0 });
  });

  it('muestra el detalle en errores de regla de negocio y el campo en VALIDACION', async () => {
    servidor.use(
      http.get('http://localhost:8080/api/x', () =>
        HttpResponse.json({ status: 422, codigo: 'REGLA_NEGOCIO', detail: 'La suma supera el aforo' }, { status: 422 }),
      ),
    );
    const error = await peticionPaginada('/api/x').catch((e: unknown) => e);
    expect(mensajeDeError(error)).toBe('La suma supera el aforo');
    const validacion = new ApiError({
      status: 400,
      codigo: 'VALIDACION',
      errores: [{ campo: 'curp', mensaje: 'CURP inválido' }],
    });
    expect(validacion.errorDeCampo('curp')).toBe('CURP inválido');
    expect(mensajeDeError(validacion)).toBe('CURP inválido');
  });
});
