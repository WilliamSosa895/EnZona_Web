import { describe, expect, it } from 'vitest';
import type { Evento, Reporte, UsuarioAdmin } from '@/api/tipos';
import { calcularEstadisticas, etiquetaMes } from './estadisticas';

const usuario = (id: number, estado: UsuarioAdmin['estado'], roles: UsuarioAdmin['roles']): UsuarioAdmin => ({
  id,
  nombre: `U${id}`,
  correo: `u${id}@uv.mx`,
  telefono: null,
  estado,
  correoVerificado: true,
  roles,
  fechaRegistro: '2026-09-01T10:00:00-06:00',
});

const evento = (id: number, o: Partial<Evento>): Evento => ({
  id,
  organizadorId: 2,
  nombre: `Evento ${id}`,
  descripcion: null,
  lugar: 'Foro',
  direccion: null,
  ciudad: 'Orizaba',
  latitud: null,
  longitud: null,
  categoriaId: 1,
  categoria: 'Música',
  fechaHoraInicio: '2026-10-30T20:00:00-06:00',
  fechaHoraFin: null,
  esDePago: true,
  requiereAsiento: false,
  aforo: 100,
  disponibles: 100,
  precioDesde: '100.00',
  estado: 'PUBLICADO',
  distanciaKm: null,
  fechaCancelacion: null,
  motivoCancelacion: null,
  tiposBoleto: null,
  ...o,
});

const reporte = (eventoId: number, o: Partial<Reporte>): Reporte => ({
  eventoId,
  evento: '',
  estado: 'PUBLICADO',
  aforo: 100,
  disponibles: 0,
  boletosEmitidos: 0,
  accesosValidados: 0,
  accesosRechazados: 0,
  boletosCancelados: 0,
  ingresos: '0.00',
  reembolsado: '0.00',
  ocupacion: 0,
  porTipo: [],
  ...o,
});

describe('calcularEstadisticas (como EstadisticasAdminTest de Android)', () => {
  const e = calcularEstadisticas(
    [
      usuario(1, 'ACTIVO', ['ASISTENTE']),
      usuario(2, 'ACTIVO', ['ASISTENTE', 'ORGANIZADOR']),
      usuario(3, 'PENDIENTE', ['ASISTENTE']),
      usuario(4, 'BLOQUEADO', ['ASISTENTE', 'VALIDADOR']),
      usuario(5, 'ACTIVO', ['ADMIN']),
    ],
    [
      evento(1, { disponibles: 40 }),
      evento(2, { categoria: 'Teatro', disponibles: 90, fechaHoraInicio: '2026-11-05T19:00:00-06:00' }),
      evento(3, { estado: 'BORRADOR', esDePago: false, categoria: null }),
      evento(4, { estado: 'CANCELADO', fechaHoraInicio: '2026-09-15T19:00:00-06:00' }),
      evento(5, { estado: 'REALIZADO', aforo: 50, disponibles: 10 }),
    ],
    [
      reporte(1, { boletosEmitidos: 60, accesosValidados: 30, ingresos: '6000.00' }),
      reporte(2, { boletosEmitidos: 10, ingresos: '1000.00' }),
      reporte(4, { boletosCancelados: 5, reembolsado: '500.00', ingresos: '500.00' }),
      reporte(5, { boletosEmitidos: 40, accesosValidados: 38, ingresos: '4000.00' }),
    ],
  );

  it('cuenta cuentas por estado y por rol', () => {
    expect([e.usuariosTotal, e.usuariosActivos, e.usuariosPendientes, e.usuariosBloqueados]).toEqual([5, 3, 1, 1]);
    expect([e.organizadores, e.validadores, e.administradores]).toEqual([1, 1, 1]);
  });

  it('agrupa eventos por estado, categoría y mes', () => {
    expect([e.eventosPublicados, e.eventosBorrador, e.eventosRealizados, e.eventosCancelados]).toEqual([2, 1, 1, 1]);
    expect([e.eventosGratuitos, e.eventosDePago]).toEqual([1, 4]);
    expect(e.eventosPorCategoria).toEqual([
      { etiqueta: 'Música', valor: 3 },
      { etiqueta: 'Sin categoría', valor: 1 },
      { etiqueta: 'Teatro', valor: 1 },
    ]);
    expect(e.eventosPorMes.map((m) => m.etiqueta)).toEqual(['sep 26', 'oct 26', 'nov 26']);
  });

  it('suma ingresos y accesos de los reportes y calcula ocupación y asistencia', () => {
    expect(e.ingresosTotales).toBe(11_500);
    expect(e.ingresosNetos).toBe(11_000);
    expect(e.ingresosPorEvento[0]).toEqual({ etiqueta: 'Evento 1', valor: 6000 });
    expect(e.boletosEmitidos).toBe(110);
    expect(Math.round(e.asistencia)).toBe(62);
    // Publicados y realizados: (60 + 10 + 40) de (100 + 100 + 50)
    expect(Math.round(e.ocupacionGlobal)).toBe(44);
    expect(e.ocupacionPorEvento.map((d) => d.valor)).toEqual([60, 10]);
  });

  it('etiqueta los meses como «oct 26»', () => {
    expect(etiquetaMes('2026-10')).toBe('oct 26');
    expect(etiquetaMes('2030-01')).toBe('ene 30');
  });
});
