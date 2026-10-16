import { describe, expect, it } from 'vitest';
import {
  aEntradaLocal,
  corto,
  desdeEntradaLocal,
  dia,
  fechaLocal,
  hora,
  intervalo,
  largo,
  mesCorto,
  yaPaso,
} from './fechas';

describe('fechas del evento en America/Mexico_City (equivalente a FechaEvento.kt)', () => {
  const iso = '2026-09-25T19:00:00-06:00';

  it('formato corto y largo como en la app Android', () => {
    expect(corto(iso)).toBe('Vie 25 Sep · 19:00');
    expect(corto('2026-12-05T09:30:00-06:00')).toBe('Sáb 5 Dic · 09:30');
    expect(largo(iso)).toContain('2026 · 19:00');
    expect(hora(iso)).toBe('19:00');
  });

  it('bloque de fecha de la portada', () => {
    expect(dia(iso)).toBe('25');
    expect(mesCorto(iso)).toBe('sep');
  });

  it('el intervalo omite la fecha de fin si es el mismo día', () => {
    expect(intervalo(iso, '2026-09-25T21:30:00-06:00')).toMatch(/· 19:00 – 21:30$/);
    expect(intervalo(iso, null)).toBe(corto(iso));
  });

  it('interpreta la hora en la zona del evento aunque el navegador esté en otra zona', () => {
    expect(hora('2026-09-26T01:00:00Z')).toBe('19:00');
    expect(fechaLocal(new Date('2026-09-26T01:00:00Z'))).toBe('2026-09-25');
  });

  it('convierte entre datetime-local y el ISO con desfase que espera la API', () => {
    expect(desdeEntradaLocal('2026-11-20T19:00')).toBe('2026-11-20T19:00:00-06:00');
    expect(aEntradaLocal('2026-11-20T19:00:00-06:00')).toBe('2026-11-20T19:00');
    expect(desdeEntradaLocal('no es fecha')).toBeNull();
  });

  it('sabe si un instante ya pasó', () => {
    expect(yaPaso('2000-01-01T00:00:00Z')).toBe(true);
    expect(yaPaso('2999-01-01T00:00:00Z')).toBe(false);
  });
});
