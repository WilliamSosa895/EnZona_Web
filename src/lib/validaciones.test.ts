import { describe, expect, it } from 'vitest';
import {
  codigoValido,
  contrasenaValida,
  correoValido,
  curpValido,
  normalizarTelefono,
  telefonoValido,
} from './validaciones';

describe('validaciones iguales a las de la API', () => {
  it('CURP con formato oficial (CP-01 y CP-03)', () => {
    expect(curpValido('PERA000229MDFRRSA1')).toBe(true);
    expect(curpValido('pera000229mdfrrsa1')).toBe(true);
    expect(curpValido('ABC')).toBe(false);
    expect(curpValido('PERA000229MXXRRSA1')).toBe(false); // entidad inexistente
  });

  it('contraseña de 8 a 72 caracteres con letras y números', () => {
    expect(contrasenaValida('Secreta123')).toBe(true);
    expect(contrasenaValida('soloLetras')).toBe(false);
    expect(contrasenaValida('12345678')).toBe(false);
    expect(contrasenaValida('a1')).toBe(false);
  });

  it('correo, teléfono opcional y código de 6 dígitos', () => {
    expect(correoValido('ana@correo.com')).toBe(true);
    expect(correoValido('ana@')).toBe(false);
    expect(telefonoValido('')).toBe(true);
    expect(telefonoValido('272 123 4567')).toBe(true);
    expect(telefonoValido('+522721234567')).toBe(true);
    expect(telefonoValido('123')).toBe(false);
    expect(normalizarTelefono(' 272-123-4567 ')).toBe('2721234567');
    expect(normalizarTelefono('')).toBeNull();
    expect(codigoValido('123456')).toBe(true);
    expect(codigoValido('12345a')).toBe(false);
  });
});
