import { beforeEach, describe, expect, it } from "vitest";
import {
  agregarABitacora,
  aplicarVeredictos,
  contarVigentes,
  encolarPendiente,
  guardarManifiesto,
  leerBitacora,
  leerPendientes,
  limpiarPendientes,
  MAX_BITACORA,
  validarContraManifiesto,
} from "./almacen";

/* localStorage mínimo en memoria para las pruebas en Node. */
class AlmacenMemoria {
  private datos = new Map<string, string>();
  getItem(clave: string) {
    return this.datos.get(clave) ?? null;
  }
  setItem(clave: string, valor: string) {
    this.datos.set(clave, valor);
  }
  removeItem(clave: string) {
    this.datos.delete(clave);
  }
  clear() {
    this.datos.clear();
  }
}

describe("validación sin conexión (RNF-08, CP-14)", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", { value: new AlmacenMemoria(), configurable: true });
    guardarManifiesto({
      eventoId: 7,
      evento: "Noche de jazz",
      generadoEn: "2026-10-31T18:00:00-06:00",
      boletos: [
        { codigo: "EZ1", firma: "aaaa", estado: "VALIDO", tipoBoleto: "Platea", asiento: "Platea · Fila A · Asiento 1" },
        { codigo: "EZ2", firma: "bbbb", estado: "USADO", tipoBoleto: "Platea", asiento: "Platea · Fila A · Asiento 2" },
      ],
    });
  });

  it("cuenta los boletos vigentes del manifiesto", () => {
    const manifiesto = JSON.parse(localStorage.getItem("enzona:v1:manifiesto:7")!);
    expect(contarVigentes(manifiesto)).toBe(1);
  });

  it("admite un boleto del manifiesto una sola vez en el dispositivo (CP-12, CP-13)", () => {
    const primera = validarContraManifiesto(7, "EZ1.aaaa");
    expect(primera.permitido).toBe(true);
    expect(primera.asiento).toBe("Platea · Fila A · Asiento 1");
    const segunda = validarContraManifiesto(7, "EZ1.aaaa");
    expect(segunda.permitido).toBe(false);
    expect(segunda.motivo).toBe("YA_UTILIZADO");
  });

  it("rechaza boletos ya usados, inexistentes o con firma alterada", () => {
    expect(validarContraManifiesto(7, "EZ2.bbbb").motivo).toBe("YA_UTILIZADO");
    expect(validarContraManifiesto(7, "EZ9.zzzz").motivo).toBe("BOLETO_INEXISTENTE");
    expect(validarContraManifiesto(7, "EZ1.alterada").motivo).toBe("BOLETO_INEXISTENTE");
    expect(validarContraManifiesto(7, "sin-punto").motivo).toBe("FORMATO_INVALIDO");
  });

  it("sin manifiesto no valida", () => {
    expect(validarContraManifiesto(8, "EZ1.aaaa").permitido).toBe(false);
  });

  it("encola y limpia las validaciones pendientes de sincronizar", () => {
    encolarPendiente(7, { qr: "EZ1.aaaa", fechaHora: "2026-10-31T20:05:00-06:00" });
    expect(leerPendientes(7)).toHaveLength(1);
    limpiarPendientes(7);
    expect(leerPendientes(7)).toHaveLength(0);
  });

  it("guarda la bitácora local con un máximo de registros", () => {
    for (let indice = 0; indice < MAX_BITACORA + 5; indice += 1) {
      agregarABitacora(7, { qr: `q${indice}`, codigo: `c${indice}`, fechaHora: "x", permitido: true, titulo: "ok", detalle: "", offline: false, sincronizado: true });
    }
    expect(leerBitacora(7)).toHaveLength(MAX_BITACORA);
    expect(leerBitacora(7)[0].codigo).toBe(`c${MAX_BITACORA + 4}`);
  });

  it("aplica el veredicto del servidor a los registros sin conexión", () => {
    agregarABitacora(7, { qr: "EZ1.aaaa", codigo: "EZ1", fechaHora: "x", permitido: true, titulo: "Acceso permitido", detalle: "", offline: true, sincronizado: false });
    const bitacora = aplicarVeredictos(7, [{ qr: "EZ1.aaaa", resultado: "PERMITIDO", conflicto: true }]);
    expect(bitacora[0].sincronizado).toBe(true);
    expect(bitacora[0].permitido).toBe(false);
    expect(bitacora[0].titulo).toMatch(/otro dispositivo/);
  });
});
