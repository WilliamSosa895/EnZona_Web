import { describe, expect, it } from 'vitest';
import { esPersonal, rolPrincipal, rutaInicio, tieneRol } from './roles';

describe('roles', () => {
  it('elige el rol principal por jerarquía', () => {
    expect(rolPrincipal(['ASISTENTE', 'VALIDADOR', 'ORGANIZADOR'])).toBe('ORGANIZADOR');
    expect(rolPrincipal(['ADMIN'])).toBe('ADMIN');
    expect(rolPrincipal(['ASISTENTE'])).toBe('ASISTENTE');
  });

  it('decide la ruta de inicio según el acceso usado (como en Android)', () => {
    expect(rutaInicio(['ASISTENTE', 'ORGANIZADOR'], false)).toBe('/');
    expect(rutaInicio(['ASISTENTE', 'ORGANIZADOR'], true)).toBe('/organizador');
    expect(rutaInicio(['ASISTENTE', 'VALIDADOR'], true)).toBe('/validador');
    expect(rutaInicio(['ADMIN'], true)).toBe('/admin');
    expect(rutaInicio(['ASISTENTE'], true)).toBe('/');
  });

  it('reconoce al personal y consulta roles sin fallar con listas vacías', () => {
    expect(esPersonal(['ASISTENTE'])).toBe(false);
    expect(esPersonal(['ASISTENTE', 'VALIDADOR'])).toBe(true);
    expect(tieneRol(undefined, 'ADMIN')).toBe(false);
  });
});
