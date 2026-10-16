/**
 * Formato de importes en pesos mexicanos (es-MX). Equivale a util/Formato.kt de la app Android:
 * toda la interfaz pasa por aquí para que un mismo precio se lea igual en la tarjeta, el detalle, el pago y el boleto.
 */
const moneda = (decimales: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });

const sinCentavos = moneda(0);
const conCentavos = moneda(2);

/** Convierte el texto de la API ("360.00") a número. */
export function aNumero(importe: string | number | null | undefined): number {
  if (importe === null || importe === undefined) return 0;
  const valor = typeof importe === 'number' ? importe : Number.parseFloat(importe);
  return Number.isFinite(valor) ? valor : 0;
}

/** "$120" o "$120.50" (solo muestra centavos si el importe los tiene). */
export function precio(importe: string | number): string {
  const valor = aNumero(importe);
  return (Number.isInteger(valor) ? sinCentavos : conCentavos).format(valor);
}

/** "$120.00", siempre con centavos: para desgloses y totales de cobro. */
export function importe(valor: string | number): string {
  return conCentavos.format(aNumero(valor));
}

/** "$120.00 MXN". */
export function importeMxn(valor: string | number): string {
  return `${importe(valor)} MXN`;
}

/** Etiqueta de precio para tarjetas: "Gratis" o "Desde $120". */
export function etiquetaPrecio(esDePago: boolean, precioDesde: string | number): string {
  const valor = aNumero(precioDesde);
  return !esDePago || valor <= 0 ? 'Gratis' : `Desde ${precio(valor)}`;
}

/** "142 lugares" / "1 lugar" / "Sin lugares". */
export function lugares(disponibles: number): string {
  if (disponibles <= 0) return 'Sin lugares';
  if (disponibles === 1) return '1 lugar';
  return `${disponibles.toLocaleString('es-MX')} lugares`;
}

/** "1 boleto" / "3 boletos". */
export function boletos(cantidad: number): string {
  return cantidad === 1 ? '1 boleto' : `${cantidad} boletos`;
}

/** Suma exacta de importes en centavos para evitar errores de coma flotante. */
export function multiplicar(precioUnitario: string | number, cantidad: number): number {
  return (Math.round(aNumero(precioUnitario) * 100) * cantidad) / 100;
}
