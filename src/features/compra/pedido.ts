import type { Asiento } from '@/api/tipos';

/** Boletos máximos por orden (ORDER_MAX_TICKETS de la API). */
export const MAXIMO_POR_ORDEN = 10;

/** Tamaño de la butaca en px: mínimo, inicial, máximo y paso del zoom (igual que en Android). */
export const ZOOM = { minimo: 22, inicial: 30, maximo: 46, paso: 6 } as const;

/** Datos de la compra que viajan en la URL entre el detalle, el plano y el pago. */
export interface Pedido {
  eventoId: number;
  tipoId: number | null;
  cantidad: number;
  asientosIds: number[];
}

const entero = (valor: string | null): number | null => {
  if (!valor || !/^\d{1,12}$/.test(valor)) return null;
  return Number(valor);
};

/** Lista de ids "1,2,3" sin duplicados ni valores inválidos. */
export function leerIds(valor: string | null): number[] {
  if (!valor) return [];
  return [
    ...new Set(
      valor
        .split(',')
        .map((x) => entero(x.trim()))
        .filter((x): x is number => x !== null),
    ),
  ];
}

/** Lee y acota los parámetros (la URL es editable: nunca se confía en ella sin validar). */
export function leerPedido(parametros: URLSearchParams, eventoId?: number): Pedido | null {
  const evento = eventoId ?? entero(parametros.get('evento'));
  if (!evento) return null;
  const cantidad = Math.min(Math.max(entero(parametros.get('cantidad')) ?? 1, 1), MAXIMO_POR_ORDEN);
  return {
    eventoId: evento,
    tipoId: entero(parametros.get('tipo')),
    cantidad,
    asientosIds: leerIds(parametros.get('asientos')).slice(0, cantidad),
  };
}

/** URL de la pantalla de pago para un pedido. */
export function rutaPago(p: Pedido): string {
  const q = new URLSearchParams({ evento: String(p.eventoId) });
  if (p.tipoId) q.set('tipo', String(p.tipoId));
  q.set('cantidad', String(p.cantidad));
  if (p.asientosIds.length) q.set('asientos', p.asientosIds.join(','));
  return `/pago?${q.toString()}`;
}

/** "Fila C · 7" para chips y resúmenes. */
export const etiquetaCorta = (a: Pick<Asiento, 'fila' | 'numero'>) => `Fila ${a.fila} · ${a.numero}`;

/** "Platea, fila C, asiento 7" para lectores de pantalla y la confirmación. */
export const etiquetaLarga = (a: Pick<Asiento, 'seccion' | 'fila' | 'numero'>) =>
  `${a.seccion}, fila ${a.fila}, asiento ${a.numero}`;

/** Compara números de asiento como números cuando lo son ("2" antes que "10"). */
export const compararNumero = (a: string, b: string) => a.localeCompare(b, 'es-MX', { numeric: true });
