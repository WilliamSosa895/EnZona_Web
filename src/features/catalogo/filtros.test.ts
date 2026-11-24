import { describe, expect, it } from "vitest";
import type { EventoDto } from "@/lib/api/tipos";
import { aFiltrosApi, ciudadDe, coincideCiudad, contarFiltrosActivos, filtrarEnCliente, normalizarCiudad, tieneUbicacion } from "./filtros";

const evento = (id: number, lugar: string, fecha: string): EventoDto => ({
  id,
  nombre: `Evento ${id}`,
  lugar,
  fechaHoraInicio: fecha,
  esDePago: false,
  requiereAsiento: false,
  aforo: 10,
  disponibles: 10,
});

describe("filtros de Inicio (RF-05 a RF-07, RF-19)", () => {
  it("usa Orizaba cuando no hay zona elegida (RNF-11)", () => {
    expect(ciudadDe({})).toBe("Orizaba");
    expect(ciudadDe({ zona: "Córdoba" })).toBe("Córdoba");
  });

  it("no manda la ciudad a la API (coincidencia exacta) y sí las coordenadas (CP-17, CP-18)", () => {
    expect(aFiltrosApi({ zona: "Orizaba" })).toMatchObject({ ciudad: null, lat: null, lng: null });
    const conGps = aFiltrosApi({ lat: "18.851", lng: "-97.1" });
    expect(conGps.lat).toBeCloseTo(18.851);
    expect(conGps.lng).toBeCloseTo(-97.1);
    expect(tieneUbicacion({ lat: "18.851", lng: "-97.1" })).toBe(true);
    expect(tieneUbicacion({ lat: "x", lng: "-97.1" })).toBe(false);
  });

  it("traduce Gratis y De pago al parámetro esDePago", () => {
    expect(aFiltrosApi({ pago: "gratis" }).esDePago).toBe(false);
    expect(aFiltrosApi({ pago: "de-pago" }).esDePago).toBe(true);
    expect(aFiltrosApi({}).esDePago).toBeNull();
  });

  it("compara la zona sin acentos ni guiones y por contención («Cordoba-Orizaba» es Orizaba)", () => {
    expect(normalizarCiudad("Córdoba-Orizaba ")).toBe("cordoba orizaba");
    expect(coincideCiudad("Cordoba-Orizaba", "Orizaba")).toBe(true);
    expect(coincideCiudad("Orizaba, Veracruz", "orizaba")).toBe(true);
    expect(coincideCiudad("Cordoba-Orizaba", "Córdoba, Veracruz")).toBe(true);
    expect(coincideCiudad("Xalapa", "Córdoba, Veracruz")).toBe(false);
    expect(coincideCiudad("Xalapa", "Orizaba")).toBe(false);
    expect(coincideCiudad(null, "Orizaba")).toBe(true);
  });

  it("aplica la zona en el cliente salvo con ubicación activa", () => {
    const eventos = [
      { ...evento(1, "Foro", "2030-01-10T19:00:00-06:00"), ciudad: "Cordoba-Orizaba" },
      { ...evento(2, "Teatro", "2030-01-10T19:00:00-06:00"), ciudad: "Xalapa" },
    ];
    expect(filtrarEnCliente(eventos, {}).map((item) => item.id)).toEqual([1]);
    expect(filtrarEnCliente(eventos, { zona: "Xalapa" }).map((item) => item.id)).toEqual([2]);
    expect(filtrarEnCliente(eventos, { lat: "18.85", lng: "-97.1" }).map((item) => item.id)).toEqual([1, 2]);
  });

  it("filtra por fecha comparando instantes reales", () => {
    const ahora = new Date("2030-01-10T12:00:00-06:00");
    const eventos = [evento(1, "A", "2030-01-10T19:00:00-06:00"), evento(2, "B", "2030-02-02T10:00:00-06:00")];
    expect(filtrarEnCliente(eventos, { fecha: "hoy" }, ahora).map((item) => item.id)).toEqual([1]);
    expect(filtrarEnCliente(eventos, { fecha: "proximo-mes" }, ahora).map((item) => item.id)).toEqual([2]);
  });

  it("cuenta los filtros activos para el contador y «Limpiar filtros»", () => {
    expect(contarFiltrosActivos({})).toBe(0);
    expect(contarFiltrosActivos({ pago: "gratis", fecha: "hoy", lat: "1", lng: "2" })).toBe(3);
  });
});
