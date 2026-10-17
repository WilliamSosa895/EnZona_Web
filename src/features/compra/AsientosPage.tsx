import { useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MdAdd, MdCalendarMonth, MdCenterFocusWeak, MdClose, MdEventBusy, MdEventSeat, MdRemove } from 'react-icons/md';
import { boletajeApi } from '@/api/boletaje';
import { eventosApi } from '@/api/eventos';
import type { Asiento, Evento } from '@/api/tipos';
import { claves } from '@/app/consultas';
import { corto } from '@/lib/fechas';
import { importeMxn, multiplicar } from '@/lib/formato';
import { esCodigo, mensajeDeError } from '@/lib/errores';
import { nuevaClave } from '@/lib/idempotencia';
import {
  Aviso,
  BarraAccion,
  BarraSuperior,
  BotonIcono,
  BotonSecundario,
  BotonTexto,
  Dialogo,
  DosColumnas,
  EstadoVacio,
  FilaDato,
  IndicadorCarga,
  Selector,
} from '@/ui';
import { Leyenda, PlanoAsientos } from './PlanoAsientos';
import { compararNumero, etiquetaCorta, etiquetaLarga, leerIds, leerPedido, rutaPago, ZOOM } from './pedido';
import estilos from './Compra.module.css';

/**
 * Selección de asientos (RF-09, compra múltiple). La selección es un CONJUNTO de N asientos distintos: tocar
 * una butaca libre la añade y tocar una elegida la quita; nunca se reemplazan en silencio. Elegir no reserva:
 * la reserva ocurre al confirmar (gratuito) o al aprobarse el pago, en la misma operación que emite los boletos.
 */
export default function AsientosPage() {
  const id = Number(useParams().id);
  const [parametros] = useSearchParams();
  const pedido = leerPedido(parametros, id);
  const evento = useQuery({ queryKey: claves.evento(id), queryFn: ({ signal }) => eventosApi.detalle(id, signal) });
  const asientos = useQuery({
    queryKey: claves.asientos(id),
    queryFn: ({ signal }) => eventosApi.asientos(id, signal),
    // Revalidación periódica: si alguien toma un asiento elegido, se señala antes de continuar.
    refetchInterval: 20_000,
  });

  if (!pedido) return <Navigate to="/" replace />;
  if (evento.isPending || asientos.isPending) return <IndicadorCarga texto="Cargando el plano…" />;
  if (evento.isError || asientos.isError)
    return (
      <>
        <BarraSuperior titulo="Elige tu asiento" volver />
        <EstadoVacio
          icono={<MdEventBusy size={56} />}
          titulo="No se pudo cargar el plano"
          texto={mensajeDeError(evento.error ?? asientos.error)}
          textoAccion="Reintentar"
          onAccion={() => {
            void evento.refetch();
            void asientos.refetch();
          }}
        />
      </>
    );
  if (!evento.data.requiereAsiento) return <Navigate to={`/eventos/${id}`} replace />;

  return <Plano evento={evento.data} asientos={asientos.data} tipoId={pedido.tipoId} cantidad={pedido.cantidad} />;
}

interface PlanoProps {
  evento: Evento;
  asientos: Asiento[];
  tipoId: number | null;
  cantidad: number;
}

function Plano({ evento, asientos, tipoId, cantidad }: PlanoProps) {
  const navegar = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const [tamano, setTamano] = useState<number>(ZOOM.inicial);
  const [avisoLimite, setAvisoLimite] = useState<string | null>(null);
  const [porNumero, setPorNumero] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  // La selección vive en la URL (?sel=): sobrevive a recargar y a volver desde el pago.
  const seleccionados = useMemo(() => leerIds(parametros.get('sel')).slice(0, cantidad), [parametros, cantidad]);
  const tipo = evento.tiposBoleto?.find((t) => t.id === tipoId) ?? null;
  const elegidos = seleccionados.map((sid) => asientos.find((a) => a.id === sid)).filter((a): a is Asiento => !!a);
  const yaNoLibres = elegidos.filter((a) => a.estado !== 'DISPONIBLE');
  const listos = elegidos.length === cantidad && yaNoLibres.length === 0;
  const faltan = cantidad - elegidos.length;
  const libres = asientos.filter((a) => a.estado === 'DISPONIBLE').length;
  const precioUnitario = evento.esDePago ? (tipo?.precio ?? evento.precioDesde) : '0';
  const total = multiplicar(precioUnitario, cantidad);

  function guardar(ids: number[]) {
    const siguiente = new URLSearchParams(parametros);
    if (ids.length) siguiente.set('sel', ids.join(','));
    else siguiente.delete('sel');
    setParametros(siguiente, { replace: true });
  }

  function alternar(sid: number) {
    setAvisoLimite(null);
    if (seleccionados.includes(sid)) return guardar(seleccionados.filter((x) => x !== sid));
    if (seleccionados.length >= cantidad) {
      setAvisoLimite(
        cantidad === 1
          ? 'Ya elegiste tu asiento. Quítalo para cambiarlo por otro.'
          : `Ya elegiste ${cantidad} de ${cantidad}. Quita uno para cambiarlo.`,
      );
      return;
    }
    guardar([...seleccionados, sid]);
  }

  function continuar() {
    if (!listos) return;
    if (evento.esDePago) navegar(rutaPago({ eventoId: evento.id, tipoId, cantidad, asientosIds: seleccionados }));
    else setConfirmando(true);
  }

  const resumen =
    yaNoLibres.length > 0
      ? `Quita ${yaNoLibres.length === 1 ? 'el asiento ocupado' : 'los asientos ocupados'} para continuar`
      : faltan > 0 && elegidos.length === 0
        ? cantidad === 1
          ? 'Toca un asiento libre para elegirlo'
          : `Toca ${cantidad} asientos libres para elegirlos`
        : faltan > 0
          ? `Faltan ${faltan} de ${cantidad} · ${importeMxn(total)}`
          : evento.esDePago
            ? `${elegidos.length} de ${cantidad} · ${importeMxn(total)} · total final`
            : `${elegidos.map(etiquetaCorta).join(', ')} · Gratis`;

  return (
    <>
      <BarraSuperior titulo={cantidad === 1 ? 'Elige tu asiento' : `Elige ${cantidad} asientos`} volver />
      {porNumero && (
        <DialogoPorNumero
          asientos={asientos}
          excluidos={seleccionados}
          onCerrar={() => setPorNumero(false)}
          onElegir={(sid) => {
            alternar(sid);
            setPorNumero(false);
          }}
        />
      )}
      {confirmando && listos && (
        <DialogoConfirmar evento={evento} elegidos={elegidos} tipoId={tipoId} onCerrar={() => setConfirmando(false)} />
      )}
      <DosColumnas
        principal={
          <>
            <div>
              <h1 className={estilos.tituloEvento}>{evento.nombre}</h1>
              <p className={estilos.apoyo}>
                {libres} asientos libres de {asientos.length}
                {tipo ? ` · ${tipo.nombre}` : ''}
              </p>
            </div>
            <div className={estilos.herramientas}>
              <Leyenda />
              <div className={estilos.botonesPlano}>
                <BotonSecundario
                  icono={<MdEventSeat />}
                  onClick={() => setPorNumero(true)}
                  disabled={elegidos.length >= cantidad}
                >
                  Elegir por número
                </BotonSecundario>
                <div className={estilos.zoom}>
                  <BotonIcono
                    etiqueta="Reducir el plano"
                    tonal
                    disabled={tamano <= ZOOM.minimo}
                    onClick={() => setTamano((t) => Math.max(ZOOM.minimo, t - ZOOM.paso))}
                  >
                    <MdRemove />
                  </BotonIcono>
                  <BotonIcono etiqueta="Restablecer la vista" tonal onClick={() => setTamano(ZOOM.inicial)}>
                    <MdCenterFocusWeak />
                  </BotonIcono>
                  <BotonIcono
                    etiqueta="Ampliar el plano"
                    tonal
                    disabled={tamano >= ZOOM.maximo}
                    onClick={() => setTamano((t) => Math.min(ZOOM.maximo, t + ZOOM.paso))}
                  >
                    <MdAdd />
                  </BotonIcono>
                </div>
              </div>
            </div>
            <PlanoAsientos asientos={asientos} seleccionados={seleccionados} tamano={tamano} onAlternar={alternar} />
            <p className={estilos.notaPie}>
              Elegir asientos no los aparta todavía: se reservan al confirmar. Si alguien toma uno antes, te avisaremos
              para que elijas otro.
            </p>
          </>
        }
        lateral={
          <>
            <section className={estilos.seleccion} aria-label="Tu selección">
              <h2 className={estilos.subtitulo} aria-live="polite">
                Seleccionados {elegidos.length} de {cantidad}
              </h2>
              {elegidos.length > 0 && (
                <ul className={estilos.chips}>
                  {elegidos.map((a) => {
                    const ocupado = a.estado !== 'DISPONIBLE';
                    return (
                      <li key={a.id}>
                        <button
                          type="button"
                          className={[estilos.chip, ocupado ? estilos.chipOcupado : ''].join(' ')}
                          onClick={() => alternar(a.id)}
                          aria-label={`Quitar ${etiquetaLarga(a)}`}
                        >
                          {ocupado ? `${etiquetaCorta(a)} · ocupado` : `${a.seccion} · ${etiquetaCorta(a)}`}
                          <MdClose aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {yaNoLibres.length > 0 && (
                <Aviso
                  titulo="Un asiento se ocupó mientras elegías"
                  texto={`${yaNoLibres.map(etiquetaLarga).join('; ')}: quítalo de tu selección y elige otro libre.`}
                  tono="aviso"
                  anunciar
                />
              )}
            </section>
            <BarraAccion
              textoBoton={
                !evento.esDePago
                  ? 'Confirmar asiento'
                  : cantidad === 1
                    ? 'Continuar al pago'
                    : `Continuar al pago · ${cantidad} boletos`
              }
              resumen={resumen}
              habilitado={listos}
              onClick={continuar}
              aviso={avisoLimite ? <Aviso texto={avisoLimite} tono="aviso" anunciar /> : undefined}
            />
          </>
        }
      />
    </>
  );
}

// ---------------------------------------------------------------- elegir por número

interface PorNumeroProps {
  asientos: Asiento[];
  excluidos: number[];
  onCerrar: () => void;
  onElegir: (id: number) => void;
}

/** Selección accesible por sección, fila y número (alternativa al plano táctil). */
function DialogoPorNumero({ asientos, excluidos, onCerrar, onElegir }: PorNumeroProps) {
  const secciones = [...new Set(asientos.map((a) => a.seccion))];
  const [seccion, setSeccion] = useState<string | null>(secciones[0] ?? null);
  const filas = [...new Set(asientos.filter((a) => a.seccion === seccion).map((a) => a.fila))].sort(compararNumero);
  const [fila, setFila] = useState<string | null>(filas[0] ?? null);
  const filaActual = fila && filas.includes(fila) ? fila : (filas[0] ?? null);
  const libresEnFila = asientos
    .filter(
      (a) => a.seccion === seccion && a.fila === filaActual && a.estado === 'DISPONIBLE' && !excluidos.includes(a.id),
    )
    .sort((a, b) => compararNumero(a.numero, b.numero));
  const [asientoId, setAsientoId] = useState<number | null>(null);
  const elegido = libresEnFila.find((a) => a.id === asientoId) ?? null;

  return (
    <Dialogo
      titulo="Elegir por número"
      onCerrar={onCerrar}
      acciones={
        <>
          <BotonTexto onClick={onCerrar}>Cancelar</BotonTexto>
          <BotonTexto onClick={() => elegido && onElegir(elegido.id)} disabled={!elegido}>
            Añadir asiento
          </BotonTexto>
        </>
      }
    >
      <p>Solo se muestran los asientos libres que aún no elegiste. Se añade a tu selección.</p>
      <Selector
        etiqueta="Sección"
        opciones={secciones.map((s) => ({ valor: s, texto: s }))}
        valor={seccion}
        onCambio={(s) => {
          setSeccion(s);
          setFila(null);
          setAsientoId(null);
        }}
      />
      <Selector
        etiqueta="Fila"
        opciones={filas.map((f) => ({ valor: f, texto: f }))}
        valor={filaActual}
        onCambio={(f) => {
          setFila(f);
          setAsientoId(null);
        }}
      />
      <Selector
        etiqueta="Asiento"
        opciones={libresEnFila.map((a) => ({ valor: a.id, texto: a.numero }))}
        valor={elegido?.id ?? null}
        marcador="Elige un número"
        deshabilitado={libresEnFila.length === 0}
        onCambio={setAsientoId}
      />
      {filaActual && libresEnFila.length === 0 && (
        <Aviso texto={`No quedan asientos libres en la fila ${filaActual}.`} tono="aviso" />
      )}
    </Dialogo>
  );
}

// ---------------------------------------------------------------- confirmación (evento gratuito)

interface ConfirmarProps {
  evento: Evento;
  elegidos: Asiento[];
  tipoId: number | null;
  onCerrar: () => void;
}

function DialogoConfirmar({ evento, elegidos, tipoId, onCerrar }: ConfirmarProps) {
  const navegar = useNavigate();
  const consultas = useQueryClient();
  const clave = useRef(nuevaClave());
  const confirmacion = useMutation({
    mutationFn: () =>
      boletajeApi.crearOrden(
        {
          eventoId: evento.id,
          tipoBoletoId: tipoId,
          cantidad: elegidos.length,
          asientosIds: elegidos.map((a) => a.id),
          metodo: 'GRATIS',
          tokenPago: null,
        },
        clave.current,
      ),
    onSuccess: (orden) => {
      void consultas.invalidateQueries({ queryKey: claves.misBoletos });
      void consultas.invalidateQueries({ queryKey: claves.evento(evento.id) });
      void consultas.invalidateQueries({ queryKey: claves.asientos(evento.id) });
      const primero = orden.boletos[0];
      navegar(primero ? `/boletos/${primero.id}` : `/ordenes/${orden.ordenId}`, { replace: true });
    },
    onError: (e) => {
      if (!esCodigo(e, 'SIN_CONEXION')) clave.current = nuevaClave();
      if (esCodigo(e, 'ASIENTO_NO_DISPONIBLE', 'AFORO_AGOTADO'))
        void consultas.invalidateQueries({ queryKey: claves.asientos(evento.id) });
    },
  });
  const procesando = confirmacion.isPending;

  return (
    <Dialogo
      titulo="Confirmar asistencia"
      onCerrar={procesando ? undefined : onCerrar}
      acciones={
        <>
          <BotonTexto onClick={onCerrar} disabled={procesando}>
            Cancelar
          </BotonTexto>
          <BotonTexto onClick={() => confirmacion.mutate()} disabled={procesando}>
            {procesando ? 'Confirmando…' : 'Confirmar asiento'}
          </BotonTexto>
        </>
      }
    >
      <strong className={estilos.dialogoEvento}>{evento.nombre}</strong>
      <FilaDato icono={<MdCalendarMonth />} valor={corto(evento.fechaHoraInicio)} />
      {elegidos.map((a) => (
        <strong key={a.id} className={estilos.dialogoAsiento}>
          {etiquetaLarga(a)}
        </strong>
      ))}
      <p>
        Se apartará este asiento a tu nombre y recibirás tu boleto QR. Este evento es gratuito: no hay ningún cobro.
      </p>
      {confirmacion.isError && (
        <Aviso
          titulo={esCodigo(confirmacion.error, 'ASIENTO_NO_DISPONIBLE') ? 'La disponibilidad cambió' : undefined}
          texto={mensajeDeError(confirmacion.error)}
          tono="error"
          anunciar
        />
      )}
    </Dialogo>
  );
}
