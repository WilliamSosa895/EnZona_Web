import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderizarApp, sesionComo } from '@/test/utilidades';
import { boletajeApi } from '@/api/boletaje';
import { base } from '@/mocks/manejadores';
import { descripcionBoleto, partesAsiento } from './agrupar';

async function comprar(cantidad: number) {
  const u = sesionComo('asistente@uv.mx');
  const ids = base()
    .eventos.find((e) => e.id === 1)!
    .asientos.filter((a) => a.estado === 'DISPONIBLE')
    .slice(0, cantidad)
    .map((a) => a.id);
  await boletajeApi.crearOrden(
    { eventoId: 1, tipoBoletoId: 15, cantidad, asientosIds: ids, metodo: 'TARJETA', tokenPago: 'tok_aprobado' },
    `prueba-${cantidad}-${Date.now()}`,
  );
  return u;
}

describe('etiquetas de boleto', () => {
  it('no repite el tipo cuando coincide con la sección', () => {
    expect(partesAsiento('Platea · Fila B · Asiento 8')).toEqual({ seccion: 'Platea', lugar: 'Fila B · 8' });
    expect(descripcionBoleto({ tipoNombre: 'Platea', asientoEtiqueta: 'Platea · Fila B · Asiento 8' })).toBe(
      'Platea · Fila B · 8',
    );
    expect(descripcionBoleto({ tipoNombre: 'General', asientoEtiqueta: null })).toBe('General');
  });
});

describe('mis boletos y boleto QR (RF-12)', () => {
  it('muestra un estado vacío con acceso a explorar', async () => {
    sesionComo('asistente@uv.mx');
    renderizarApp('/boletos');
    expect(await screen.findByText('Aún no tienes boletos')).toBeInTheDocument();
  });

  it('agrupa vigentes y muestra "Boleto k de N"', async () => {
    await comprar(2);
    renderizarApp('/boletos');
    expect(await screen.findByText('Vigentes · 2')).toBeInTheDocument();
    expect(screen.getByText('Boleto 1 de 2')).toBeInTheDocument();
    expect(screen.getByText('Boleto 2 de 2')).toBeInTheDocument();
  });

  it('dibuja el QR y navega entre boletos de la misma orden', async () => {
    await comprar(2);
    const [primero] = base().boletos;
    const { usuario, enrutador } = renderizarApp(`/boletos/${primero.id}`);
    expect(await screen.findByText(primero.codigo)).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: `Código QR del boleto ${primero.codigo}` })).toBeInTheDocument();
    expect(screen.getByText('Boleto válido, de un solo uso. Muestra el QR en el acceso.')).toBeInTheDocument();
    await usuario.click(await screen.findByRole('button', { name: 'Boleto siguiente' }));
    await waitFor(() => expect(enrutador.state.location.pathname).toBe(`/boletos/${base().boletos[1].id}`));
  });
});
