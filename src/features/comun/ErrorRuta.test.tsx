import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ErrorRuta } from './ErrorRuta';

function Falla({ error }: { error: Error }): never {
  throw error;
}

const montar = (error: Error) => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const enrutador = createMemoryRouter([{ path: '/', element: <Falla error={error} />, errorElement: <ErrorRuta /> }]);
  render(<RouterProvider router={enrutador} />);
};

describe('ErrorRuta', () => {
  it('muestra un mensaje sin detalles técnicos', () => {
    montar(new Error('TypeError: x is undefined'));
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
    expect(screen.queryByText(/x is undefined/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recargar' })).toBeInTheDocument();
  });

  it('reconoce una versión nueva cuando falta un fragmento', () => {
    const recargar = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload: recargar });
    montar(new TypeError('Failed to fetch dynamically imported module: /assets/Pagina-abc.js'));
    expect(screen.getByText('Hay una versión nueva de EnZona')).toBeInTheDocument();
    expect(recargar).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
