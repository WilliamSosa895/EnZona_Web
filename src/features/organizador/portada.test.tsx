import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { env } from '@/config/env';
import { ENCUADRE_INICIAL, type Encuadre } from '@/lib/portada';
import type * as ModuloPortada from '@/lib/portada';
import { base } from '@/mocks/manejadores';
import { servidor } from '@/mocks/servidor';
import { renderizarApp, sesionComo } from '@/test/utilidades';
import { EditorPortada } from './EditorPortada';

// jsdom no tiene canvas: la imagen elegida se sustituye por un lienzo de 2000 × 900 y el recorte por un JPEG.
const lienzoFalso = { width: 2000, height: 900 } as HTMLCanvasElement;
vi.mock('@/lib/portada', async (original) => ({
  ...(await original<typeof ModuloPortada>()),
  cargarImagen: vi.fn(async (archivo: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type))
      throw new Error('La imagen debe ser JPEG, PNG o WebP.');
    return lienzoFalso;
  }),
  recortar: vi.fn(async () => new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' })),
  girar: vi.fn((c: HTMLCanvasElement) => ({ width: c.height, height: c.width }) as HTMLCanvasElement),
}));

const contextoOriginal = HTMLCanvasElement.prototype.getContext;
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof contextoOriginal;
});
afterAll(() => {
  HTMLCanvasElement.prototype.getContext = contextoOriginal;
});

function Editor({ alCambiar }: { alCambiar: (e: Encuadre) => void }) {
  const [encuadre, setEncuadre] = useState(ENCUADRE_INICIAL);
  return (
    <EditorPortada
      imagen={lienzoFalso}
      encuadre={encuadre}
      onEncuadre={(e) => {
        setEncuadre(e);
        alCambiar(e);
      }}
    />
  );
}

const archivo = (tipo: string) => new File([new Uint8Array([1, 2, 3])], 'foto', { type: tipo });
const entradaDeArchivo = () => document.querySelector<HTMLInputElement>('input[type="file"]')!;

describe('editor de la portada', () => {
  // jsdom no mide el diseño: la vista previa ocupa 400 px de ancho.
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 400 });
  });
  afterAll(() => {
    Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth');
  });

  it('se mueve con las flechas y se acerca con + y con el control', async () => {
    const cambios: Encuadre[] = [];
    const usuario = userEvent.setup();
    render(<Editor alCambiar={(e) => cambios.push(e)} />);
    const editor = screen.getByRole('application', { name: 'Vista previa de la portada' });
    editor.focus();
    await usuario.keyboard('{ArrowLeft}');
    expect(cambios.at(-1)!.x).toBeLessThan(0);
    await usuario.keyboard('+');
    expect(cambios.at(-1)!.zoom).toBeCloseTo(1.1);
    fireEvent.change(screen.getByRole('slider', { name: 'Acercar' }), { target: { value: '3' } });
    expect(cambios.at(-1)!.zoom).toBe(3);
  });
});

describe('portada en el formulario del evento', () => {
  const evento = () => base().eventos.find((e) => e.id === 2)!;

  it('rechaza un archivo que no es JPEG, PNG ni WebP', async () => {
    sesionComo('organizador@uv.mx', true);
    renderizarApp('/organizador/eventos/2/editar');
    await screen.findByRole('heading', { name: 'Portada' });
    fireEvent.change(entradaDeArchivo(), { target: { files: [archivo('image/gif')] } });
    expect(await screen.findByText('La imagen debe ser JPEG, PNG o WebP.')).toBeInTheDocument();
  });

  it('elige, encuadra y sube la portada al guardar', async () => {
    sesionComo('organizador@uv.mx', true);
    const { usuario, enrutador } = renderizarApp('/organizador/eventos/2/editar');
    await screen.findByRole('heading', { name: 'Portada' });
    fireEvent.change(entradaDeArchivo(), { target: { files: [archivo('image/jpeg')] } });
    expect(await screen.findByText(/Imagen lista\. Muévela, acércala o gírala/)).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Girar' }));
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(enrutador.state.location.pathname).toBe('/organizador/eventos/2'));
    expect(evento().imagenUrl).toBeTruthy();
  });

  it('si la moderación rechaza la imagen, los datos se guardan y se explica el motivo', async () => {
    servidor.use(
      http.post(`${env.apiUrl}/api/eventos/:id/imagen`, () =>
        HttpResponse.json(
          { status: 422, codigo: 'IMAGEN_NO_PERMITIDA', detail: 'La imagen contiene violencia gráfica' },
          { status: 422 },
        ),
      ),
    );
    sesionComo('organizador@uv.mx', true);
    const { usuario } = renderizarApp('/organizador/eventos/2/editar');
    await screen.findByRole('heading', { name: 'Portada' });
    fireEvent.change(entradaDeArchivo(), { target: { files: [archivo('image/png')] } });
    await screen.findByText(/Imagen lista/);
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(
      await screen.findByText('Los cambios se guardaron, pero la portada no: La imagen contiene violencia gráfica'),
    ).toBeInTheDocument();
    expect(evento().imagenUrl).toBeNull();
  });

  it('«Quitar portada» la elimina al guardar', async () => {
    evento().imagenUrl = 'https://res.cloudinary.com/demo/image/upload/eventos/2/portada.jpg';
    sesionComo('organizador@uv.mx', true);
    const { usuario, enrutador } = renderizarApp('/organizador/eventos/2/editar');
    await usuario.click(await screen.findByRole('button', { name: 'Quitar portada' }));
    expect(screen.getByText('La portada se quitará al guardar.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(enrutador.state.location.pathname).toBe('/organizador/eventos/2'));
    expect(evento().imagenUrl).toBeNull();
  });
});
