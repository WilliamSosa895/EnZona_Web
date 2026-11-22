import { describe, expect, it } from 'vitest';
import { direccionAproximada, textoDireccion } from './geocodificacion';

describe('textoDireccion', () => {
  it('arma calle y número, colonia y ciudad', () => {
    expect(textoDireccion({ road: 'Sur 4', house_number: '120', suburb: 'Centro', city: 'Orizaba' })).toBe(
      'Sur 4 120, Centro, Orizaba',
    );
    expect(textoDireccion({ pedestrian: 'Andador Pluviosilla', town: 'Orizaba' })).toBe('Andador Pluviosilla, Orizaba');
  });

  it('sin partes no inventa una dirección', () => {
    expect(textoDireccion({})).toBeNull();
    expect(textoDireccion(undefined)).toBeNull();
  });
});

describe('direccionAproximada', () => {
  it('consulta la geocodificación inversa de OpenStreetMap', async () => {
    expect(await direccionAproximada(18.85, -97.1)).toBe('Oriente 6 1, Centro, Orizaba');
  });
});
