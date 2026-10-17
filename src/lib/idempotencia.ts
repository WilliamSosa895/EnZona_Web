/**
 * Clave Idempotency-Key de una compra (8 a 64 caracteres: letras, números, - o _).
 * Se crea una por intento de compra y se reutiliza si ese MISMO intento se reintenta (por ejemplo, tras
 * perder la conexión), para no cobrar dos veces. Tras un resultado definitivo (pagada o rechazada) se cambia.
 */
export function nuevaClave(): string {
  const cripto = globalThis.crypto;
  if (typeof cripto.randomUUID === 'function') return cripto.randomUUID();
  const bytes = new Uint8Array(16);
  cripto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
