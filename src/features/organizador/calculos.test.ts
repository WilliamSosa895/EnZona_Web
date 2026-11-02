import { describe, expect, it } from 'vitest';
import { direccionTrasSugerencia } from './calculos';

describe('dirección sugerida por el mapa', () => {
  const delMapa = 'Norte 12 136, Centro, Orizaba';

  it('al tocar el mapa, la dirección del punto sustituye lo escrito a mano', () => {
    expect(direccionTrasSugerencia('Calle escrita a mano 123', delMapa, null, true)).toBe(delMapa);
  });

  it('al abrir un evento existente se respeta la dirección guardada', () => {
    expect(direccionTrasSugerencia('Calle guardada 5', delMapa, null, false)).toBe('Calle guardada 5');
  });

  it('sin tocar el mapa se propone si el campo está vacío o aún tiene la sugerencia anterior', () => {
    expect(direccionTrasSugerencia('  ', delMapa, null, false)).toBe(delMapa);
    expect(direccionTrasSugerencia('Oriente 6 1, Centro', delMapa, 'Oriente 6 1, Centro', false)).toBe(delMapa);
  });
});
