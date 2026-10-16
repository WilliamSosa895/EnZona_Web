/**
 * Validaciones de formulario idénticas a las de la API (FormatoCurp, PoliticaContrasena y DTOs),
 * para avisar antes de enviar. La API vuelve a validar: estas reglas son ayuda, no seguridad.
 */
const CURP =
  /^[A-Z][AEIOUX][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HMX](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$/;
const CONTRASENA = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEFONO = /^\+?[0-9]{10,15}$/;
const CODIGO = /^[0-9]{6}$/;

export const curpValido = (curp: string) => CURP.test(curp.trim().toUpperCase());
export const contrasenaValida = (c: string) => CONTRASENA.test(c);
export const correoValido = (c: string) => c.trim().length <= 180 && CORREO.test(c.trim());
/** Opcional: vacío es válido. Acepta 10 a 15 dígitos con "+" opcional, sin espacios. */
export const telefonoValido = (t: string) => t.trim() === '' || TELEFONO.test(t.replace(/[\s-]/g, ''));
export const codigoValido = (c: string) => CODIGO.test(c);

/** Normaliza el teléfono para la API: sin espacios ni guiones; null si está vacío. */
export function normalizarTelefono(t: string): string | null {
  const limpio = t.replace(/[\s-]/g, '');
  return limpio === '' ? null : limpio;
}

export const MENSAJES = {
  nombre: 'Escribe tu nombre completo.',
  correo: 'El correo no tiene un formato válido.',
  telefono: 'El teléfono debe tener de 10 a 15 dígitos.',
  curp: 'CURP inválido: deben ser 18 caracteres con el formato oficial.',
  contrasena: 'Mínimo 8 caracteres, con letras y números.',
  confirmar: 'Las contraseñas no coinciden.',
  aviso: 'Debes aceptar el aviso de privacidad.',
} as const;
