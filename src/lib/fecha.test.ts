import { describe, expect, it } from "vitest";
import { aCampos, aIso, bloque, corto, enRango, hora, intervalo, largo, rangoDeFiltro, yaComenzo } from "./fecha";

describe("fechas en la zona del evento (America/Mexico_City)", () => {
  const inicio = "2026-11-20T20:00:00-06:00";

  it("formatea el formato corto de la app", () => {
    expect(corto(inicio)).toBe("Vie 20 Nov · 20:00");
  });

  it("formatea el formato largo con año", () => {
    expect(largo(inicio)).toBe("Vie 20 Nov 2026 · 20:00");
  });

  it("convierte un instante UTC a la hora del centro de México", () => {
    expect(hora("2026-11-21T02:00:00Z")).toBe("20:00");
  });

  it("muestra el intervalo del mismo día con la hora de fin", () => {
    expect(intervalo(inicio, "2026-11-20T23:00:00-06:00")).toBe("Vie 20 Nov · 20:00 – 23:00");
  });

  it("muestra el intervalo de días distintos con la fecha de fin completa", () => {
    expect(intervalo(inicio, "2026-11-21T01:00:00-06:00")).toBe("Vie 20 Nov · 20:00 – Sáb 21 Nov · 01:00");
  });

  it("entrega el bloque de fecha de la tarjeta", () => {
    expect(bloque(inicio)).toEqual({ dia: "20", mes: "nov" });
  });

  it("separa un ISO en los campos date y time del formulario", () => {
    expect(aCampos(inicio)).toEqual({ fecha: "2026-11-20", hora: "20:00" });
  });

  it("arma el ISO de la API con el desfase de la Ciudad de México", () => {
    expect(aIso("2026-11-20", "20:00")).toBe("2026-11-20T20:00:00-06:00");
  });

  it("detecta si un evento ya comenzó", () => {
    expect(yaComenzo(inicio, new Date("2026-11-21T03:00:00Z"))).toBe(true);
    expect(yaComenzo(inicio, new Date("2026-11-20T00:00:00Z"))).toBe(false);
  });

  it("calcula el rango de hoy en la zona del evento", () => {
    const ahora = new Date("2026-11-20T15:00:00-06:00");
    const rango = rangoDeFiltro("hoy", ahora);
    expect(rango.desde.toISOString()).toBe("2026-11-20T06:00:00.000Z");
    expect(rango.hasta.toISOString()).toBe("2026-11-21T06:00:00.000Z");
    expect(enRango(inicio, rango)).toBe(true);
    expect(enRango("2026-11-21T10:00:00-06:00", rango)).toBe(false);
  });

  it("calcula el próximo mes completo", () => {
    const rango = rangoDeFiltro("proximo-mes", new Date("2026-11-20T15:00:00-06:00"));
    expect(rango.desde.toISOString()).toBe("2026-12-01T06:00:00.000Z");
    expect(rango.hasta.toISOString()).toBe("2027-01-01T06:00:00.000Z");
  });

  it("devuelve vacío con fechas inválidas", () => {
    expect(corto(null)).toBe("");
    expect(corto("no es fecha")).toBe("");
  });
});
