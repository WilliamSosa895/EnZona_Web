import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { base } from '@/mocks/manejadores';
import { renderizarApp, sesionComo } from '@/test/utilidades';

/** "AAAA-MM-DDTHH:mm" dentro de N días, para el campo datetime-local. */
function enDias(dias: number, hora = '19:00') {
  const d = new Date(Date.now() + dias * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${hora}`;
}

describe('organizador (RF-08, RF-13, RF-14, RF-17)', () => {
  it('un asistente sin el rol no entra al panel del organizador', async () => {
    sesionComo('asistente@uv.mx');
    renderizarApp('/organizador');
    expect(await screen.findByText('Sección no disponible')).toBeInTheDocument();
  });

  it('lista los eventos del organizador con sus métricas', async () => {
    sesionComo('organizador@uv.mx');
    renderizarApp('/organizador');
    expect(await screen.findByText('Torneo de ajedrez rápido (borrador)')).toBeInTheDocument();
    expect(screen.getByText('Publicados')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Nuevo evento/ })).toHaveAttribute('href', '/organizador/eventos/nuevo');
  });

  it('crea un evento gratuito como borrador; publicar exige la ubicación', async () => {
    sesionComo('organizador@uv.mx');
    const { usuario, enrutador } = renderizarApp('/organizador/eventos/nuevo');
    await usuario.type(await screen.findByLabelText('Nombre del evento'), 'Cine al aire libre');
    await usuario.type(screen.getByLabelText('Inicio'), enDias(10));
    await usuario.type(screen.getByLabelText('Lugar (nombre del recinto)'), 'Parque del Agua');
    await usuario.type(screen.getByLabelText('Aforo (lugares totales)'), '120');

    await usuario.click(screen.getByRole('button', { name: 'Crear y publicar' }));
    expect(screen.getByText('Publicar está bloqueado hasta fijar la ubicación en el mapa.')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Guardar como borrador' }));
    await waitFor(() => expect(enrutador.state.location.pathname).toMatch(/^\/organizador\/eventos\/\d+$/));
    const creado = base().eventos.find((e) => e.nombre === 'Cine al aire libre')!;
    expect(creado.estado).toBe('BORRADOR');
    expect(creado.aforo).toBe(120);
    expect(creado.fechaHoraInicio).toMatch(/-06:00$/);
  });

  it('valida que la suma de boletos no supere el aforo en un evento de pago', async () => {
    sesionComo('organizador@uv.mx');
    const { usuario } = renderizarApp('/organizador/eventos/nuevo');
    await usuario.type(await screen.findByLabelText('Nombre del evento'), 'Conferencia');
    await usuario.type(screen.getByLabelText('Inicio'), enDias(5));
    await usuario.type(screen.getByLabelText('Lugar (nombre del recinto)'), 'Aula magna');
    await usuario.click(screen.getByRole('switch', { name: /Evento de pago/ }));
    await usuario.type(screen.getByLabelText('Precio (MXN)'), '50');
    await usuario.type(screen.getByLabelText('Cantidad'), '80');
    await usuario.type(screen.getByLabelText('Aforo (lugares totales)'), '60');
    await usuario.click(screen.getByRole('button', { name: 'Guardar como borrador' }));
    expect(screen.getByText('La suma de boletos (80) supera el aforo (60).')).toBeInTheDocument();
  });

  it('CP-15: no permite reducir el aforo por debajo de lo vendido', async () => {
    sesionComo('organizador@uv.mx');
    const { usuario } = renderizarApp('/organizador/eventos/4/editar');
    const aforo = await screen.findByLabelText('Aforo (lugares totales)');
    await usuario.clear(aforo);
    await usuario.type(aforo, '5');
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(
      screen.getByText('Ya hay 14 lugares vendidos o reservados; el aforo no puede ser menor.'),
    ).toBeInTheDocument();
    expect(base().eventos.find((e) => e.id === 4)!.aforo).toBe(20);
  });

  it('designa personal de acceso por correo', async () => {
    sesionComo('organizador@uv.mx');
    const { usuario } = renderizarApp('/organizador/eventos/2');
    await usuario.type(await screen.findByLabelText('Correo de la persona'), 'asistente@uv.mx');
    await usuario.click(screen.getByRole('button', { name: 'Designar como validador' }));
    expect(await screen.findByText('Ana Asistente ya puede validar accesos de este evento.')).toBeInTheDocument();
    expect(base().usuarios[0].roles).toContain('VALIDADOR');
  });

  it('RF-14: cancela un evento mostrando la política de la API', async () => {
    sesionComo('organizador@uv.mx');
    const { usuario } = renderizarApp('/organizador/eventos/5');
    await usuario.click(await screen.findByRole('button', { name: 'Cancelar evento' }));
    const dialogo = await screen.findByRole('dialog', { name: '¿Cancelar el evento?' });
    expect(await within(dialogo).findByText(/Se cancelará el evento/)).toBeInTheDocument();
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar evento' }));
    expect(await screen.findByText(/Evento cancelado\. Se anularon/)).toBeInTheDocument();
    expect(base().eventos.find((e) => e.id === 5)!.estado).toBe('CANCELADO');
  });
});
