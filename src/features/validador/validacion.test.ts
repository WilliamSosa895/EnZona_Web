import { describe, expect, it } from 'vitest';
import type { Manifiesto } from '@/api/tipos';
import {
  admitidosSinConexion,
  registrosSincronizados,
  resultadoEnLinea,
  resumirSincronizacion,
  tituloValidacion,
  validarSinConexion,
} from './validacion';

const manifiesto: Manifiesto = {
  eventoId: 1,
  evento: 'Noche de jazz',
  generadoEn: '2026-10-25T18:00:00Z',
  total: 3,
  boletos: [
    { codigo: 'EZ-1', firma: 'aaa', estado: 'VALIDO', tipoBoleto: 'General', asiento: 'Platea · Fila A · Asiento 1' },
    { codigo: 'EZ-2', firma: 'bbb', estado: 'USADO', tipoBoleto: 'General', asiento: null },
  ],
};

describe('títulos (Mapeo.kt)', () => {
  it('usa los mismos textos que la app Android', () => {
    expect(tituloValidacion('PERMITIDO', null)).toBe('Acceso permitido');
    expect(tituloValidacion('RECHAZADO', 'FIRMA_INVALIDA')).toBe('Boleto no válido');
    expect(tituloValidacion('RECHAZADO', 'FORMATO_INVALIDO')).toBe('Código no reconocido');
    expect(tituloValidacion('RECHAZADO', 'YA_UTILIZADO', true)).toBe('Boleto ya admitido en otro dispositivo');
  });

  it('en línea, el detalle de un acceso permitido junta mensaje, tipo y asiento', () => {
    const r = resultadoEnLinea({
      resultado: 'PERMITIDO',
      motivo: null,
      mensaje: 'Acceso permitido',
      codigo: 'EZ-1',
      tipoBoleto: 'VIP',
      asiento: 'A1',
      fechaUso: null,
    });
    expect(r).toMatchObject({ permitido: true, detalle: 'Acceso permitido · VIP · A1', asiento: 'A1' });
  });
});

describe('validarSinConexion', () => {
  it('admite un boleto vigente del manifiesto', () => {
    const r = validarSinConexion('EZ-1.aaa', manifiesto, new Set());
    expect(r).toMatchObject({ permitido: true, codigo: 'EZ-1', asiento: 'Platea · Fila A · Asiento 1' });
    expect(r.detalle).toContain('pendiente de sincronizar');
  });

  it('rechaza lo que no está, lo ya usado y lo ya admitido en este equipo', () => {
    expect(validarSinConexion('EZ-9.zzz', manifiesto, new Set()).titulo).toBe('Boleto no reconocido');
    expect(validarSinConexion('EZ-1.mal', manifiesto, new Set()).titulo).toBe('Boleto no reconocido');
    expect(validarSinConexion('EZ-2.bbb', manifiesto, new Set()).titulo).toBe('Boleto ya utilizado');
    const otraVez = validarSinConexion('EZ-1.aaa', manifiesto, new Set(['EZ-1.aaa']));
    expect(otraVez).toMatchObject({
      permitido: false,
      detalle: 'Este dispositivo ya admitió este boleto sin conexión.',
    });
  });

  it('solo cuenta como admitidos los permitidos del mismo evento', () => {
    const admitidos = admitidosSinConexion(
      [
        { eventoId: 1, qr: 'a', fechaHora: '1', permitido: true, titulo: '' },
        { eventoId: 1, qr: 'b', fechaHora: '2', permitido: false, titulo: '' },
        { eventoId: 2, qr: 'c', fechaHora: '3', permitido: true, titulo: '' },
      ],
      1,
    );
    expect([...admitidos]).toEqual(['a']);
  });
});

describe('sincronización', () => {
  it('empareja el veredicto del servidor por posición y cuenta conflictos como ya admitidos', () => {
    const enviados = [
      { eventoId: 1, qr: 'EZ-1.aaa', fechaHora: '2026-10-25T20:01:00Z', permitido: true, titulo: 'Acceso permitido' },
      { eventoId: 1, qr: 'EZ-1.aaa', fechaHora: '2026-10-25T20:00:00Z', permitido: true, titulo: 'Acceso permitido' },
    ];
    const respuesta = {
      procesados: 2,
      permitidos: 1,
      rechazados: 1,
      conflictos: 1,
      resultados: [
        {
          qr: 'EZ-1.aaa',
          fechaHora: '2026-10-25T20:00:00Z',
          resultado: 'PERMITIDO' as const,
          motivo: null,
          conflicto: false,
          duplicado: false,
        },
        {
          qr: 'EZ-1.aaa',
          fechaHora: '2026-10-25T20:01:00Z',
          resultado: 'RECHAZADO' as const,
          motivo: 'YA_UTILIZADO' as const,
          conflicto: true,
          duplicado: false,
        },
      ],
    };
    const registros = registrosSincronizados(enviados, respuesta);
    expect(registros.map((r) => [r.fechaHora, r.permitido, r.titulo])).toEqual([
      ['2026-10-25T20:00:00Z', true, 'Acceso permitido'],
      ['2026-10-25T20:01:00Z', false, 'Boleto ya admitido en otro dispositivo'],
    ]);
    expect(resumirSincronizacion(2, [respuesta])).toEqual({ enviadas: 2, permitidas: 1, rechazadas: 1, duplicadas: 1 });
  });
});
