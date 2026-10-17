import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { base } from '@/mocks/manejadores';
import { renderizarApp, sesionComo } from '@/test/utilidades';
import { leerPedido, rutaPago } from './pedido';

describe('parámetros del pedido', () => {
  it('acota la cantidad, descarta ids inválidos y repetidos', () => {
    const p = leerPedido(new URLSearchParams('evento=1&tipo=15&cantidad=99&asientos=3,3,x,4'));
    expect(p).toEqual({ eventoId: 1, tipoId: 15, cantidad: 10, asientosIds: [3, 4] });
    expect(leerPedido(new URLSearchParams('evento=abc'))).toBeNull();
    expect(rutaPago({ eventoId: 1, tipoId: 15, cantidad: 2, asientosIds: [7, 8] })).toBe(
      '/pago?evento=1&tipo=15&cantidad=2&asientos=7%2C8',
    );
  });
});

describe('compra con asientos y pago (RF-09, RF-11, CP-09, CP-10)', () => {
  it('elige N asientos distintos, no permite más de N y conserva la selección en la URL', async () => {
    sesionComo('asistente@uv.mx');
    const { usuario, enrutador } = renderizarApp('/eventos/1/asientos?tipo=15&cantidad=2');
    const b7 = await screen.findByRole('checkbox', { name: /Platea, fila B, asiento 7, disponible/ });
    expect(screen.getByRole('checkbox', { name: /fila A, asiento 4, ocupado/ })).toBeDisabled();
    await usuario.click(b7);
    await usuario.click(screen.getByRole('checkbox', { name: /fila B, asiento 8,/ }));
    expect(screen.getByText('Seleccionados 2 de 2')).toBeInTheDocument();
    await usuario.click(screen.getByRole('checkbox', { name: /fila C, asiento 1,/ }));
    expect(screen.getByText('Ya elegiste 2 de 2. Quita uno para cambiarlo.')).toBeInTheDocument();
    expect(enrutador.state.location.search).toContain('sel=');

    await usuario.click(screen.getByRole('button', { name: 'Continuar al pago · 2 boletos' }));
    expect(enrutador.state.location.pathname).toBe('/pago');
    expect(await screen.findByText('$360.00 MXN', { selector: 'span' })).toBeInTheDocument();
  });

  it('CP-10: pago rechazado sin cargo; el reintento aprobado emite los boletos y ocupa los asientos', async () => {
    sesionComo('asistente@uv.mx');
    const { usuario, enrutador } = renderizarApp('/pago?evento=1&tipo=15&cantidad=2&asientos=1011,1012');
    await screen.findByText('Tu orden');
    await usuario.selectOptions(screen.getByLabelText('Resultado de la pasarela'), 'tok_rechazado');
    await usuario.click(screen.getByRole('button', { name: 'Pagar $360.00 MXN' }));
    expect(await screen.findByText('Pago rechazado')).toBeInTheDocument();
    expect(base().boletos).toHaveLength(0);

    await usuario.selectOptions(screen.getByLabelText('Resultado de la pasarela'), 'tok_aprobado');
    await usuario.click(screen.getByRole('button', { name: 'Pagar $360.00 MXN' }));
    expect(await screen.findByText('Tus 2 boletos están listos')).toBeInTheDocument();
    expect(enrutador.state.location.pathname).toMatch(/^\/ordenes\/\d+$/);
    expect(base().boletos).toHaveLength(2);
    // dos órdenes distintas: el reintento usó una Idempotency-Key nueva
    expect(new Set(base().ordenes.map((o) => o.clave)).size).toBe(2);
    const asientos = base().eventos.find((e) => e.id === 1)!.asientos;
    expect(asientos.filter((a) => [1011, 1012].includes(a.id)).every((a) => a.estado === 'OCUPADO')).toBe(true);
  });

  it('pago pendiente: la orden queda en proceso y aparta los asientos', async () => {
    sesionComo('asistente@uv.mx');
    const { usuario } = renderizarApp('/pago?evento=4&tipo=40&cantidad=1');
    await screen.findByText('Tu orden');
    await usuario.selectOptions(screen.getByLabelText('Resultado de la pasarela'), 'tok_pendiente');
    await usuario.click(screen.getByRole('button', { name: 'Pagar $150.00 MXN' }));
    expect(await screen.findByText('Estamos confirmando tu pago')).toBeInTheDocument();
    expect(base().eventos.find((e) => e.id === 4)!.tipos[0].disponibles).toBe(5);
  });

  it('bloquea el pago si un asiento elegido ya se ocupó', async () => {
    sesionComo('asistente@uv.mx');
    renderizarApp('/pago?evento=1&tipo=15&cantidad=1&asientos=1003');
    expect(await screen.findByText('Revisa tu pedido')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No se puede completar' })).toBeDisabled();
  });

  it('evento gratuito con asiento: confirma sin cobro', async () => {
    const evento = base().eventos.find((e) => e.id === 2)!;
    evento.requiereAsiento = true;
    evento.asientos = [
      {
        id: 9001,
        seccion: 'Sala',
        fila: 'A',
        numero: '1',
        estado: 'DISPONIBLE',
        etiqueta: 'Sala · Fila A · Asiento 1',
      },
    ];
    sesionComo('asistente@uv.mx');
    const { usuario, enrutador } = renderizarApp('/eventos/2/asientos?cantidad=1');
    await usuario.click(await screen.findByRole('checkbox', { name: /Sala, fila A, asiento 1/ }));
    await usuario.click(screen.getByRole('button', { name: 'Confirmar asiento' }));
    const dialogo = screen.getByRole('dialog', { name: 'Confirmar asistencia' });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Confirmar asiento' }));
    await waitFor(() => expect(enrutador.state.location.pathname).toMatch(/^\/boletos\/\d+$/));
    expect(base().boletos[0].asientoEtiqueta).toBe('Sala · Fila A · Asiento 1');
  });
});
