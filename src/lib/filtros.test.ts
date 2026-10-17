import { describe, expect, it } from 'vitest';
import { FILTROS_VACIOS, aConsulta, filtrosActivos, hayFiltros, rangoDeFecha } from './filtros';

describe('filtros de Inicio (RF-06, RF-07)', () => {
  const ahora = new Date('2026-10-14T18:00:00Z'); // miércoles 14 de octubre, 12:00 en Orizaba

  it('cuenta filtros activos sin contar la búsqueda', () => {
    expect(filtrosActivos(FILTROS_VACIOS)).toBe(0);
    expect(hayFiltros({ ...FILTROS_VACIOS, busqueda: 'jazz' })).toBe(true);
    expect(filtrosActivos({ ...FILTROS_VACIOS, precio: 'GRATIS', fecha: 'HOY' })).toBe(2);
  });

  it('calcula los rangos de fecha en la zona del evento', () => {
    expect(rangoDeFecha('HOY', ahora)).toEqual({
      desde: '2026-10-14T00:00:00-06:00',
      hasta: '2026-10-14T23:59:00-06:00',
    });
    expect(rangoDeFecha('ESTA_SEMANA', ahora)).toEqual({
      desde: '2026-10-12T00:00:00-06:00',
      hasta: '2026-10-18T23:59:00-06:00',
    });
    expect(rangoDeFecha('ESTE_MES', ahora)).toEqual({
      desde: '2026-10-01T00:00:00-06:00',
      hasta: '2026-10-31T23:59:00-06:00',
    });
    expect(rangoDeFecha('PROXIMO_MES', ahora)).toEqual({
      desde: '2026-11-01T00:00:00-06:00',
      hasta: '2026-11-30T23:59:00-06:00',
    });
    expect(rangoDeFecha('CUALQUIERA', ahora)).toEqual({});
  });

  it('arma la consulta de GET /api/eventos con ciudad o con ubicación', () => {
    const filtros = { ...FILTROS_VACIOS, busqueda: ' jazz ', categoriaId: 1, precio: 'DE_PAGO' as const };
    expect(aConsulta(filtros, { ciudad: 'Orizaba' }, ahora)).toEqual({
      q: 'jazz',
      categoriaId: 1,
      esDePago: true,
      ciudad: 'Orizaba',
    });
    const conUbicacion = aConsulta(FILTROS_VACIOS, { ciudad: 'Orizaba', lat: 18.85, lng: -97.1 }, ahora);
    expect(conUbicacion).toMatchObject({ lat: 18.85, lng: -97.1 });
    expect(conUbicacion.ciudad).toBeUndefined();
  });
});
