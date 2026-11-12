import { describe, expect, it } from "vitest";
import { aSolicitud, sumaCantidades, totalAsientos, validarEvento, valoresVacios, type ValoresEvento } from "./reglas";

function valido(): ValoresEvento {
  return {
    ...valoresVacios(),
    nombre: "Noche de jazz",
    lugar: "Foro Cultural Orizaba",
    fechaInicio: "2030-10-31",
    horaInicio: "20:00",
    latitud: 18.8506,
    longitud: -97.1003,
    esDePago: true,
    aforo: "50",
    tipos: [
      { id: null, nombre: "Platea", precio: "180", cantidad: "30" },
      { id: null, nombre: "Preferente", precio: "250", cantidad: "20" },
    ],
  };
}

describe("reglas del formulario de evento (RF-08, RF-13)", () => {
  const hoy = "2026-11-09";

  it("acepta un evento de pago completo", () => {
    expect(validarEvento(valido(), true, hoy)).toEqual({});
  });

  it("rechaza fechas pasadas y fin anterior al inicio (CP-FECHA, CP-HORA)", () => {
    expect(validarEvento({ ...valido(), fechaInicio: "2020-01-01" }, false, hoy).fechaInicio).toMatch(/anterior a hoy/);
    const conFin = { ...valido(), conFin: true, fechaFin: "2030-10-31", horaFin: "19:00" };
    expect(validarEvento(conFin, false, hoy).horaFin).toMatch(/posterior/);
  });

  it("exige coordenadas solo al publicar (CP-UBIC)", () => {
    const sinUbicacion = { ...valido(), latitud: null, longitud: null };
    expect(validarEvento(sinUbicacion, false, hoy).latitud).toBeUndefined();
    expect(validarEvento(sinUbicacion, true, hoy).latitud).toMatch(/ubicación/);
  });

  it("no permite que la suma de boletos supere el aforo", () => {
    const valores = { ...valido(), aforo: "40" };
    expect(validarEvento(valores, false, hoy).tipos).toMatch(/no puede superar el aforo/);
    expect(sumaCantidades(valores.tipos)).toBe(50);
  });

  it("calcula el aforo con asientos como filas × asientos por fila", () => {
    const valores: ValoresEvento = {
      ...valido(),
      requiereAsiento: true,
      secciones: [
        { nombre: "Planta baja", filas: "10", asientosPorFila: "18" },
        { nombre: "Balcón", filas: "5", asientosPorFila: "14" },
      ],
    };
    expect(totalAsientos(valores.secciones)).toBe(250);
    const solicitud = aSolicitud(valores, true, true);
    expect(solicitud.aforo).toBe(250);
    expect(solicitud.secciones).toHaveLength(2);
    expect(solicitud.publicar).toBe(true);
  });

  it("limita filas a 26 y asientos por fila a 200", () => {
    const valores: ValoresEvento = {
      ...valido(),
      requiereAsiento: true,
      secciones: [{ nombre: "X", filas: "27", asientosPorFila: "10" }],
    };
    expect(validarEvento(valores, false, hoy).secciones).toMatch(/1 a 26/);
  });

  it("arma la solicitud en el contrato de la API", () => {
    const solicitud = aSolicitud(valido(), false, true);
    expect(solicitud.fechaHoraInicio).toBe("2030-10-31T20:00:00-06:00");
    expect(solicitud.fechaHoraFin).toBeNull();
    expect(solicitud.tiposBoleto).toEqual([
      { id: null, nombre: "Platea", precio: 180, cantidad: 30 },
      { id: null, nombre: "Preferente", precio: 250, cantidad: 20 },
    ]);
    expect(solicitud.secciones).toBeNull();
    expect(solicitud.ciudad).toBe("Orizaba");
  });

  it("un evento gratuito no envía tipos: la API crea «General» a precio 0", () => {
    const solicitud = aSolicitud({ ...valido(), esDePago: false }, false, true);
    expect(solicitud.tiposBoleto).toBeNull();
    expect(solicitud.esDePago).toBe(false);
  });
});
