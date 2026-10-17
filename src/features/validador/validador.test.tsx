import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { boletajeApi } from '@/api/boletaje';
import { base } from '@/mocks/manejadores';
import { renderizarApp, sesionComo } from '@/test/utilidades';

async function boletoDelJazz() {
  sesionComo('asistente@uv.mx');
  const libre = base()
    .eventos.find((e) => e.id === 1)!
    .asientos.find((a) => a.estado === 'DISPONIBLE')!;
  const orden = await boletajeApi.crearOrden(
    {
      eventoId: 1,
      tipoBoletoId: 15,
      cantidad: 1,
      asientosIds: [libre.id],
      metodo: 'TARJETA',
      tokenPago: 'tok_aprobado',
    },
    'prueba-validacion-001',
  );
  return orden.boletos[0];
}

describe('validación de acceso (RF-15, CP-12, CP-13)', () => {
  it('permite el primer acceso y rechaza el segundo con el mismo boleto', async () => {
    const boleto = await boletoDelJazz();
    sesionComo('validador@uv.mx');
    sessionStorage.setItem('enzona.validador.evento', '1');
    const { usuario } = renderizarApp('/validador');

    // jsdom no tiene cámara: la pantalla ofrece la captura manual
    const campo = await screen.findByLabelText('Contenido del QR (EZ-0000-XXXX.firma)');
    await usuario.type(campo, boleto.contenidoQr);
    await usuario.click(screen.getByRole('button', { name: 'Validar código' }));
    expect(await screen.findByRole('heading', { name: 'Acceso permitido' })).toBeInTheDocument();
    expect(screen.getByText('Platea · Fila A · Asiento 1')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Escanear siguiente' }));
    await usuario.type(await screen.findByLabelText('Contenido del QR (EZ-0000-XXXX.firma)'), boleto.contenidoQr);
    await usuario.click(screen.getByRole('button', { name: 'Validar código' }));
    expect(await screen.findByRole('heading', { name: 'Boleto ya utilizado' })).toBeInTheDocument();
    expect(screen.getByText('Últimos accesos')).toBeInTheDocument();
  });

  it('detecta un QR con la firma alterada', async () => {
    const boleto = await boletoDelJazz();
    sesionComo('validador@uv.mx');
    sessionStorage.setItem('enzona.validador.evento', '1');
    const { usuario } = renderizarApp('/validador');
    await usuario.type(
      await screen.findByLabelText('Contenido del QR (EZ-0000-XXXX.firma)'),
      `${boleto.codigo}.firmaFalsaFirmaFalsa123`,
    );
    await usuario.click(screen.getByRole('button', { name: 'Validar código' }));
    expect(await screen.findByRole('heading', { name: 'Boleto falso' })).toBeInTheDocument();
  });

  it('avisa si la cuenta no está designada para el evento elegido', async () => {
    sesionComo('validador@uv.mx');
    sessionStorage.setItem('enzona.validador.evento', '3');
    base().eventos.find((e) => e.id === 3)!.validadores = [];
    const { usuario } = renderizarApp('/validador');
    await usuario.type(
      await screen.findByLabelText('Contenido del QR (EZ-0000-XXXX.firma)'),
      'EZ-0001-ABCD.xxxxxxxxxxxxxxxxxxxx',
    );
    await usuario.click(screen.getByRole('button', { name: 'Validar código' }));
    expect(await screen.findByText('No estás designado para este evento')).toBeInTheDocument();
  });
});
