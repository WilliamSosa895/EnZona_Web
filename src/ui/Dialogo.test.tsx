import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderizar } from '@/test/utilidades';
import { Dialogo } from './Dialogo';

describe('Dialogo', () => {
  it('enfoca el primer control, atrapa el foco con Tab y se cierra con Escape', async () => {
    const alCerrar = vi.fn();
    const { usuario } = renderizar(
      <Dialogo
        titulo="Confirmar"
        onCerrar={alCerrar}
        acciones={
          <>
            <button type="button">Cancelar</button>
            <button type="button">Aceptar</button>
          </>
        }
      >
        <p>¿Seguro?</p>
      </Dialogo>,
    );
    const dialogo = screen.getByRole('dialog', { name: 'Confirmar' });
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await usuario.tab();
    expect(screen.getByRole('button', { name: 'Aceptar' })).toHaveFocus();
    await usuario.tab();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await usuario.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Aceptar' })).toHaveFocus();
    await usuario.keyboard('{Escape}');
    expect(alCerrar).toHaveBeenCalledOnce();
  });
});
