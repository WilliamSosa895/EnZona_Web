import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MdCalendarMonth,
  MdCheckCircle,
  MdErrorOutline,
  MdHourglassTop,
  MdLocationOn,
  MdQrCode2,
  MdReceiptLong,
} from 'react-icons/md';
import { boletajeApi } from '@/api/boletaje';
import { eventosApi } from '@/api/eventos';
import type { Boleto, Orden } from '@/api/tipos';
import { claves } from '@/app/consultas';
import { corto, hora } from '@/lib/fechas';
import { aNumero, importeMxn } from '@/lib/formato';
import { esCodigo, mensajeDeError } from '@/lib/errores';
import {
  Aviso,
  BarraSuperior,
  Boton,
  BotonSecundario,
  EstadoVacio,
  EtiquetaEstadoBoleto,
  FilaDato,
  IndicadorCarga,
  Tarjeta,
} from '@/ui';
import { descripcionBoleto } from '@/features/boletos/agrupar';
import estilos from './Compra.module.css';

/** Cada cuánto se consulta una orden pendiente mientras la pasarela confirma. */
const CONSULTA_PENDIENTE_MS = 3_000;

/**
 * Resultado de una compra (OrderSummaryScreen en Android): resumen de la orden y acceso a cada QR
 * ("Boleto k de N"). Si el pago quedó pendiente, la pantalla se actualiza sola hasta que la pasarela responda.
 */
export default function OrdenPage() {
  const id = Number(useParams().id);
  const consultas = useQueryClient();
  const orden = useQuery({
    queryKey: claves.orden(id),
    queryFn: ({ signal }) => boletajeApi.orden(id, signal),
    refetchInterval: (q) => (q.state.data?.estadoOrden === 'PENDIENTE' ? CONSULTA_PENDIENTE_MS : false),
  });
  const estado = orden.data?.estadoOrden;

  // Al resolverse un pendiente, Mis boletos y la disponibilidad cambian.
  useEffect(() => {
    if (estado && estado !== 'PENDIENTE') {
      void consultas.invalidateQueries({ queryKey: claves.misBoletos });
      void consultas.invalidateQueries({ queryKey: ['eventos'] });
    }
  }, [estado, consultas]);

  if (orden.isPending) return <IndicadorCarga texto="Cargando tu orden…" />;
  if (orden.isError)
    return (
      <>
        <BarraSuperior titulo="Tu orden" volver />
        <EstadoVacio
          icono={<MdReceiptLong size={56} />}
          titulo={esCodigo(orden.error, 'NO_ENCONTRADO') ? 'Esta orden no existe' : 'No se pudo cargar la orden'}
          texto={mensajeDeError(orden.error)}
          textoAccion="Reintentar"
          onAccion={() => void orden.refetch()}
        />
      </>
    );

  const o = orden.data;
  if (o.estadoOrden === 'PAGADA') return <Confirmada orden={o} />;
  if (o.estadoOrden === 'PENDIENTE')
    return <Pendiente orden={o} actualizando={orden.isFetching} onActualizar={() => void orden.refetch()} />;
  return <NoCompletada orden={o} />;
}

function Acciones() {
  const navegar = useNavigate();
  return (
    <div className={estilos.accionesOrden}>
      <Boton onClick={() => navegar('/boletos')}>Ver mis boletos</Boton>
      <BotonSecundario onClick={() => navegar('/')}>Volver a Inicio</BotonSecundario>
    </div>
  );
}

function Confirmada({ orden }: { orden: Orden }) {
  const boletos = [...orden.boletos].sort((a, b) => a.id - b.id);
  const n = boletos.length;
  const primero: Boleto | undefined = boletos[0];
  const pagada = aNumero(orden.total) > 0;

  return (
    <>
      <BarraSuperior titulo="Compra confirmada" />
      <div className={estilos.paginaOrden}>
        <div className={estilos.encabezadoOrden}>
          <MdCheckCircle className={estilos.iconoExito} aria-hidden="true" />
          <h1 className={estilos.tituloResultado}>
            {n === 1 ? 'Tu boleto está listo' : `Tus ${n} boletos están listos`}
          </h1>
        </div>
        {primero && (
          <Tarjeta>
            <h2 className={estilos.tituloOrden}>{primero.eventoNombre}</h2>
            <div className={estilos.datos}>
              <FilaDato icono={<MdCalendarMonth />} etiqueta="Fecha" valor={corto(primero.fechaHoraInicio)} />
              <FilaDato icono={<MdLocationOn />} etiqueta="Lugar" valor={primero.lugar} />
            </div>
            <p className={estilos.totalOrden}>
              {pagada
                ? `Total pagado: ${importeMxn(orden.total)} · orden #${orden.ordenId}`
                : `Sin cobro · orden #${orden.ordenId}`}
            </p>
          </Tarjeta>
        )}
        {n > 1 && (
          <Aviso texto="Cada boleto tiene su propio código QR y se valida por separado en el acceso. Muéstralos desde tu cuenta a tus acompañantes." />
        )}
        <h2 className={estilos.subtitulo}>
          {n === 1 ? (
            'Tu boleto'
          ) : (
            <>
              Tus boletos<span className={estilos.soloMovil}> · desliza para verlos</span>
            </>
          )}
        </h2>
        <ul className={estilos.carrusel} aria-label="Boletos de la orden">
          {boletos.map((b, i) => (
            <li key={b.id}>
              <Link to={`/boletos/${b.id}`} className={estilos.tarjetaBoleto}>
                <span className={estilos.tarjetaBoletoCabecera}>
                  <MdQrCode2 aria-hidden="true" />
                  <strong>
                    Boleto {i + 1} de {n}
                  </strong>
                </span>
                <span className={estilos.tarjetaBoletoDetalle}>{descripcionBoleto(b)}</span>
                <span className={estilos.codigo}>{b.codigo}</span>
                <EtiquetaEstadoBoleto estado={b.estado} />
              </Link>
            </li>
          ))}
        </ul>
        <Acciones />
      </div>
    </>
  );
}

function Pendiente({
  orden,
  actualizando,
  onActualizar,
}: {
  orden: Orden;
  actualizando: boolean;
  onActualizar: () => void;
}) {
  const navegar = useNavigate();
  return (
    <>
      <BarraSuperior titulo="Pago en proceso" />
      <div className={estilos.paginaOrden}>
        <div className={estilos.encabezadoOrden}>
          <MdHourglassTop className={estilos.iconoAviso} aria-hidden="true" />
          <h1 className={estilos.tituloResultado}>Estamos confirmando tu pago</h1>
        </div>
        <Aviso
          tono="aviso"
          anunciar
          texto={
            <>
              La pasarela aún no confirma el cobro de la orden #{orden.ordenId} por {importeMxn(orden.total)}.
              {orden.expiraEn && <> Tus lugares quedan apartados hasta las {hora(orden.expiraEn)}.</>} Esta pantalla se
              actualiza sola; también puedes salir y revisar Mis boletos más tarde.
            </>
          }
        />
        <div className={estilos.accionesOrden}>
          <Boton onClick={onActualizar} cargando={actualizando}>
            Actualizar ahora
          </Boton>
          <BotonSecundario onClick={() => navegar('/boletos')}>Ir a Mis boletos</BotonSecundario>
        </div>
      </div>
    </>
  );
}

function NoCompletada({ orden }: { orden: Orden }) {
  const navegar = useNavigate();
  const evento = useQuery({
    queryKey: claves.evento(orden.eventoId),
    queryFn: ({ signal }) => eventosApi.detalle(orden.eventoId, signal),
  });
  const reembolsada = orden.estadoOrden === 'REEMBOLSADA';
  return (
    <>
      <BarraSuperior titulo="Tu orden" volver />
      <div className={estilos.paginaOrden}>
        <div className={estilos.encabezadoOrden}>
          <MdErrorOutline className={estilos.iconoError} aria-hidden="true" />
          <h1 className={estilos.tituloResultado}>{reembolsada ? 'Orden reembolsada' : 'No se completó la compra'}</h1>
        </div>
        {evento.data && <p className={estilos.apoyo}>{evento.data.nombre}</p>}
        <Aviso
          tono={reembolsada ? 'neutro' : 'error'}
          texto={
            reembolsada
              ? `Se reembolsaron ${importeMxn(orden.total)} por el mismo medio de pago. Orden #${orden.ordenId}.`
              : (orden.mensaje ?? 'La pasarela no confirmó el pago. No se realizó ningún cargo.')
          }
        />
        <div className={estilos.accionesOrden}>
          <Boton onClick={() => navegar(`/eventos/${orden.eventoId}`)}>Volver al evento</Boton>
          <BotonSecundario onClick={() => navegar('/')}>Volver a Inicio</BotonSecundario>
        </div>
      </div>
    </>
  );
}
