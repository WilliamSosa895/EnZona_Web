import { screen, waitFor, within } from '@testing-library/react';
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

function abrirPuerta(eventoId: number) {
  sesionComo('validador@uv.mx', true);
  sessionStorage.setItem('enzona.validador.evento', String(eventoId));
  return renderizarApp('/validador');
}

type Usuario = ReturnType<typeof renderizarApp>['usuario'];

async function escribir(usuario: Usuario, qr: string) {
  await usuario.click(await screen.findByRole('button', { name: 'Escribir código' }));
  const dialogo = await screen.findByRole('dialog', { name: 'Escribir el código' });
  await usuario.type(within(dialogo).getByLabelText('Contenido del QR'), qr);
  await usuario.click(within(dialogo).getByRole('button', { name: 'Validar' }));
}

describe('validación de acceso en la puerta (RF-15, CP-12, CP-13)', () => {
  it('permite el primer acceso y rechaza el segundo con el mismo boleto', async () => {
    const boleto = await boletoDelJazz();
    const { usuario } = abrirPuerta(1);

    // jsdom no tiene cámara: la zona principal lo explica y ofrece escribir el código
    expect(await screen.findByRole('heading', { name: 'Se necesita la cámara' })).toBeInTheDocument();
    await escribir(usuario, boleto.contenidoQr);
    const permitido = await screen.findByRole('status', { name: /Puede pasar\. Acceso permitido/ });
    expect(within(permitido).getByText('PUEDE PASAR')).toBeInTheDocument();
    expect(within(permitido).getByText('Platea · Fila A · Asiento 1')).toBeInTheDocument();

    await usuario.click(within(permitido).getByRole('button', { name: 'Siguiente' }));
    await escribir(usuario, boleto.contenidoQr);
    const rechazado = await screen.findByRole('status', { name: /No puede pasar\. Boleto ya utilizado/ });
    expect(within(rechazado).getByText('NO PUEDE PASAR')).toBeInTheDocument();
    await usuario.click(within(rechazado).getByRole('button', { name: 'Siguiente' }));

    await usuario.click(screen.getByRole('button', { name: 'Últimos accesos' }));
    const lista = screen.getByRole('list');
    expect(within(lista).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('entraron').previousSibling).toHaveTextContent('1');
    expect(screen.getByText('rechazados').previousSibling).toHaveTextContent('1');
  });

  it('detecta un QR con la firma alterada', async () => {
    const boleto = await boletoDelJazz();
    const { usuario } = abrirPuerta(1);
    await escribir(usuario, `${boleto.codigo}.firmaFalsaFirmaFalsa123`);
    expect(await screen.findByRole('status', { name: /No puede pasar\. Boleto no válido/ })).toBeInTheDocument();
  });

  it('avisa si la cuenta no está designada para el evento elegido', async () => {
    base().eventos.find((e) => e.id === 3)!.validadores = [];
    const { usuario } = abrirPuerta(3);
    await escribir(usuario, 'EZ-0001-ABCD.xxxxxxxxxxxxxxxxxxxx');
    expect(await screen.findByRole('alert')).toHaveTextContent('No estás designado para este evento');
  });

  it('valida sin conexión con el manifiesto y sincroniza al volver la red (RNF-08, CP-14)', async () => {
    const boleto = await boletoDelJazz();
    const { usuario } = abrirPuerta(1);

    await usuario.click(await screen.findByRole('button', { name: 'Con internet' }));
    expect(await screen.findByText(/Listo: 1 boleto guardado en este equipo/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sin conexión' })).toHaveAttribute('aria-pressed', 'true');

    await escribir(usuario, boleto.contenidoQr);
    const permitido = await screen.findByRole('status', { name: /Puede pasar/ });
    await usuario.click(within(permitido).getByRole('button', { name: 'Siguiente' }));
    // El mismo boleto no entra dos veces por este equipo, aunque siga sin red.
    await escribir(usuario, boleto.contenidoQr);
    const repetido = await screen.findByRole('status', { name: /No puede pasar\. Boleto ya utilizado/ });
    expect(within(repetido).getByText('Este dispositivo ya admitió este boleto sin conexión.')).toBeInTheDocument();
    await usuario.click(within(repetido).getByRole('button', { name: 'Siguiente' }));
    expect(base().boletos.find((b) => b.id === boleto.id)!.estado).toBe('VALIDO');

    await usuario.click(screen.getByRole('button', { name: 'Últimos accesos' }));
    expect(screen.getAllByText('por enviar')).toHaveLength(2);

    await usuario.click(screen.getByRole('button', { name: 'Sin conexión' }));
    await usuario.click(screen.getByRole('button', { name: 'Enviar 2' }));
    expect(await screen.findByText('Enviadas 2: 1 entraron y 1 rechazadas (1 ya habían entrado).')).toBeInTheDocument();
    await waitFor(() => expect(base().boletos.find((b) => b.id === boleto.id)!.estado).toBe('USADO'));
    expect(screen.queryByText('por enviar')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Enviar/ })).not.toBeInTheDocument();
  });

  it('el acceso del personal muestra solo «Escanear» y «Perfil»', async () => {
    abrirPuerta(1);
    const navegacion = await screen.findByRole('navigation', { name: 'Navegación principal' });
    expect(
      within(navegacion)
        .getAllByRole('link')
        .map((a) => a.textContent),
    ).toEqual(['Escanear', 'Perfil']);
  });
});
