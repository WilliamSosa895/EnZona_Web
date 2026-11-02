import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { base } from '@/mocks/manejadores';
import { renderizarApp, sesionComo } from '@/test/utilidades';

describe('administración (RF-18)', () => {
  it('bloquea y desbloquea una cuenta, pero no la propia', async () => {
    sesionComo('admin@uv.mx', true);
    const { usuario } = renderizarApp('/admin');
    await usuario.click(await screen.findByRole('tab', { name: 'Usuarios' }));
    const tarjeta = await screen.findByRole('article', { name: 'Ana Asistente' });
    await usuario.click(within(tarjeta).getByRole('button', { name: 'Bloquear cuenta' }));
    await waitFor(() => expect(base().usuarios[0].estado).toBe('BLOQUEADO'));
    expect(await within(tarjeta).findByRole('button', { name: 'Desbloquear cuenta' })).toBeInTheDocument();

    const propia = screen.getByRole('article', { name: 'Administración EnZona' });
    expect(within(propia).queryByRole('button', { name: /Bloquear/ })).not.toBeInTheDocument();
  });

  it('activa sin código una cuenta pendiente cuyo correo no llegó', async () => {
    sesionComo('admin@uv.mx', true);
    const { usuario } = renderizarApp('/admin');
    await usuario.click(await screen.findByRole('tab', { name: 'Usuarios' }));
    const tarjeta = await screen.findByRole('article', { name: 'Paco Pendiente' });
    expect(within(tarjeta).queryByRole('button', { name: 'Bloquear cuenta' })).not.toBeInTheDocument();
    await usuario.click(within(tarjeta).getByRole('button', { name: 'Activar sin código' }));
    const dialogo = await screen.findByRole('dialog', { name: '¿Activar la cuenta sin código?' });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Activar cuenta' }));
    await waitFor(() => expect(base().usuarios.find((u) => u.id === 5)?.estado).toBe('ACTIVO'));
    expect(base().usuarios.find((u) => u.id === 5)?.correoVerificado).toBe(true);
    expect(await within(tarjeta).findByText('Activo')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('si la cuenta ya no está pendiente, la API lo rechaza y se explica', async () => {
    sesionComo('admin@uv.mx', true);
    const { usuario } = renderizarApp('/admin');
    await usuario.click(await screen.findByRole('tab', { name: 'Usuarios' }));
    const tarjeta = await screen.findByRole('article', { name: 'Paco Pendiente' });
    base().usuarios.find((u) => u.id === 5)!.estado = 'ACTIVO'; // otra persona la activó mientras tanto
    await usuario.click(within(tarjeta).getByRole('button', { name: 'Activar sin código' }));
    const dialogo = await screen.findByRole('dialog', { name: '¿Activar la cuenta sin código?' });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Activar cuenta' }));
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Solo se puede dar por verificada');
  });

  it('filtra usuarios por texto', async () => {
    sesionComo('admin@uv.mx', true);
    const { usuario } = renderizarApp('/admin');
    await usuario.click(await screen.findByRole('tab', { name: 'Usuarios' }));
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

  it('quita una portada inapropiada (red de seguridad de la moderación)', async () => {
    const evento = base().eventos.find((e) => e.id === 5)!;
    evento.imagenUrl = 'https://res.cloudinary.com/demo/image/upload/eventos/5/portada.jpg';
    sesionComo('admin@uv.mx', true);
    const { usuario } = renderizarApp('/admin');
    await usuario.click(await screen.findByRole('tab', { name: 'Eventos' }));
    const tarjeta = await screen.findByRole('article', { name: evento.nombre });
    await usuario.click(within(tarjeta).getByRole('button', { name: 'Quitar portada' }));
    await waitFor(() => expect(base().eventos.find((e) => e.id === 5)!.imagenUrl).toBeNull());
    expect(await within(tarjeta).findByText(/Se quitó la portada/)).toBeInTheDocument();
  });

  it('abre en el resumen con indicadores y gráficas calculados con la API', async () => {
    sesionComo('admin@uv.mx', true);
    renderizarApp('/admin');
    expect(await screen.findByRole('tab', { name: 'Resumen', selected: true })).toBeInTheDocument();
    const indicadores = await screen.findByText('Usuarios', { selector: 'dt' });
    expect(indicadores.nextSibling).toHaveTextContent(String(base().usuarios.length));
    const cuentas = screen.getByRole('region', { name: 'Cuentas' });
    expect(within(cuentas).getByText(/Activas \d+/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Eventos por estado' })).toHaveTextContent('Publicados');
  });

  it('las pestañas se recorren con las flechas del teclado', async () => {
    sesionComo('admin@uv.mx', true);
    const { usuario } = renderizarApp('/admin');
    const resumen = await screen.findByRole('tab', { name: 'Resumen' });
    resumen.focus();
    await usuario.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Usuarios' })).toHaveAttribute('aria-selected', 'true');
    await usuario.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Eventos' })).toHaveAttribute('aria-selected', 'true');
  });
});
