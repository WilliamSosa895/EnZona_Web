import { lazy, Suspense, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MdCalendarMonth, MdDirections, MdEventBusy, MdEventSeat, MdGroups, MdLocationOn } from 'react-icons/md';
import { boletajeApi } from '@/api/boletaje';
import { eventosApi } from '@/api/eventos';
import type { Evento, TipoBoleto } from '@/api/tipos';
import { claves } from '@/app/consultas';
import { esCodigo, mensajeDeError } from '@/lib/errores';
import { corto, intervalo, yaPaso } from '@/lib/fechas';
import { boletos as textoBoletos, importeMxn, lugares, multiplicar, precio } from '@/lib/formato';
import { nuevaClave } from '@/lib/idempotencia';
import {
  Aviso,
  BarraAccion,
  BarraSuperior,
  BotonTexto,
  Dialogo,
  EnlaceSecundario,
  EstadoVacio,
  Etiqueta,
  EtiquetaAgotado,
  FilaDato,
  IndicadorCarga,
  Portada,
  SelectorCantidad,
  Tarjeta,
} from '@/ui';
import { MAXIMO_POR_ORDEN, rutaPago } from '@/features/compra/pedido';
import { urlComoLlegar } from '@/features/mapa/geo';
import estilos from './Eventos.module.css';

const MiniMapa = lazy(() => import('@/features/mapa/Mapas').then((m) => ({ default: m.MiniMapa })));

/**
 * Detalle del evento (RF-09 a RF-11). En eventos de pago se elige el tipo y la cantidad (hasta la disponibilidad
 * real); la compra continúa al plano de asientos o al pago. En eventos gratuitos se confirma un lugar por persona,
 * con confirmación explícita (RF-10, CP-08), igual que EventDetailScreen en Android.
 */
export default function DetalleEventoPage() {
  const id = Number(useParams().id);
  const evento = useQuery({ queryKey: claves.evento(id), queryFn: ({ signal }) => eventosApi.detalle(id, signal) });
  const misBoletos = useQuery({ queryKey: claves.misBoletos, queryFn: ({ signal }) => boletajeApi.misBoletos(signal) });

  if (evento.isPending) return <IndicadorCarga texto="Cargando el evento…" />;
  if (evento.isError)
    return (
      <>
        <BarraSuperior titulo="" volver />
        <EstadoVacio
          icono={<MdEventBusy size={56} />}
          titulo={esCodigo(evento.error, 'NO_ENCONTRADO') ? 'Este evento no existe' : 'No se pudo cargar el evento'}
          texto={mensajeDeError(evento.error)}
          textoAccion="Reintentar"
          onAccion={() => evento.refetch()}
        />
      </>
    );

  const propios = (misBoletos.data ?? []).filter((b) => b.eventoId === id && b.estado !== 'CANCELADO').length;
  return <Detalle evento={evento.data} boletosPropios={propios} />;
}

function Detalle({ evento, boletosPropios }: { evento: Evento; boletosPropios: number }) {
  const navegar = useNavigate();
  const tipos = evento.tiposBoleto ?? [];
  const [tipoId, setTipoId] = useState<number | null>(
    () => tipos.find((t) => t.disponibles > 0)?.id ?? tipos[0]?.id ?? null,
  );
  const [cantidadElegida, setCantidad] = useState(1);
  const [confirmando, setConfirmando] = useState(false);

  const tipo = tipos.find((t) => t.id === tipoId) ?? tipos[0] ?? null;
  const cancelado = evento.estado === 'CANCELADO';
  const realizado = evento.estado === 'REALIZADO';
  const iniciado = !cancelado && !realizado && yaPaso(evento.fechaHoraInicio);
  const yaConfirmoGratis = !evento.esDePago && boletosPropios > 0;
  const maximo = evento.esDePago ? Math.min(tipo?.disponibles ?? 0, MAXIMO_POR_ORDEN) : evento.disponibles > 0 ? 1 : 0;
  const cantidad = Math.min(Math.max(1, cantidadElegida), Math.max(1, maximo));
  const puedeActuar =
    !yaConfirmoGratis && !cancelado && !realizado && !iniciado && evento.estado === 'PUBLICADO' && maximo > 0;
  const precioUnitario = evento.esDePago ? (tipo?.precio ?? evento.precioDesde) : '0';
  const total = multiplicar(precioUnitario, cantidad);

  const textoBoton = cancelado
    ? 'Evento cancelado'
    : realizado
      ? 'Evento finalizado'
      : iniciado
        ? 'El evento ya comenzó'
        : yaConfirmoGratis
          ? 'Ya confirmaste tu lugar'
          : maximo <= 0
            ? 'Aforo agotado'
            : evento.requiereAsiento
              ? cantidad === 1
                ? 'Elegir asiento'
                : `Elegir ${cantidad} asientos`
              : evento.esDePago
                ? cantidad === 1
                  ? 'Comprar boleto'
                  : `Comprar ${cantidad} boletos`
                : 'Confirmar asistencia';

  const resumen =
    cancelado || realizado || yaConfirmoGratis || iniciado
      ? null
      : maximo <= 0
        ? 'No quedan lugares'
        : evento.esDePago
          ? `${importeMxn(total)} · ${textoBoletos(cantidad)} · total final`
          : 'Gratis · sin cobro';

  function actuar() {
    if (evento.requiereAsiento) {
      navegar(`/eventos/${evento.id}/asientos?tipo=${tipo?.id ?? ''}&cantidad=${cantidad}`);
    } else if (evento.esDePago) {
      navegar(rutaPago({ eventoId: evento.id, tipoId: tipo?.id ?? null, cantidad, asientosIds: [] }));
    } else {
      setConfirmando(true);
    }
  }

  const textoAyuda = !puedeActuar
    ? null
    : evento.requiereAsiento
      ? `En el siguiente paso elegirás ${cantidad === 1 ? 'tu asiento' : `los ${cantidad} asientos`} en el plano del recinto.`
      : evento.esDePago
        ? 'Antes de pagar verás el desglose completo. El precio mostrado es el total final.'
        : 'Confirmar asistencia aparta un lugar a tu nombre y genera tu boleto QR. No hay ningún cobro.';

  return (
    <>
      <BarraSuperior titulo="" volver />
      {confirmando && <DialogoConfirmarAsistencia evento={evento} onCerrar={() => setConfirmando(false)} />}
      <div className={estilos.detalle}>
        <div className={estilos.columna}>
          <Portada
            nombre={evento.nombre}
            categoria={evento.categoria}
            fecha={evento.fechaHoraInicio}
            mostrarFecha={false}
            ancha
          />
          <div>
            <h1 className={estilos.nombreEvento}>{evento.nombre}</h1>
            <div className={estilos.etiquetas}>
              {evento.categoria && <Etiqueta texto={evento.categoria} />}
              {!evento.esDePago && <Etiqueta texto="Gratis" tono="destacado" />}
              {evento.requiereAsiento && <Etiqueta texto="Asientos numerados" tono="marca" icono={<MdEventSeat />} />}
              {evento.disponibles <= 0 && !cancelado && <EtiquetaAgotado />}
            </div>
          </div>

          <AvisoDeEstado evento={evento} boletosPropios={boletosPropios} iniciado={iniciado} />

          <Tarjeta>
            <div className={estilos.datos}>
              <FilaDato
                icono={<MdCalendarMonth />}
                etiqueta="Fecha"
                valor={intervalo(evento.fechaHoraInicio, evento.fechaHoraFin)}
                apoyo="Hora local del evento (Orizaba)"
              />
              <FilaDato
                icono={<MdLocationOn />}
                etiqueta="Lugar"
                valor={evento.lugar}
                apoyo={[evento.direccion, evento.ciudad].filter(Boolean).join(', ') || undefined}
              />
              <FilaDato
                icono={<MdGroups />}
                etiqueta="Cupo"
                valor={
                  evento.disponibles <= 0 ? 'Sin lugares disponibles' : `${lugares(evento.disponibles)} disponibles`
                }
                apoyo={`Aforo de ${evento.aforo.toLocaleString('es-MX')} personas`}
              />
            </div>
          </Tarjeta>

          {evento.latitud !== null && evento.longitud !== null && (
            <section aria-label="Ubicación en el mapa">
              <div className={estilos.mapa}>
                <Suspense fallback={<IndicadorCarga texto="Cargando el mapa…" />}>
                  <MiniMapa lat={evento.latitud} lng={evento.longitud} nombre={evento.lugar} />
                </Suspense>
              </div>
              <div className={estilos.mapaPie}>
                <EnlaceSecundario
                  to={urlComoLlegar(evento.latitud, evento.longitud)}
                  target="_blank"
                  rel="noopener noreferrer"
                  icono={<MdDirections />}
                >
                  Cómo llegar
                </EnlaceSecundario>
                <span className={estilos.coordenadas}>
                  Lat {evento.latitud.toFixed(5)}
                  <br />
                  Lon {evento.longitud.toFixed(5)}
                </span>
              </div>
              <p className={estilos.atribucion}>Mapa © colaboradores de OpenStreetMap (ODbL).</p>
            </section>
          )}

          {evento.descripcion && (
            <section>
              <h2 className={estilos.subtitulo}>Acerca del evento</h2>
              <p className={estilos.descripcion}>{evento.descripcion}</p>
            </section>
          )}
        </div>

        <aside className={[estilos.columna, estilos.compra].join(' ')} aria-label="Boletos">
          {evento.esDePago && tipos.length > 0 && !cancelado && !realizado && (
            <>
              <section>
                <h2 className={estilos.subtitulo} id="titulo-tipos">
                  Elige tu boleto
                </h2>
                <div className={estilos.tipos} role="radiogroup" aria-labelledby="titulo-tipos">
                  {tipos.map((t) => (
                    <TarjetaTipo
                      key={t.id}
                      tipo={t}
                      seleccionado={tipo?.id === t.id}
                      onElegir={() => setTipoId(t.id)}
                    />
                  ))}
                </div>
                {tipos.length > 1 && <p className={estilos.pista}>Hay {tipos.length} tipos de boleto.</p>}
              </section>
              <Tarjeta>
                <SelectorCantidad cantidad={cantidad} maximo={maximo} onCambio={setCantidad} habilitado={puedeActuar} />
                {cantidad > 1 && (
                  <p className={estilos.pista} style={{ marginTop: 8 }}>
                    {precio(precioUnitario)} × {cantidad} = {importeMxn(total)}. Cada boleto tendrá su propio código QR.
                  </p>
                )}
              </Tarjeta>
            </>
          )}
          {textoAyuda && <p className={estilos.nota}>{textoAyuda}</p>}
          <BarraAccion textoBoton={textoBoton} resumen={resumen} habilitado={puedeActuar} onClick={actuar} />
        </aside>
      </div>
    </>
  );
}

function AvisoDeEstado({
  evento,
  boletosPropios,
  iniciado,
}: {
  evento: Evento;
  boletosPropios: number;
  iniciado: boolean;
}) {
  const navegar = useNavigate();
  const verBoletos = () => navegar('/boletos');
  if (evento.estado === 'CANCELADO')
    return (
      <Aviso
        titulo="Este evento fue cancelado"
        texto={`${evento.motivoCancelacion ? `Motivo: ${evento.motivoCancelacion}. ` : ''}Si tenías boletos, quedaron cancelados y, en eventos de pago, el reembolso se gestiona con la pasarela.`}
        tono="error"
      />
    );
  if (evento.estado === 'REALIZADO')
    return <Aviso titulo="Este evento ya se realizó" texto="Ya no admite confirmaciones ni compras." />;
  if (evento.estado === 'BORRADOR')
    return <Aviso titulo="Borrador" texto="Este evento aún no está publicado: solo tú puedes verlo." tono="aviso" />;
  if (iniciado) return <Aviso titulo="El evento ya comenzó" texto="Ya no admite confirmaciones ni compras." />;
  if (!evento.esDePago && boletosPropios > 0)
    return (
      <Aviso
        titulo="Ya confirmaste tu asistencia"
        texto="En eventos gratuitos se aparta un lugar por persona. Tu boleto está en Mis boletos."
        tono="exito"
        textoAccion="Ver mis boletos"
        onAccion={verBoletos}
      />
    );
  if (boletosPropios > 0)
    return (
      <Aviso
        texto={`Ya tienes ${textoBoletos(boletosPropios)} para este evento. Puedes comprar más si hay cupo.`}
        textoAccion="Ver mis boletos"
        onAccion={verBoletos}
      />
    );
  return null;
}

function TarjetaTipo({
  tipo,
  seleccionado,
  onElegir,
}: {
  tipo: TipoBoleto;
  seleccionado: boolean;
  onElegir: () => void;
}) {
  const agotado = tipo.disponibles <= 0;
  return (
    <label
      className={[estilos.tipo, seleccionado ? estilos.tipoSeleccionado : '', agotado ? estilos.tipoAgotado : ''].join(
        ' ',
      )}
    >
      <span className={estilos.tipoNombre}>
        <input type="radio" name="tipo-boleto" checked={seleccionado} disabled={agotado} onChange={onElegir} />
        {tipo.nombre}
      </span>
      <span className={estilos.tipoPrecio}>{precio(tipo.precio)}</span>
      <span className={estilos.tipoDisponibles}>{agotado ? 'Agotado' : `${tipo.disponibles} disponibles`}</span>
    </label>
  );
}

/** Confirmación explícita de asistencia a un evento gratuito (RF-10). Una sola operación con Idempotency-Key. */
function DialogoConfirmarAsistencia({ evento, onCerrar }: { evento: Evento; onCerrar: () => void }) {
  const navegar = useNavigate();
  const consultas = useQueryClient();
  const clave = useRef(nuevaClave());
  const confirmacion = useMutation({
    mutationFn: () =>
      boletajeApi.crearOrden(
        { eventoId: evento.id, tipoBoletoId: null, cantidad: 1, asientosIds: [], metodo: 'GRATIS', tokenPago: null },
        clave.current,
      ),
    onSuccess: (orden) => {
      consultas.invalidateQueries({ queryKey: claves.misBoletos });
      consultas.invalidateQueries({ queryKey: claves.evento(evento.id) });
      consultas.invalidateQueries({ queryKey: ['eventos'] });
      const primero = orden.boletos[0];
      navegar(primero ? `/boletos/${primero.id}` : `/ordenes/${orden.ordenId}`, { replace: true });
    },
    onError: (e) => {
      // Tras un rechazo definitivo se usa una clave nueva para el siguiente intento.
      if (!esCodigo(e, 'SIN_CONEXION')) clave.current = nuevaClave();
      if (esCodigo(e, 'AFORO_AGOTADO', 'CONFIRMACION_DUPLICADA'))
        consultas.invalidateQueries({ queryKey: claves.evento(evento.id) });
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
            {procesando ? 'Confirmando…' : 'Confirmar asistencia'}
          </BotonTexto>
        </>
      }
    >
      <strong style={{ font: 'var(--title-medium)', color: 'var(--on-surface)' }}>{evento.nombre}</strong>
      <FilaDato icono={<MdCalendarMonth />} valor={corto(evento.fechaHoraInicio)} />
      <FilaDato icono={<MdLocationOn />} valor={evento.lugar} />
      <FilaDato icono={<MdGroups />} valor={`${lugares(evento.disponibles)} disponibles ahora`} />
      <p>
        Se apartará 1 lugar a tu nombre y recibirás un boleto QR. Este evento es gratuito: no se realiza ningún cobro.
      </p>
      {confirmacion.isError && <Aviso texto={mensajeDeError(confirmacion.error)} tono="error" anunciar />}
    </Dialogo>
  );
}
