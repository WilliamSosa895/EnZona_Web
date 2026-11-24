import { describe, expect, it } from "vitest";
import {
  claveAlmacen,
  guiaVista,
  marcarGuiaVista,
  posicionTarjeta,
  reiniciarGuias,
  trazarFlecha,
  trazoSombra,
  type AlmacenGuias,
} from "./guias";

function almacenDePrueba(): AlmacenGuias {
  const datos = new Map<string, string>();
  return {
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => void datos.set(clave, valor),
    removeItem: (clave) => void datos.delete(clave),
    key: (indice) => [...datos.keys()][indice] ?? null,
    get length() {
      return datos.size;
    },
  };
}

describe("guías de la primera vez (por cuenta, en el navegador)", () => {
  it("recuerda cada guía por usuario y las reinicia solo para esa cuenta", () => {
    const almacen = almacenDePrueba();
    expect(guiaVista(almacen, 7, "inicio")).toBe(false);
    marcarGuiaVista(almacen, 7, "inicio");
    marcarGuiaVista(almacen, 7, "boleto");
    marcarGuiaVista(almacen, 9, "inicio");
    expect(guiaVista(almacen, 7, "inicio")).toBe(true);
    expect(guiaVista(almacen, 9, "boleto")).toBe(false);
    expect(reiniciarGuias(almacen, 7)).toBe(2);
    expect(guiaVista(almacen, 7, "inicio")).toBe(false);
    expect(guiaVista(almacen, 9, "inicio")).toBe(true);
    expect(claveAlmacen(7, "inicio")).toBe("enzona:guias:7:inicio");
  });

  it("sin almacén las guías cuentan como vistas (nunca tapan la pantalla)", () => {
    expect(guiaVista(null, 1, "inicio")).toBe(true);
    expect(reiniciarGuias(null, 1)).toBe(0);
  });
});

describe("geometría de la guía", () => {
  const pantalla = { width: 390, height: 844 };
  const tarjeta = { width: 257, height: 120 };

  it("centra el texto cuando no hay foco", () => {
    expect(posicionTarjeta(null, pantalla, tarjeta, 84, 24)).toEqual({ x: 67, y: 362 });
  });

  it("pone el texto debajo del foco si cabe y encima si no", () => {
    const arriba = { left: 20, top: 100, width: 200, height: 48 };
    expect(posicionTarjeta(arriba, pantalla, tarjeta, 84, 24).y).toBe(232);
    const abajo = { left: 20, top: 760, width: 200, height: 48 };
    expect(posicionTarjeta(abajo, pantalla, tarjeta, 84, 24).y).toBe(760 - 84 - 120);
  });

  it("respeta la barra de botones y acorta la separación antes de pisarla", () => {
    const reserva = { arriba: 0, abajo: 68 };
    const chips = { left: 0, top: 245, width: 390, height: 64 };
    const alta = { width: 342, height: 204 };
    // Con 84 px quedaría en 597 px (pisa la barra en 664 − 24 − 68 = 572): baja a 42 px y cabe
    expect(posicionTarjeta(chips, { width: 390, height: 664 }, alta, 84, 24, reserva).y).toBe(309 + 42);
    // Sin foco, se centra en la zona libre entre el margen y la barra
    expect(posicionTarjeta(null, { width: 390, height: 664 }, tarjeta, 84, 24, { arriba: 68, abajo: 0 }).y).toBe(92 + (548 - 120) / 2);
  });

  it("la flecha llega al borde superior del foco cuando este queda debajo del texto", () => {
    const texto = { left: 24, top: 232, width: 257, height: 120 };
    const foco = { left: 20, top: 500, width: 200, height: 48 };
    const flecha = trazarFlecha(texto, foco, pantalla);
    expect(flecha.fin.y).toBe(500 - 14);
    expect(flecha.inicio.y).toBe(232 + 120 + 14);
    expect(flecha.fin.x).toBeGreaterThanOrEqual(foco.left + 14);
    expect(flecha.fin.x).toBeLessThanOrEqual(foco.left + foco.width - 14);
  });

  it("la flecha sale por la derecha cuando el foco está a la derecha del texto", () => {
    const texto = { left: 24, top: 300, width: 200, height: 80 };
    const foco = { left: 300, top: 320, width: 60, height: 40 };
    const flecha = trazarFlecha(texto, foco, pantalla);
    expect(flecha.inicio.x).toBe(224 + 14);
    expect(flecha.control).toEqual({ x: flecha.fin.x, y: flecha.inicio.y });
  });

  it("la sombra lleva un agujero redondeado solo cuando hay foco", () => {
    expect(trazoSombra(pantalla, null, 16)).toBe("M 0 0 H 390 V 844 H 0 Z");
    const conFoco = trazoSombra(pantalla, { left: 10, top: 10, width: 100, height: 40 }, 16);
    expect(conFoco.startsWith("M 0 0 H 390 V 844 H 0 Z M 26 10")).toBe(true);
  });
});
