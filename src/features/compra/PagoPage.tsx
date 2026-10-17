import { useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MdCalendarMonth,
  MdConfirmationNumber,
  MdCreditCard,
  MdEventBusy,
  MdEventSeat,
  MdLocationOn,
  MdLock,
} from 'react-icons/md';
import { boletajeApi } from '@/api/boletaje';
import { eventosApi } from '@/api/eventos';
import { ApiError } from '@/api/http';
import type { Asiento, Evento, Orden } from '@/api/tipos';
import { claves } from '@/app/consultas';
import { corto } from '@/lib/fechas';
import { boletos as textoBoletos, importe, importeMxn, multiplicar } from '@/lib/formato';
import { esCodigo, mensajeDeError } from '@/lib/errores';
import { nuevaClave } from '@/lib/idempotencia';
import {
  Aviso,
  BarraAccion,
  BarraSuperior,
  Divisor,
  DosColumnas,
  EstadoVacio,
  FilaDato,
  FilaImporte,
  IndicadorCarga,
  Selector,
  Tarjeta,
  ZonaDemostracion,
} from '@/ui';
import { leerPedido, type Pedido } from './pedido';
import estilos from './Compra.module.css';

/** Escenarios de la pasarela sandbox de la API (PasarelaSandbox). */
const ESCENARIOS = [
  { valor: 'tok_aprobado', texto: 'Pago aprobado' },
  { valor: 'tok_rechazado', texto: 'Pago rechazado (CP-10)' },
  { valor: 'tok_pendiente', texto: 'Pago pendiente de confirmación' },
  { valor: 'tok_error', texto: 'La pasarela no responde' },
] as const;
type Escenario = (typeof ESCENARIOS)[number]['valor'];

/**
 * Pago de la orden (RF-11, compra múltiple). Muestra el desglose y el total final (RNF-09) y ejecuta UNA
 * operación que emite los N boletos o ninguno. La `Idempotency-Key` se conserva mientras se reintenta el mismo
 * intento (un doble clic o una falla de red no duplican el cobro) y se renueva tras un resultado definitivo.
 */
export default function PagoPage() {
  const [parametros] = useSearchParams();
  const pedido = leerPedido(parametros);
  const eventoId = pedido?.eventoId ?? 0;
  const evento = useQuery({
    queryKey: claves.evento(eventoId),
    queryFn: ({ signal }) => eventosApi.detalle(eventoId, signal),
    enabled: !!pedido,
  });
  const conAsientos = !!evento.data?.requiereAsiento;
  const asientos = useQuery({
    queryKey: claves.asientos(eventoId),
    queryFn: ({ signal }) => eventosApi.asientos(eventoId, signal),
    enabled: conAsientos,
  });

  if (!pedido) return <Navigate to="/" replace />;
  if (evento.isPending || (conAsientos && asientos.isPending)) return <IndicadorCarga texto="Preparando tu orden…" />;
  if (evento.isError || asientos.isError)
    return (
      <>
        <BarraSuperior titulo="Pago" volver />
        <EstadoVacio
          icono={<MdEventBusy size={56} />}
          titulo="No se pudo preparar el pago"
          texto={mensajeDeError(evento.error ?? asientos.error)}
          textoAccion="Reintentar"
          onAccion={() => void evento.refetch()}
        />
      </>
    );
  if (!evento.data.esDePago) return <Navigate to={`/eventos/${eventoId}`} replace />;

  return <Pago evento={evento.data} asientos={asientos.data ?? []} pedido={pedido} />;
}

type Rechazo = { titulo: string; texto: string; recuperable: boolean };

function Pago({ evento, asientos, pedido }: { evento: Evento; asientos: Asiento[]; pedido: Pedido }) {
  const navegar = useNavigate();
  const consultas = useQueryClient();
  const clave = useRef(nuevaClave());
  const [escenario, setEscenario] = useState<Escenario>('tok_aprobado');
  const [rechazo, setRechazo] = useState<Rechazo | null>(null);

  const n = pedido.cantidad;
  const tipos = evento.tiposBoleto ?? [];
  const tipo = tipos.find((t) => t.id === pedido.tipoId) ?? (tipos.length === 1 ? tipos[0] : null);
  const elegidos = pedido.asientosIds.map((id) => asientos.find((a) => a.id === id)).filter((a): a is Asiento => !!a);
  const precioUnitario = tipo?.precio ?? evento.precioDesde;
  const comision = 0; // sin comisión al asistente durante el piloto
  const total = multiplicar(precioUnitario, n) + comision;

  // Comprobación previa (la API la repite al cobrar, dentro de la transacción).
  const ocupados = elegidos.filter((a) => a.estado !== 'DISPONIBLE');
  const cupo = tipo?.disponibles ?? evento.disponibles;
  const bloqueoPrevio: string | null =
    evento.estado !== 'PUBLICADO'
      ? 'Este evento ya no admite compras.'
      : !tipo && tipos.length > 1
        ? 'Elige un tipo de boleto en el detalle del evento.'
        : evento.requiereAsiento && elegidos.length !== n
          ? `La selección de asientos no coincide con la cantidad (${n}). Vuelve al plano para corregirla.`
          : ocupados.length > 0
            ? `Se ocuparon ${ocupados.map((a) => `Fila ${a.fila} · ${a.numero}`).join(', ')}. Vuelve al plano y elige otros.`
            : cupo < n
              ? cupo <= 0
                ? 'Ya no quedan lugares para este evento.'
                : `Solo quedan ${cupo} lugares y pediste ${n}. Vuelve y ajusta la cantidad.`
              : null;

  const pago = useMutation({
    mutationFn: () =>
      boletajeApi.crearOrden(
        {
          eventoId: evento.id,
          tipoBoletoId: tipo?.id ?? null,
          cantidad: n,
          asientosIds: pedido.asientosIds,
          metodo: 'TARJETA',
          tokenPago: escenario,
        },
        clave.current,
      ),
    onSuccess: (orden: Orden) => {
      // Cualquier respuesta de la API es definitiva para esta clave: el siguiente intento usa una nueva.
      clave.current = nuevaClave();
      void consultas.invalidateQueries({ queryKey: claves.evento(evento.id) });
      void consultas.invalidateQueries({ queryKey: claves.asientos(evento.id) });
      void consultas.invalidateQueries({ queryKey: ['eventos'] });
      if (orden.estadoOrden === 'CANCELADA') {
        setRechazo({
          titulo: 'Pago rechazado',
          texto: orden.mensaje ?? 'La pasarela rechazó el pago. No se realizó ningún cargo.',
          recuperable: true,
        });
        return;
      }
      void consultas.invalidateQueries({ queryKey: claves.misBoletos });
      consultas.setQueryData(claves.orden(orden.ordenId), orden);
      navegar(`/ordenes/${orden.ordenId}`, { replace: true });
    },
    onError: (e) => {
      // Falla de red o del servidor: el cobro pudo llegar a la pasarela, así que se reintenta con la MISMA clave.
      const transitorio = e instanceof ApiError && (e.status === 0 || e.status >= 500);
      if (!transitorio) clave.current = nuevaClave();
      if (esCodigo(e, 'ASIENTO_NO_DISPONIBLE', 'AFORO_AGOTADO', 'ESTADO_INVALIDO')) {
        void consultas.invalidateQueries({ queryKey: claves.asientos(evento.id) });
        void consultas.invalidateQueries({ queryKey: claves.evento(evento.id) });
      }
      setRechazo({
        titulo: transitorio ? 'No pudimos confirmar el pago' : 'No se pudo completar la compra',
        texto: transitorio ? `${mensajeDeError(e)} Si reintentas no se te cobrará dos veces.` : mensajeDeError(e),
        recuperable: transitorio,
      });
    },
  });
  const procesando = pago.isPending;

  function pagar() {
    if (procesando || bloqueoPrevio) return; // evita el doble envío
    setRechazo(null);
    pago.mutate();
  }

  const volver = () => navegar(-1);
  const aviso = bloqueoPrevio ? (
    <Aviso titulo="Revisa tu pedido" texto={bloqueoPrevio} tono="aviso" textoAccion="Volver" onAccion={volver} />
  ) : rechazo ? (
    <Aviso
      titulo={rechazo.titulo}
      texto={rechazo.texto}
      tono="error"
      anunciar
      textoAccion={rechazo.recuperable ? 'Reintentar' : 'Volver a revisar'}
      onAccion={rechazo.recuperable ? pagar : volver}
    />
  ) : undefined;

  return (
    <>
      <BarraSuperior titulo="Pago" volver volverHabilitado={!procesando} />
      <DosColumnas
        principal={
          <>
            <Tarjeta>
              <p className={estilos.etiquetaTarjeta}>Tu orden</p>
              <h2 className={estilos.tituloOrden}>{evento.nombre}</h2>
              <div className={estilos.datos}>
                <FilaDato icono={<MdCalendarMonth />} etiqueta="Fecha" valor={corto(evento.fechaHoraInicio)} />
                <FilaDato icono={<MdLocationOn />} etiqueta="Lugar" valor={evento.lugar} />
                <FilaDato
                  icono={<MdConfirmationNumber />}
                  etiqueta="Tipo de boleto"
                  valor={tipo?.nombre ?? 'Entrada general'}
                  apoyo={n === 1 ? '1 boleto' : `${n} boletos · un código QR por boleto`}
                />
                {elegidos.length > 0 && (
                  <FilaDato
                    icono={<MdEventSeat />}
                    etiqueta="Asientos"
                    valor={
                      elegidos.length === 1
                        ? elegidos[0].etiqueta
                        : elegidos.map((a) => `${a.seccion} Fila ${a.fila} · ${a.numero}`).join(', ')
                    }
                    apoyo={elegidos.length > 1 ? `${elegidos.length} asientos` : undefined}
                  />
                )}
              </div>
            </Tarjeta>

            <Tarjeta>
              <p className={estilos.etiquetaTarjeta}>Desglose</p>
              <FilaImporte
                concepto={`Boleto × ${n} (${importe(precioUnitario)} c/u)`}
                importe={importe(multiplicar(precioUnitario, n))}
              />
              <FilaImporte concepto="Cargo por servicio" importe={importe(comision)} />
              <Divisor />
              <FilaImporte concepto="Total a pagar" importe={importeMxn(total)} destacada />
              <p className={estilos.apoyo}>
                Este es el importe final. No hay cargos adicionales ni tarifas que cambien según la demanda.
              </p>
            </Tarjeta>
          </>
        }
        lateral={
          <>
            <section className={estilos.metodos} aria-labelledby="titulo-metodo">
              <h2 id="titulo-metodo" className={estilos.subtitulo}>
                Método de pago
              </h2>
              <div className={estilos.opcionPago} aria-current="true">
                <MdCreditCard aria-hidden="true" />
                <div>
                  <strong>Tarjeta de crédito o débito</strong>
                  <span>El cobro lo procesa la pasarela de pago</span>
                </div>
              </div>
              <ZonaDemostracion>
                <p className={estilos.apoyo}>
                  La pasarela está en modo de pruebas: no se realiza ningún cargo real. Elige el resultado que
                  devolverá.
                </p>
                <Selector
                  etiqueta="Resultado de la pasarela"
                  opciones={ESCENARIOS.map((e) => ({ valor: e.valor, texto: e.texto }))}
                  valor={escenario}
                  deshabilitado={procesando}
                  onCambio={(valor) => {
                    setEscenario(valor);
                    setRechazo(null);
                  }}
                />
              </ZonaDemostracion>
              <p className={estilos.seguridad}>
                <MdLock aria-hidden="true" />
                El cobro lo procesa una pasarela externa. EnZona no almacena el número de tu tarjeta ni el CVV.
              </p>
            </section>
            <BarraAccion
              textoBoton={
                procesando
                  ? 'Procesando el pago'
                  : bloqueoPrevio
                    ? 'No se puede completar'
                    : `Pagar ${importeMxn(total)}`
              }
              resumen={`Total final: ${importeMxn(total)} · ${textoBoletos(n)}`}
              habilitado={!procesando && !bloqueoPrevio}
              cargando={procesando}
              onClick={pagar}
              aviso={aviso}
            />
          </>
        }
      />
    </>
  );
}
