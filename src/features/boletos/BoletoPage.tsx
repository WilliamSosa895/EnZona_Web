import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  MdArrowBack,
  MdArrowForward,
  MdCalendarMonth,
  MdConfirmationNumber,
  MdEventSeat,
  MdLightMode,
  MdLocationOn,
  MdMailOutline,
} from 'react-icons/md';
import { boletajeApi } from '@/api/boletaje';
import type { Boleto } from '@/api/tipos';
import { claves } from '@/app/consultas';
import { useSesion } from '@/auth/useSesion';
import { corto } from '@/lib/fechas';
import { esCodigo, mensajeDeError } from '@/lib/errores';
import {
  Aviso,
  BarraSuperior,
  BotonIcono,
  BotonSecundario,
  EstadoVacio,
  EtiquetaEstadoBoleto,
  IndicadorCarga,
} from '@/ui';
import type { Tono } from '@/ui';
import { CodigoQr } from './CodigoQr';
import { hermanosDe, partesAsiento } from './agrupar';
import { useMantenerPantalla } from './useMantenerPantalla';
import estilos from './Boletos.module.css';

/**
 * Boleto electrónico con su código QR (RF-12): un talón con muescas y línea de corte. Arriba los datos del
 * evento; abajo el QR sobre blanco puro y el código de referencia. No muestra datos personales: el boleto
 * identifica al evento y al asiento, no a la persona.
 */
export default function BoletoPage() {
  const id = Number(useParams().id);
  const boleto = useQuery({
    queryKey: claves.boleto(id),
    queryFn: ({ signal }) => boletajeApi.boleto(id, signal),
    // Si el validador lo marca como usado, la pantalla se actualiza sola.
    refetchInterval: (q) => (q.state.data?.estado === 'VALIDO' ? 15_000 : false),
  });
  const todos = useQuery({ queryKey: claves.misBoletos, queryFn: ({ signal }) => boletajeApi.misBoletos(signal) });

  if (boleto.isPending) return <IndicadorCarga texto="Cargando tu boleto…" />;
  if (boleto.isError)
    return (
      <>
        <BarraSuperior titulo="Tu boleto" volver />
        <EstadoVacio
          icono={<MdConfirmationNumber size={56} />}
          titulo={esCodigo(boleto.error, 'NO_ENCONTRADO') ? 'Este boleto no existe' : 'No se pudo cargar el boleto'}
          texto={mensajeDeError(boleto.error)}
          textoAccion="Reintentar"
          onAccion={() => void boleto.refetch()}
        />
      </>
    );

  return <DetalleBoleto boleto={boleto.data} hermanos={todos.data ? hermanosDe(boleto.data, todos.data) : []} />;
}

function DetalleBoleto({ boleto, hermanos }: { boleto: Boleto; hermanos: Boleto[] }) {
  const navegar = useNavigate();
  const { usuario } = useSesion();
  const [correoAbierto, setCorreoAbierto] = useState(false);
  const vigente = boleto.estado === 'VALIDO';
  const pantallaEncendida = useMantenerPantalla(vigente);
  const posicion = hermanos.findIndex((b) => b.id === boleto.id) + 1;
  const total = hermanos.length;

  // RF-12: en producción la API envía el boleto por correo al emitirlo; aquí se abre la app de correo del equipo.
  const cuerpoCorreo = [
    `Evento: ${boleto.eventoNombre}`,
    `Lugar: ${boleto.lugar}`,
    `Fecha: ${corto(boleto.fechaHoraInicio)}`,
    `Boleto: ${boleto.tipoNombre ?? 'Entrada general'}`,
    boleto.asientoEtiqueta ? `Asiento: ${boleto.asientoEtiqueta}` : null,
    `Código: ${boleto.codigo}`,
    '',
    `Contenido del QR: ${boleto.contenidoQr}`,
    'Presenta este código en el acceso. Es de un solo uso.',
  ]
    .filter((linea) => linea !== null)
    .join('\n');
  const enlaceCorreo = `mailto:${encodeURIComponent(usuario?.correo ?? '')}?subject=${encodeURIComponent(
    `Tu boleto EnZona · ${boleto.eventoNombre}`,
  )}&body=${encodeURIComponent(cuerpoCorreo)}`;

  return (
    <>
      <BarraSuperior titulo="Tu boleto" volver />
      <div className={estilos.paginaBoleto}>
        {total > 1 && (
          <nav className={estilos.navegacion} aria-label="Boletos de la misma orden">
            <BotonIcono
              etiqueta="Boleto anterior"
              tonal
              disabled={posicion <= 1}
              onClick={() => navegar(`/boletos/${hermanos[posicion - 2].id}`, { replace: true })}
            >
              <MdArrowBack />
            </BotonIcono>
            <span className={estilos.navegacionTexto} aria-live="polite">
              Boleto {posicion} de {total}
            </span>
            <BotonIcono
              etiqueta="Boleto siguiente"
              tonal
              disabled={posicion >= total}
              onClick={() => navegar(`/boletos/${hermanos[posicion].id}`, { replace: true })}
            >
              <MdArrowForward />
            </BotonIcono>
          </nav>
        )}

        <article className={estilos.talon} aria-label={`Boleto de ${boleto.eventoNombre}`}>
          <div className={estilos.talonDatos}>
            <div className={estilos.talonCabecera}>
              <MdConfirmationNumber className={estilos.talonIcono} aria-hidden="true" />
              <span>{total > 1 ? `Boleto ${posicion} de ${total}` : 'Boleto EnZona'}</span>
              <EtiquetaEstadoBoleto estado={boleto.estado} />
            </div>
            <h2 className={estilos.talonNombre}>{boleto.eventoNombre}</h2>
            <dl className={estilos.talonLista}>
              <DatoTalon icono={<MdCalendarMonth />} etiqueta="Fecha" valor={corto(boleto.fechaHoraInicio)} />
              <DatoTalon icono={<MdLocationOn />} etiqueta="Lugar" valor={boleto.lugar} />
              <div className={estilos.talonPar}>
                <DatoTalon
                  icono={<MdConfirmationNumber />}
                  etiqueta="Tipo"
                  valor={boleto.tipoNombre ?? 'Entrada general'}
                />
                {boleto.asientoEtiqueta && (
                  <DatoTalon icono={<MdEventSeat />} etiqueta="Asiento" valor={textoAsiento(boleto.asientoEtiqueta)} />
                )}
              </div>
            </dl>
          </div>
          <div className={estilos.corte} aria-hidden="true" />
          <div className={estilos.talonQr}>
            <CodigoQr
              contenido={boleto.contenidoQr}
              descripcion={`Código QR del boleto ${boleto.codigo}`}
              atenuado={!vigente}
              className={estilos.qr}
            />
            <p className={estilos.referencia}>{boleto.codigo}</p>
            <p className={estilos.referenciaEtiqueta}>Código de referencia</p>
          </div>
        </article>

        <TextoEstado boleto={boleto} />

        <BotonSecundario
          icono={<MdMailOutline />}
          onClick={() => {
            window.location.href = enlaceCorreo;
            setCorreoAbierto(true);
          }}
        >
          Enviar con mi app de correo
        </BotonSecundario>
        {correoAbierto && (
          <Aviso texto="Se abrió tu aplicación de correo con los datos del boleto. Revisa el mensaje antes de enviarlo." />
        )}

        {vigente && (
          <p className={estilos.nota}>
            <MdLightMode aria-hidden="true" />
            {pantallaEncendida
              ? 'La pantalla se mantiene encendida mientras muestras el boleto'
              : 'Sube el brillo de tu pantalla al mostrar el boleto en el acceso'}
          </p>
        )}
      </div>
    </>
  );
}

function DatoTalon({ icono, etiqueta, valor }: { icono: ReactNode; etiqueta: string; valor: string }) {
  return (
    <div className={estilos.dato}>
      <span className={estilos.datoIcono} aria-hidden="true">
        {icono}
      </span>
      <div>
        <dt>{etiqueta}</dt>
        <dd>{valor}</dd>
      </div>
    </div>
  );
}

function TextoEstado({ boleto }: { boleto: Boleto }) {
  const [texto, tono]: [string, Tono] =
    boleto.estado === 'VALIDO'
      ? ['Boleto válido, de un solo uso. Muestra el QR en el acceso.', 'exito']
      : boleto.estado === 'USADO'
        ? [
            `Este boleto ya se utilizó${boleto.fechaUso ? ` el ${corto(boleto.fechaUso)}` : ''}. No admite un segundo acceso.`,
            'neutro',
          ]
        : boleto.estado === 'CANCELADO'
          ? [
              'Este boleto fue cancelado. Si el evento se canceló y pagaste, recibirás el 100 % de tu compra por el mismo medio de pago.',
              'error',
            ]
          : ['La vigencia de este boleto terminó.', 'neutro'];
  return <Aviso texto={texto} tono={tono} />;
}

/** "Platea\nFila B · 8" como en el talón de Android. */
function textoAsiento(etiqueta: string): string {
  const { seccion, lugar } = partesAsiento(etiqueta);
  return seccion ? `${seccion}\n${lugar}` : lugar;
}
