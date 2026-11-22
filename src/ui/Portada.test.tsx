import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { env } from '@/config/env';
import { Portada } from './Portada';

describe('Portada', () => {
  it('sin imagen muestra el panel de la categoría', () => {
    const { container } = render(<Portada nombre="Feria" categoria="Cultural" fecha="2026-11-20T19:00:00-06:00" />);
    expect(screen.getByRole('img', { name: 'Portada de Feria, categoría Cultural' })).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it('con imagenUrl relativa la pide a la API y, si falla, vuelve al panel', () => {
    const { container } = render(
      <Portada
        nombre="Feria"
        categoria="Cultural"
        fecha="2026-11-20T19:00:00-06:00"
        imagenUrl="/api/imagenes/a1.jpg"
      />,
    );
    const imagen = container.querySelector('img')!;
    expect(imagen).toHaveAttribute('src', `${env.apiUrl}/api/imagenes/a1.jpg`);
    expect(imagen).toHaveAttribute('alt', '');
    fireEvent.error(imagen);
    expect(container.querySelector('img')).toBeNull();
  });
});
