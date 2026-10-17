import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderizarApp, sesionComo } from '@/test/utilidades';

describe('páginas informativas y 404', () => {
  it.each([
    ['/ayuda', '¿Necesitas ayuda?'],
    ['/privacidad', 'Privacidad'],
    ['/legal', 'Legal'],
  ])('%s muestra su contenido', async (ruta, titulo) => {
    sesionComo('asistente@uv.mx');
    renderizarApp(ruta);
    expect(await screen.findByRole('heading', { level: 1, name: titulo })).toBeInTheDocument();
  });

  it('el aviso de privacidad se puede leer sin sesión (registro)', async () => {
    renderizarApp('/privacidad/aviso');
    expect(await screen.findByText('Tus derechos ARCO')).toBeInTheDocument();
  });

  it('una ruta desconocida muestra la página 404 con regreso al inicio', async () => {
    sesionComo('asistente@uv.mx');
    const { usuario, enrutador } = renderizarApp('/no-existe');
    expect(await screen.findByText('No encontramos esta página')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Ir al inicio' }));
    expect(enrutador.state.location.pathname).toBe('/');
  });
});
