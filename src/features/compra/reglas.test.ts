import { describe, expect, it } from "vitest";
import type { AsientoDto, EventoDto } from "@/lib/api/tipos";
import {
  asientosLibres,
  cupoDisponible,
  esClaveValida,
  estadoDelDetalle,
  faltanAsientos,
  nuevaClaveIdempotencia,
  parsearAsientos,
  parsearCantidad,
  parsearTipo,
  textoCupo,
  tiposElegibles,
} from "./reglas";

const base: EventoDto = {
  id: 1,
  nombre: "Noche de jazz en el Foro",
  lugar: "Foro Cultural Orizaba",
  fechaHoraInicio: "2030-10-31T20:00:00-06:00",
  esDePago: true,
  requiereAsiento: true,
  aforo: 50,
  disponibles: 48,
  estado: "PUBLICADO",
  tiposBoleto: [
    { id: 2, nombre: "Preferente", precio: "250.00", cantidadTotal: 20, disponibles: 20 },
    { id: 1, nombre: "Platea", precio: "180.00", cantidadTotal: 30, disponibles: 28 },
  ],
};

describe("reglas de compra (RF-09, RF-10, RF-11, RF-16)", () => {
  it("ordena los tipos del más barato al más caro y no muestra tipos en gratuitos", () => {
    expect(tiposElegibles(base).map((tipo) => tipo.nombre)).toEqual(["Platea", "Preferente"]);
    expect(tiposElegibles({ ...base, esDePago: false })).toEqual([]);
  });

  it("limita la cantidad al mínimo entre cupo, stock del tipo, asientos libres y máximo por orden", () => {
    const tipo = base.tiposBoleto![1];
    expect(cupoDisponible(base, tipo)).toBe(10); // ORDER_MAX_TICKETS
    expect(cupoDisponible({ ...base, disponibles: 3 }, tipo)).toBe(3);
    expect(cupoDisponible(base, { ...tipo, disponibles: 2 })).toBe(2);
    expect(cupoDisponible(base, tipo, 1)).toBe(1);
  });

  it("admite una sola confirmación por persona en eventos gratuitos (CP-MULTI-09)", () => {
    expect(cupoDisponible({ ...base, esDePago: false, disponibles: 142 }, null)).toBe(1);
    expect(cupoDisponible({ ...base, esDePago: false, disponibles: 0 }, null)).toBe(0);
  });

  it("describe el estado del detalle", () => {
    expect(estadoDelDetalle(base)).toBe("disponible");
    expect(estadoDelDetalle({ ...base, estado: "CANCELADO" })).toBe("cancelado");
    expect(estadoDelDetalle({ ...base, estado: "REALIZADO" })).toBe("realizado");
    expect(estadoDelDetalle({ ...base, estado: "BORRADOR" })).toBe("no-publicado");
    expect(estadoDelDetalle({ ...base, disponibles: 0 })).toBe("agotado");
    expect(estadoDelDetalle({ ...base, fechaHoraInicio: "2020-01-01T10:00:00-06:00" })).toBe("comenzo");
  });

  it("cuenta asientos libres y los que faltan por elegir (CP-MULTI-03)", () => {
    const asientos: AsientoDto[] = [
      { id: 1, estado: "DISPONIBLE" },
      { id: 2, estado: "OCUPADO" },
      { id: 3, estado: "RESERVADO" },
      { id: 4, estado: "DISPONIBLE" },
    ];
    expect(asientosLibres(asientos)).toBe(2);
    expect(faltanAsientos(2, 3)).toBe(1);
    expect(faltanAsientos(3, 3)).toBe(0);
    expect(faltanAsientos(4, 3)).toBe(0);
  });

  it("arma los textos de cupo del detalle", () => {
    expect(textoCupo(base)).toEqual({ titulo: "48 lugares disponibles", detalle: "48 asientos libres de 50" });
    expect(textoCupo({ ...base, requiereAsiento: false, disponibles: 1, aforo: 300 })).toEqual({ titulo: "1 lugar disponible", detalle: "Aforo de 300 personas" });
    expect(textoCupo({ ...base, disponibles: 0 }).titulo).toBe("Sin lugares disponibles");
  });

  it("parsea los parámetros de la URL sin duplicados ni valores inválidos", () => {
    expect(parsearAsientos("5-7-7-x-0")).toEqual([5, 7]);
    expect(parsearAsientos(undefined)).toEqual([]);
    expect(parsearCantidad("3", 10)).toBe(3);
    expect(parsearCantidad("12", 10)).toBe(10);
    expect(parsearCantidad("abc", 10)).toBe(1);
    expect(parsearTipo("0")).toBeNull();
    expect(parsearTipo("4")).toBe(4);
  });

  it("genera claves de idempotencia válidas para la API (8 a 64 caracteres)", () => {
    const clave = nuevaClaveIdempotencia();
    expect(esClaveValida(clave)).toBe(true);
    expect(esClaveValida("corta")).toBe(false);
    expect(esClaveValida("con espacios no vale")).toBe(false);
    expect(nuevaClaveIdempotencia()).not.toBe(clave);
  });
});
