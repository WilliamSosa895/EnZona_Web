import { describe, expect, it } from "vitest";
import type { EventoDto, ReporteDto, UsuarioDto } from "@/lib/api/tipos";
import { calcularEstadisticas, enLotes } from "./estadisticas";

const usuarios: UsuarioDto[] = [
  { id: 1, nombre: "Ana", estado: "ACTIVO", roles: ["ASISTENTE"] },
  { id: 2, nombre: "Nancy", estado: "ACTIVO", roles: ["ASISTENTE", "ORGANIZADOR"] },
  { id: 3, nombre: "Luis", estado: "ACTIVO", roles: ["ASISTENTE", "VALIDADOR"] },
  { id: 4, nombre: "Admin", estado: "BLOQUEADO", roles: ["ADMIN"] },
];

const eventos: EventoDto[] = [
  { id: 1, nombre: "Feria", lugar: "Palacio", fechaHoraInicio: "2026-10-27T10:00:00-06:00", esDePago: false, requiereAsiento: false, aforo: 120, disponibles: 119, estado: "PUBLICADO", categoria: "Cultural" },
  { id: 2, nombre: "Jazz", lugar: "Foro", fechaHoraInicio: "2026-10-31T20:00:00-06:00", esDePago: true, requiereAsiento: true, aforo: 50, disponibles: 48, estado: "PUBLICADO", categoria: "Música" },
  { id: 3, nombre: "Taller", lugar: "Cerro", fechaHoraInicio: "2026-11-03T19:00:00-06:00", esDePago: true, requiereAsiento: false, aforo: 20, disponibles: 20, estado: "BORRADOR", categoria: "Taller" },
];

const reportes = new Map<number, ReporteDto | null>([
  [1, { eventoId: 1, boletosEmitidos: 1, accesosValidados: 0, ingresos: "0.00" }],
  [2, { eventoId: 2, boletosEmitidos: 2, accesosValidados: 1, ingresos: "360.00" }],
]);

describe("resumen de administración (RF-18)", () => {
  it("cuenta cuentas por estado y por rol", () => {
    const datos = calcularEstadisticas(usuarios, eventos, reportes);
    expect(datos.usuarios).toBe(4);
    expect(datos.cuentas).toEqual({ activas: 3, pendientes: 0, bloqueadas: 1 });
    expect(datos.porRol).toEqual({ organizadores: 1, validadores: 1, administradores: 1 });
  });

  it("cuenta eventos por estado, modalidad, categoría y mes", () => {
    const datos = calcularEstadisticas(usuarios, eventos, reportes);
    expect(datos.porEstado).toEqual({ publicados: 2, borradores: 1, realizados: 0, cancelados: 0 });
    expect(datos.gratuitos).toBe(1);
    expect(datos.dePago).toBe(2);
    expect(datos.porCategoria).toHaveLength(3);
    expect(datos.porMes).toEqual([
      { etiqueta: "oct 2026", total: 2 },
      { etiqueta: "nov 2026", total: 1 },
    ]);
  });

  it("suma boletos, accesos e ingresos y calcula la ocupación de los publicados", () => {
    const datos = calcularEstadisticas(usuarios, eventos, reportes);
    expect(datos.boletosEmitidos).toBe(3);
    expect(datos.accesosValidados).toBe(1);
    expect(datos.ingresos).toBe(360);
    expect(datos.ocupacion).toBe(2); // 3 de 170
    expect(datos.ingresosPorEvento).toEqual([{ nombre: "Jazz", ingresos: 360 }]);
  });

  it("procesa en lotes conservando el orden", async () => {
    const llamadas: number[][] = [];
    const resultado = await enLotes([1, 2, 3, 4, 5], 2, async (numero) => {
      llamadas.push([numero]);
      return numero * 10;
    });
    expect(resultado).toEqual([10, 20, 30, 40, 50]);
    expect(llamadas).toHaveLength(5);
  });
});
