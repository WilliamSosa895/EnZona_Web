import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { base } from '@/mocks/manejadores';
import { renderizarApp, sesionComo } from '@/test/utilidades';

describe('descubrimiento de eventos (RF-05 a RF-07, RF-19)', () => {
  it('RF-05: lista los eventos publicados de Orizaba, sin borradores ni otras ciudades', async () => {
    sesionComo('asistente@uv.mx');
    renderizarApp('/');
    expect(await screen.findByText('Noche de jazz en el Foro')).toBeInTheDocument();
    expect(screen.getByText('5 eventos publicados')).toBeInTheDocument();
    expect(screen.queryByText('Concierto de rock en Córdoba')).not.toBeInTheDocument();
    expect(screen.queryByText(/ajedrez/)).not.toBeInTheDocument();
  });

  it('RF-06 y RF-07: busca por texto y filtra gratuitos; los filtros quedan en la URL', async () => {
    sesionComo('asistente@uv.mx');
    const { usuario, enrutador } = renderizarApp('/');
    await screen.findByText('Noche de jazz en el Foro');
    await usuario.click(screen.getByRole('button', { name: 'Gratis' }));
    await waitFor(() => expect(screen.queryByText('Noche de jazz en el Foro')).not.toBeInTheDocument());
    expect(screen.getByText('Feria del libro universitaria')).toBeInTheDocument();
    expect(enrutador.state.location.search).toBe('?precio=gratis');

    await usuario.type(screen.getByLabelText('Buscar evento o lugar'), 'zzz');
    expect(await screen.findByText('Nada coincide con tu búsqueda')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Limpiar búsqueda y filtros' }));
    expect(await screen.findByText('Noche de jazz en el Foro')).toBeInTheDocument();
  });

  it('cambia de zona y ofrece volver a Orizaba si no hay eventos', async () => {
    sesionComo('asistente@uv.mx');
    const { usuario } = renderizarApp('/');
    await screen.findByText('Noche de jazz en el Foro');
    await usuario.click(screen.getByRole('button', { name: /Zona: Orizaba/ }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xalapa' }));
    expect(await screen.findByText('No hay eventos publicados en Xalapa')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Explorar Orizaba' }));
    expect(await screen.findByText('Noche de jazz en el Foro')).toBeInTheDocument();
  });

  it('detalle de un evento de pago: tipos, cantidad y total final', async () => {
    sesionComo('asistente@uv.mx');
    const { usuario, enrutador } = renderizarApp('/eventos/3');
    expect(await screen.findByRole('heading', { name: 'Final de la liga amateur de fútbol' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Palco/ })).toBeDisabled();
    await usuario.click(screen.getByRole('button', { name: 'Agregar un boleto' }));
    expect(screen.getByText(/\$120\.00 MXN · 2 boletos · total final/)).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Comprar 2 boletos' }));
    expect(enrutador.state.location.pathname).toBe('/pago');
    expect(enrutador.state.location.search).toBe('?evento=3&tipo=30&cantidad=2');
  });

  it('CP-08: confirma asistencia a un evento gratuito y emite el boleto', async () => {
    sesionComo('asistente@uv.mx');
    const { usuario, enrutador } = renderizarApp('/eventos/2');
    await usuario.click(await screen.findByRole('button', { name: 'Confirmar asistencia' }));
    const dialogo = screen.getByRole('dialog', { name: 'Confirmar asistencia' });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Confirmar asistencia' }));
    await waitFor(() => expect(enrutador.state.location.pathname).toMatch(/^\/boletos\/\d+$/));
    expect(base().boletos).toHaveLength(1);
    expect(base().ordenes[0].estadoOrden).toBe('PAGADA');
  });

  it('un evento inexistente muestra el estado vacío', async () => {
    sesionComo('asistente@uv.mx');
    renderizarApp('/eventos/999');
    expect(await screen.findByText('Este evento no existe')).toBeInTheDocument();
  });
});
