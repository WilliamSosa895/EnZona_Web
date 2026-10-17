import type { Boleto } from '@/api/tipos';

/** "k de N" cuando la orden tiene más de un boleto; null si es único. */
export function posicionEnOrden(boleto: Boleto, todos: Boleto[]): { k: number; n: number } | null {
  const hermanos = hermanosDe(boleto, todos);
  if (hermanos.length <= 1) return null;
  return { k: hermanos.findIndex((b) => b.id === boleto.id) + 1, n: hermanos.length };
}

/** Boletos de la misma orden, en el orden en que se emitieron. */
export const hermanosDe = (boleto: Boleto, todos: Boleto[]) =>
  todos.filter((b) => b.ordenId === boleto.ordenId).sort((a, b) => a.id - b.id);

/** Vigentes primero (por fecha del evento), después usados, cancelados o expirados (los más recientes arriba). */
export function separar(boletos: Boleto[]) {
  const vigentes = boletos
    .filter((b) => b.estado === 'VALIDO')
    .sort((a, b) => a.fechaHoraInicio.localeCompare(b.fechaHoraInicio) || a.id - b.id);
  const anteriores = boletos
    .filter((b) => b.estado !== 'VALIDO')
    .sort((a, b) => b.fechaHoraInicio.localeCompare(a.fechaHoraInicio) || a.id - b.id);
  return { vigentes, anteriores };
}

/** Separa "Platea · Fila B · Asiento 8" en sección y "Fila B · 8"; si el formato cambia, devuelve el texto tal cual. */
export function partesAsiento(etiqueta: string): { seccion: string | null; lugar: string } {
  const m = /^(.+?) · Fila (.+?) · Asiento (.+)$/.exec(etiqueta);
  return m ? { seccion: m[1], lugar: `Fila ${m[2]} · ${m[3]}` } : { seccion: null, lugar: etiqueta };
}

/** "Platea · Platea · Fila B · 8" → "Platea · Fila B · 8": el tipo no se repite si coincide con la sección. */
export function descripcionBoleto(b: Pick<Boleto, 'tipoNombre' | 'asientoEtiqueta'>): string {
  if (!b.asientoEtiqueta) return b.tipoNombre ?? 'Entrada general';
  const { seccion, lugar } = partesAsiento(b.asientoEtiqueta);
  const asiento = seccion ? `${seccion} · ${lugar}` : lugar;
  return b.tipoNombre && b.tipoNombre !== seccion ? `${b.tipoNombre} · ${asiento}` : asiento;
}
