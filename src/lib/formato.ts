/*
 * Formato de importes en pesos mexicanos (español de México).
 * Equivalente de `util/Formato.kt`: un mismo precio se lee igual en la
 * tarjeta, el detalle, el pago y el boleto.
 */

const LOCALE = "es-MX";

function moneda(decimales: number): Intl.NumberFormat {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "MXN",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

const SIN_CENTAVOS = moneda(0);
const CON_CENTAVOS = moneda(2);

/** Importe de la API ("360.00") o número a número. */
export function aNumero(importe: string | number | null | undefined): number {
  if (importe === null || importe === undefined) return 0;
  const valor = typeof importe === "number" ? importe : Number.parseFloat(importe);
  return Number.isFinite(valor) ? valor : 0;
}

/** "$120" o "$120.50" (solo muestra centavos si el importe los tiene). */
export function precio(importe: string | number | null | undefined): string {
  const valor = aNumero(importe);
  const tieneCentavos = Math.abs(valor % 1) > 0.000001;
  return (tieneCentavos ? CON_CENTAVOS : SIN_CENTAVOS).format(valor);
}

/** "$120.00", siempre con centavos: para desgloses y totales de cobro. */
export function importe(valor: string | number | null | undefined): string {
  return CON_CENTAVOS.format(aNumero(valor));
}

/** "$120 MXN". */
export function precioMxn(valor: string | number | null | undefined): string {
  return `${precio(valor)} MXN`;
}

/** "$120.00 MXN". */
export function importeMxn(valor: string | number | null | undefined): string {
  return `${importe(valor)} MXN`;
}

/** Etiqueta de precio para tarjetas: "Gratis" o "Desde $120". */
export function etiquetaPrecio(esDePago: boolean, precioDesde: string | number | null | undefined): string {
  const valor = aNumero(precioDesde);
  return !esDePago || valor <= 0 ? "Gratis" : `Desde ${precio(valor)}`;
}

/** "142 lugares" / "1 lugar" / "Sin lugares". */
export function lugares(disponibles: number): string {
  if (disponibles <= 0) return "Sin lugares";
  if (disponibles === 1) return "1 lugar";
  return `${disponibles} lugares`;
}

/** "350 m" por debajo de un kilómetro; "1.4 km" en adelante. */
export function distancia(km: number): string {
  if (km < 1) {
    const metros = Math.max(10, Math.round((km * 1000) / 10) * 10);
    return `${metros} m`;
  }
  return `${km.toFixed(1)} km`;
}

/** "Boleto 2 de 3". */
export function boletoKDeN(indice: number, total: number): string {
  return `Boleto ${indice} de ${total}`;
}

/** Precio × cantidad con dos decimales exactos, como calcula el servidor. */
export function totalDe(precioUnitario: string | number | null | undefined, cantidad: number): number {
  const centavos = Math.round(aNumero(precioUnitario) * 100);
  return (centavos * cantidad) / 100;
}

/** "1 boleto" / "3 boletos". */
export function boletos(cantidad: number): string {
  return cantidad === 1 ? "1 boleto" : `${cantidad} boletos`;
}
