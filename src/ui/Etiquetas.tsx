import { MdBlock, MdCheckCircle, MdDoneAll, MdEventBusy, MdHistoryToggleOff } from 'react-icons/md';
import type { EstadoBoleto, EstadoEvento } from '@/api/tipos';
import { Etiqueta } from './Superficies';
import type { Tono } from './tono';

const BOLETO: Record<EstadoBoleto, { texto: string; tono: Tono; icono: JSX.Element }> = {
  VALIDO: { texto: 'Válido', tono: 'exito', icono: <MdCheckCircle /> },
  USADO: { texto: 'Usado', tono: 'neutro', icono: <MdDoneAll /> },
  CANCELADO: { texto: 'Cancelado', tono: 'error', icono: <MdBlock /> },
  EXPIRADO: { texto: 'Expirado', tono: 'neutro', icono: <MdHistoryToggleOff /> },
};

/** Estado del boleto (diagrama de estados): válido, usado, cancelado, expirado. Distinto del estado del pago. */
export function EtiquetaEstadoBoleto({ estado }: { estado: EstadoBoleto }) {
  const e = BOLETO[estado];
  return <Etiqueta texto={e.texto} tono={e.tono} icono={e.icono} />;
}

export function EtiquetaAgotado() {
  return <Etiqueta texto="Agotado" tono="error" icono={<MdEventBusy />} />;
}

const EVENTO: Record<EstadoEvento, { texto: string; tono: Tono }> = {
  BORRADOR: { texto: 'Borrador', tono: 'neutro' },
  PUBLICADO: { texto: 'Publicado', tono: 'exito' },
  REALIZADO: { texto: 'Realizado', tono: 'aviso' },
  CANCELADO: { texto: 'Cancelado', tono: 'error' },
};

export function EtiquetaEstadoEvento({ estado }: { estado: EstadoEvento }) {
  return <Etiqueta texto={EVENTO[estado].texto} tono={EVENTO[estado].tono} />;
}
