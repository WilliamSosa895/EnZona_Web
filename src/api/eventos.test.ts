import { describe, expect, it } from 'vitest';
import { base } from '@/mocks/manejadores';
import { sesionComo } from '@/test/utilidades';
import { ApiError } from './http';
import { eventosApi } from './eventos';

describe('portada del evento (POST/DELETE /api/eventos/{id}/imagen)', () => {
  it('sube la imagen como multipart en el campo «imagen» y la quita', async () => {
    sesionComo('organizador@uv.mx', true);
    const evento = base().eventos.find((e) => e.organizadorId === 2 && e.estado === 'PUBLICADO')!;
    const con = await eventosApi.subirImagen(
      evento.id,
      new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' }),
    );
    expect(con.imagenUrl).toBeTruthy();
    const sin = await eventosApi.quitarImagen(evento.id);
    expect(sin.imagenUrl).toBeNull();
  });

  it('solo el organizador dueño o un administrador cambia la portada', async () => {
    sesionComo('asistente@uv.mx');
    const evento = base().eventos[0];
    await expect(eventosApi.quitarImagen(evento.id)).rejects.toSatisfy(
      (e) => e instanceof ApiError && e.codigo === 'ACCESO_DENEGADO',
    );
  });
});
