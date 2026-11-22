import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderizarApp, sesionComo } from '@/test/utilidades';
import { configurarGuias, guiaVista, reiniciarGuias } from './almacen';

describe('guías interactivas de la primera vez', () => {
  beforeEach(() => {
    reiniciarGuias();
    configurarGuias({ habilitadas: true });
  });
  afterEach(() => configurarGuias({ habilitadas: false }));

  it('se abre la primera vez en Inicio, avanza con «Siguiente» y no vuelve a aparecer', async () => {
    sesionComo('asistente@uv.mx');
    const { usuario, unmount } = renderizarApp('/');
    const guia = await screen.findByRole('dialog', { name: '¡Hola! Bienvenido a EnZona' }, { timeout: 4000 });
    expect(guia).toHaveTextContent('1 de 6');
    await usuario.click(screen.getByRole('button', { name: 'Siguiente →' }));
    expect(await screen.findByRole('dialog', { name: 'Esta es tu ciudad' })).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Atrás' }));
    expect(await screen.findByRole('dialog', { name: '¡Hola! Bienvenido a EnZona' })).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Omitir' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(guiaVista('inicio')).toBe(true);
    unmount();

    renderizarApp('/');
    await screen.findByText(/eventos publicados/);
    await act(() => new Promise((r) => setTimeout(r, 600)));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Escape la cierra y «Volver a ver las guías» la reinicia', async () => {
    sesionComo('asistente@uv.mx');
    const { usuario } = renderizarApp('/');
    await screen.findByRole('dialog', { name: '¡Hola! Bienvenido a EnZona' }, { timeout: 4000 });
    await usuario.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(guiaVista('inicio')).toBe(true);
    act(() => reiniciarGuias());
    expect(guiaVista('inicio')).toBe(false);
    // La pantalla abierta vuelve a pedir su guía al reiniciarlas.
    expect(
      await screen.findByRole('dialog', { name: '¡Hola! Bienvenido a EnZona' }, { timeout: 4000 }),
    ).toBeInTheDocument();
  });
});
