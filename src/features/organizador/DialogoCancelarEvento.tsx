import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { eventosApi } from '@/api/eventos';
import type { CancelacionRespuesta, PoliticaCancelacion } from '@/api/tipos';
import { claves } from '@/app/consultas';
import { aNumero, boletos, importeMxn } from '@/lib/formato';
import { mensajeDeError } from '@/lib/errores';
import { Aviso, Boton, BotonTexto, Campo, Dialogo, IndicadorCarga } from '@/ui';

interface Props {
  eventoId: number;
  nombreEvento: string;
  /** Cancelación por moderación (administrador): el motivo es obligatorio. */
  administrativa?: boolean;
  onCerrar: () => void;
  onCancelado: (r: CancelacionRespuesta) => void;
}

/**
 * Cancelación de un evento (RF-14). Muestra la política que calcula la API (única fuente de verdad) y no
 * vuelve a calcular nada; si la cancelación está bloqueada, explica por qué (DialogoCancelarEvento en Android).
 */
export function DialogoCancelarEvento({
  eventoId,
  nombreEvento,
  administrativa = false,
  onCerrar,
  onCancelado,
}: Props) {
  const [motivo, setMotivo] = useState('');
  const [intentado, setIntentado] = useState(false);
  const politica = useQuery({
    queryKey: claves.politica(eventoId),
    queryFn: ({ signal }) => eventosApi.politicaCancelacion(eventoId, signal),
    staleTime: 0,
  });
  const cancelacion = useMutation({
    mutationFn: () => eventosApi.cancelar(eventoId, motivo.trim() || null),
    onSuccess: onCancelado,
  });
  const p = politica.data;
  const motivoValido = !administrativa || motivo.trim().length >= 5;
  const procesando = cancelacion.isPending;

  function confirmar() {
    setIntentado(true);
    if (!p?.permitida || !motivoValido || procesando) return;
    cancelacion.mutate();
  }

  return (
    <Dialogo
      titulo={administrativa ? 'Cancelar evento (administración)' : '¿Cancelar el evento?'}
      onCerrar={procesando ? undefined : onCerrar}
      acciones={
        <>
          <BotonTexto onClick={onCerrar} disabled={procesando}>
            {p && !p.permitida ? 'Cerrar' : 'Conservar evento'}
          </BotonTexto>
          {p?.permitida && (
            <Boton variante="peligro" cargando={procesando} onClick={confirmar}>
              {procesando ? 'Cancelando…' : 'Cancelar evento'}
            </Boton>
          )}
        </>
      }
    >
      <strong style={{ font: 'var(--title-medium)', color: 'var(--on-surface)' }}>{nombreEvento}</strong>
      {politica.isPending && <IndicadorCarga texto="Consultando la política de cancelación…" />}
      {politica.isError && <Aviso texto={mensajeDeError(politica.error)} tono="error" />}
      {p && !p.permitida && <Aviso titulo="Cancelación bloqueada" texto={p.motivoBloqueo ?? ''} tono="error" />}
      {p?.permitida && (
        <>
          <p>{textoPolitica(p, administrativa)}</p>
          {p.tipo === 'DE_PAGO_SIN_VENTAS' && (
            <Aviso texto="Este evento de pago no tiene ventas: la cancelación procede como en un evento gratuito." />
          )}
          {p.tipo === 'ADMINISTRATIVA' && (
            <Aviso texto="Cancelación por moderación: los asistentes reciben el 100 % de reembolso y no se cobra nada al organizador. Se registrará quién canceló y por qué." />
          )}
          {aNumero(p.comision) > 0 && (
            <Aviso
              tono="aviso"
              titulo={`Comisión de cancelación: ${importeMxn(p.comision)}`}
              texto="Los asistentes reciben el 100 % de reembolso; la comisión se carga a tu cuenta de organizador."
            />
          )}
          {(administrativa || p.tipo !== 'BORRADOR') && (
            <Campo
              etiqueta={administrativa ? 'Motivo de la cancelación' : 'Motivo (opcional, se avisa a los asistentes)'}
              valor={motivo}
              onCambio={setMotivo}
              lineas={2}
              maxLength={500}
              disabled={procesando}
              error={intentado && !motivoValido ? 'Escribe el motivo (mínimo 5 caracteres).' : null}
            />
          )}
          <p style={{ font: 'var(--body-small)', color: 'var(--on-surface-variant)' }}>
            Esta acción no se puede deshacer. Se avisará a los asistentes.
          </p>
        </>
      )}
      {cancelacion.isError && <Aviso texto={mensajeDeError(cancelacion.error)} tono="error" anunciar />}
    </Dialogo>
  );
}

function textoPolitica(p: PoliticaCancelacion, administrativa: boolean): string {
  const n = p.boletosAfectados;
  const reembolso = aNumero(p.reembolso);
  if (administrativa && n === 0) return 'Se cancelará el evento. No hay confirmaciones ni boletos que anular.';
  if (reembolso > 0)
    return `Se cancelará el evento, se anularán ${boletos(n)} y se reembolsarán ${importeMxn(reembolso)} a los asistentes por el mismo medio de pago.`;
  if (p.tipo === 'BORRADOR') return 'El evento está en borrador: se cancelará sin afectar a nadie.';
  if (n === 0) return 'Se cancelará el evento. Todavía no hay confirmaciones que anular.';
  return `Se cancelará el evento y se anularán ${n === 1 ? '1 confirmación' : `${n} confirmaciones`}.`;
}
