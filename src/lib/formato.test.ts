import { describe, expect, it } from 'vitest';
import { aNumero, boletos, etiquetaPrecio, importe, importeMxn, lugares, multiplicar, precio } from './formato';

// Intl usa un espacio estrecho en algunas versiones; se normaliza para comparar.
const n = (t: string) => t.replace(/\s/g, ' ');

describe('formato de importes (equivalente a Formato.kt)', () => {
  it('muestra centavos solo si el importe los tiene', () => {
    expect(n(precio('120.00'))).toBe('$120');
    expect(n(precio('120.50'))).toBe('$120.50');
  });

  it('los desgloses siempre llevan centavos y MXN', () => {
    expect(n(importe('360'))).toBe('$360.00');
    expect(n(importeMxn(15))).toBe('$15.00 MXN');
  });

  it('la etiqueta de precio dice Gratis en eventos gratuitos o con precio 0', () => {
    expect(etiquetaPrecio(false, '0.00')).toBe('Gratis');
    expect(etiquetaPrecio(true, '0.00')).toBe('Gratis');
    expect(n(etiquetaPrecio(true, '180.00'))).toBe('Desde $180');
  });

  it('lugares y boletos en singular y plural', () => {
    expect(lugares(0)).toBe('Sin lugares');
    expect(lugares(1)).toBe('1 lugar');
    expect(lugares(142)).toBe('142 lugares');
    expect(boletos(1)).toBe('1 boleto');
    expect(boletos(3)).toBe('3 boletos');
  });

  it('multiplica en centavos para evitar errores de coma flotante', () => {
    expect(multiplicar('0.10', 3)).toBe(0.3);
    expect(multiplicar('180.00', 2)).toBe(360);
    expect(aNumero('texto')).toBe(0);
  });
});
