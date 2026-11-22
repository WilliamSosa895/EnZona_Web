import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { crearClienteConsultas } from '@/app/consultas';
import { SesionProvider } from '@/auth/SesionContext';
import { leerSesion } from '@/auth/almacen';
import { servidor } from '@/mocks/servidor';
import { sesionComo } from '@/test/utilidades';
import { Arranque } from './Arranque';

function montar() {
  return render(
    <QueryClientProvider client={crearClienteConsultas()}>
      <SesionProvider>
        <Arranque duracionMinimaMs={0}>
          <p>Aplicación lista</p>
        </Arranque>
      </SesionProvider>
    </QueryClientProvider>,
  );
}

describe('Arranque (pantalla de conexión)', () => {
  it('sin sesión guardada muestra la aplicación de inmediato', () => {
    montar();
    expect(screen.getByText('Aplicación lista')).toBeInTheDocument();
    expect(screen.queryByText('Conectando con EnZona…')).not.toBeInTheDocument();
  });

  it('con sesión guardada la comprueba con la API mientras anima el logo', async () => {
    sesionComo('asistente@uv.mx');
    montar();
    expect(screen.getByRole('status')).toHaveTextContent('Conectando con EnZona…');
    expect(await screen.findByText('Aplicación lista')).toBeInTheDocument();
  });

  it('si la API no responde ofrece reintentar', async () => {
    sesionComo('asistente@uv.mx');
    servidor.use(http.get('*/api/usuarios/me', () => HttpResponse.error()));
    montar();
    expect(await screen.findByRole('heading', { name: 'Sin conexión con el servidor' })).toBeInTheDocument();

    servidor.resetHandlers();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Aplicación lista')).toBeInTheDocument();
  });

  it('un token rechazado cierra la sesión y deja pasar a la aplicación', async () => {
    sesionComo('asistente@uv.mx');
    servidor.use(
      http.get('*/api/usuarios/me', () =>
        HttpResponse.json({ codigo: 'NO_AUTENTICADO', detail: 'Token vencido' }, { status: 401 }),
      ),
    );
    montar();
    expect(await screen.findByText('Aplicación lista')).toBeInTheDocument();
    expect(leerSesion()).toBeNull();
  });
});
