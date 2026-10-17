import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { leerSesion } from '@/auth/almacen';
import { base } from '@/mocks/manejadores';
import { renderizarApp, sesionComo } from '@/test/utilidades';

describe('perfil y ajustes (RF-04)', () => {
  it('convierte a un asistente en organizador tras confirmar y muestra la pestaña Mis eventos', async () => {
    sesionComo('asistente@uv.mx');
    const { usuario } = renderizarApp('/perfil');
    await usuario.click(await screen.findByRole('button', { name: 'Convertirme en organizador' }));
    const dialogo = screen.getByRole('dialog', { name: '¿Convertirte en organizador?' });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Sí, convertirme en organizador' }));
    expect(await screen.findByText(/Ahora eres organizador/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Mis eventos/ }).length).toBeGreaterThan(0);
    expect(base().usuarios[0].roles).toContain('ORGANIZADOR');
    expect(leerSesion()?.usuario.roles).toContain('ORGANIZADOR');
  });

  it('no permite dejar el rol de organizador con eventos publicados vigentes', async () => {
    sesionComo('organizador@uv.mx');
    const { usuario } = renderizarApp('/perfil');
    await screen.findByText('Identidad verificada'); // el perfil ya cargó: la pantalla no se volverá a montar
    await usuario.click(screen.getByRole('button', { name: 'Dejar de ser organizador' }));
    expect(await screen.findByText('Por ahora no es posible')).toBeInTheDocument();
    const dialogo = screen.getByRole('dialog', { name: '¿Dejar de ser organizador?' });
    expect(within(dialogo).queryByRole('button', { name: /Sí, dejar/ })).not.toBeInTheDocument();
  });

  it('edita nombre y teléfono validando el formato', async () => {
    sesionComo('asistente@uv.mx');
    const { usuario } = renderizarApp('/perfil/datos');
    const telefono = await screen.findByLabelText('Teléfono');
    await usuario.type(telefono, '123');
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(screen.getByText('El teléfono debe tener de 10 a 15 dígitos.')).toBeInTheDocument();
    await usuario.clear(telefono);
    await usuario.type(telefono, '272 123 4567');
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText('Tus datos se guardaron.')).toBeInTheDocument();
    expect(base().usuarios[0].telefono).toBe('2721234567');
  });

  it('una contraseña actual incorrecta se marca en su campo sin cerrar la sesión', async () => {
    sesionComo('asistente@uv.mx');
    const { usuario } = renderizarApp('/perfil/seguridad');
    await usuario.type(await screen.findByLabelText('Contraseña actual', { exact: true }), 'otra1234');
    await usuario.type(screen.getByLabelText('Nueva contraseña', { exact: true }), 'nueva1234');
    await usuario.type(screen.getByLabelText('Confirmar nueva contraseña', { exact: true }), 'nueva1234');
    await usuario.click(screen.getByRole('button', { name: 'Actualizar contraseña' }));
    expect(await screen.findByText('La contraseña actual no es correcta.')).toBeInTheDocument();
    expect(leerSesion()).not.toBeNull();

    await usuario.clear(screen.getByLabelText('Contraseña actual', { exact: true }));
    await usuario.type(screen.getByLabelText('Contraseña actual', { exact: true }), 'enzona123');
    await usuario.click(screen.getByRole('button', { name: 'Actualizar contraseña' }));
    expect(await screen.findByText('Tu contraseña se actualizó correctamente.')).toBeInTheDocument();
    await waitFor(() => expect(base().usuarios[0].contrasena).toBe('nueva1234'));
  });

  it('cerrar sesión vuelve a la pantalla de acceso', async () => {
    sesionComo('asistente@uv.mx');
    const { usuario, enrutador } = renderizarApp('/perfil');
    await usuario.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));
    await waitFor(() => expect(enrutador.state.location.pathname).toBe('/acceso'));
    expect(leerSesion()).toBeNull();
  });
});
