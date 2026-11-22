/*
 * Validaciones puras de identidad (equivalente de `util/Validaciones.kt`).
 */

/** Formato oficial de la CURP: 18 caracteres. */
const CURP = /^[A-Z][AEIOUX][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$/;

export function esCurp(valor: string): boolean {
  return CURP.test(valor.trim().toUpperCase());
}

export function esCorreo(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim());
}

/** 10 a 15 dígitos, con `+` opcional (regla de la API). */
export function esTelefono(valor: string): boolean {
  return /^\+?\d{10,15}$/.test(valor.replace(/[\s()-]/g, ""));
}

/** 8 a 72 caracteres con letras y números (regla de la API). */
export function esContrasenaValida(valor: string): boolean {
  return valor.length >= 8 && valor.length <= 72 && /[A-Za-z]/.test(valor) && /\d/.test(valor);
}

/** Solo dígitos, máximo 6, para el campo del código. */
export function soloCodigo(valor: string): string {
  return valor.replace(/\D/g, "").slice(0, 6);
}
