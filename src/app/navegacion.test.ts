import { describe, expect, it } from 'vitest';
import { destinosDeRol } from './navegacion';

const rutas = (...args: Parameters<typeof destinosDeRol>) => destinosDeRol(...args).map((d) => d.ruta);

describe('destinosDeRol (MainActivity.destinosDeRol en Android)', () => {
  it('el asistente con acceso normal ve Inicio, Mis boletos y Perfil', () => {
    expect(rutas(['ASISTENTE'])).toEqual(['/', '/boletos', '/perfil']);
  });

  it('con el acceso del personal se ocultan las pestañas de asistente', () => {
    expect(rutas(['ASISTENTE', 'VALIDADOR'], true)).toEqual(['/validador', '/perfil']);
    expect(rutas(['ASISTENTE', 'ORGANIZADOR'], true)).toEqual(['/organizador', '/perfil']);
    expect(rutas(['ADMIN'], true)).toEqual(['/admin', '/perfil']);
  });
});
