import { describe, expect, it } from "vitest";
import { boletoKDeN, distancia, etiquetaPrecio, importe, importeMxn, lugares, precio, totalDe } from "./formato";

describe("formato de importes (MXN)", () => {
  it("muestra el precio sin centavos cuando no los tiene", () => {
    expect(precio("180.00")).toBe("$180");
    expect(precio(120)).toBe("$120");
  });

  it("muestra el precio con centavos cuando los tiene", () => {
    expect(precio("120.50")).toBe("$120.50");
  });

  it("muestra el importe siempre con dos decimales", () => {
    expect(importe("360")).toBe("$360.00");
    expect(importeMxn(360)).toBe("$360.00 MXN");
  });

  it("etiqueta Gratis o Desde según el evento", () => {
    expect(etiquetaPrecio(false, "0.00")).toBe("Gratis");
    expect(etiquetaPrecio(true, "0")).toBe("Gratis");
    expect(etiquetaPrecio(true, "180.00")).toBe("Desde $180");
  });

  it("calcula el total con decimales exactos (CP-MULTI-11)", () => {
    expect(totalDe("180.00", 2)).toBe(360);
    expect(totalDe("33.33", 3)).toBe(99.99);
    expect(totalDe("0.10", 3)).toBe(0.3);
  });

  it("cuenta lugares y boletos en singular y plural", () => {
    expect(lugares(0)).toBe("Sin lugares");
    expect(lugares(1)).toBe("1 lugar");
    expect(lugares(142)).toBe("142 lugares");
    expect(boletoKDeN(2, 3)).toBe("Boleto 2 de 3");
  });

  it("formatea distancias en metros o kilómetros", () => {
    expect(distancia(0.35)).toBe("350 m");
    expect(distancia(1.44)).toBe("1.4 km");
  });

  it("trata importes nulos o inválidos como cero", () => {
    expect(importe(null)).toBe("$0.00");
    expect(importe("abc")).toBe("$0.00");
  });
});
