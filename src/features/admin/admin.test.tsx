import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { base } from '@/mocks/manejadores';
import { renderizarApp, sesionComo } from '@/test/utilidades';

describe('administración (RF-18)', () => {
  it('bloquea y desbloquea una cuenta, pero no la propia', async () => {
    sesionComo('admin@uv.mx', true);
    const { usuario } = renderizarApp('/admin');
    const tarjeta = await screen.findByRole('article', { name: 'Ana Asistente' });
    await usuario.click(within(tarjeta).getByRole('button', { name: 'Bloquear cuenta' }));
    await waitFor(() => expect(base().usuarios[0].estado).toBe('BLOQUEADO'));
    expect(await within(tarjeta).findByRole('button', { name: 'Desbloquear cuenta' })).toBeInTheDocument();

    const propia = screen.getByRole('article', { name: 'Administración EnZona' });
    expect(within(propia).queryByRole('button', { name: /Bloquear/ })).not.toBeInTheDocument();
  });

  it('filtra usuarios por texto', async () => {
    sesionComo('admin@uv.mx', true);
    const { usuario } = renderizarApp('/admin');
    await screen.findByRole('article', { name: 'Ana Asistente' });
    await usuario.type(screen.getByLabelText('Buscar por nombre o correo'), 'valeria');
    expect(await screen.findByText('1 usuario')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Valeria Validadora' })).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Ana Asistente' })).not.toBeInTheDocument();
  });

  it('cancela un evento por moderación con motivo obligatorio', async () => {
    sesionComo('admin@uv.mx', true);
    const { usuario } = renderizarApp('/admin');
    await usuario.click(await screen.findByRole('tab', { name: 'Eventos' }));
    const tarjeta = await screen.findByRole('article', { name: 'Muestra gastronómica de las Altas Montañas' });
    expect(within(tarjeta).getByText(/Organiza: Óscar Organizador/)).toBeInTheDocument();
    await usuario.click(within(tarjeta).getByRole('button', { name: 'Cancelar evento' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Cancelar evento (administración)' });
    const confirmar = await within(dialogo).findByRole('button', { name: 'Cancelar evento' });
    await usuario.click(confirmar);
    expect(within(dialogo).getByText('Escribe el motivo (mínimo 5 caracteres).')).toBeInTheDocument();
    await usuario.type(within(dialogo).getByLabelText('Motivo de la cancelación'), 'Permiso municipal revocado');
    await usuario.click(confirmar);
    await waitFor(() => expect(base().eventos.find((e) => e.id === 5)!.estado).toBe('CANCELADO'));
    expect(base().eventos.find((e) => e.id === 5)!.motivoCancelacion).toBe('Permiso municipal revocado');
  });
});
