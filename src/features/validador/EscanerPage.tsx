import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MdCached,
  MdCameraAlt,
  MdCancel,
  MdCheckCircle,
  MdCloud,
  MdCloudOff,
  MdExpandLess,
  MdExpandMore,
  MdFlashlightOff,
  MdFlashlightOn,
  MdKeyboard,
} from 'react-icons/md';
import { administracionApi } from '@/api/administracion';
import { ApiError } from '@/api/http';
import { eventosApi } from '@/api/eventos';
import { validacionApi } from '@/api/validacion';
import type { Evento, SincronizacionRespuesta } from '@/api/tipos';
import { tieneRol } from '@/auth/roles';
import { useSesion } from '@/auth/useSesion';
import { corto, hora } from '@/lib/fechas';
import { esCodigo, mensajeDeError } from '@/lib/errores';
import { leerPreferencias } from '@/lib/preferencias';
import { useMantenerPantalla } from '@/features/boletos/useMantenerPantalla';
import { Aviso, Boton, BotonTexto, Campo, Dialogo, IndicadorCarga, Pagina, Selector } from '@/ui';
import { CamaraQr } from './CamaraQr';
import {
  admitidosSinConexion,
  codigoDe,
  guardarBitacora,
  guardarPendientes,
  leerBitacora,
  leerPendientes,
  manifiestos,
  registrosSincronizados,
  resultadoEnLinea,
  resumirSincronizacion,
  validarSinConexion,
  type Pendiente,
  type Registro,
  type Resultado,
} from './validacion';
import estilos from './Validador.module.css';

const CLAVE_EVENTO = 'enzona.validador.evento';
/** Un acceso permitido se cierra solo para no frenar la fila; un rechazo espera a que lo vean. */
const SEGUNDOS_RESULTADO_PERMITIDO = 3;

function leerEventoElegido(): number | null {
  try {
    const valor = Number(sessionStorage.getItem(CLAVE_EVENTO));
    return Number.isInteger(valor) && valor > 0 ? valor : null;
  } catch {
    return null;
  }
}

function guardarEventoElegido(id: number) {
  try {
    sessionStorage.setItem(CLAVE_EVENTO, String(id));
  } catch {
    /* sin almacenamiento: dura mientras la página esté abierta */
  }
}

const suscribirRed = (alCambiar: () => void) => {
  window.addEventListener('online', alCambiar);
  window.addEventListener('offline', alCambiar);
  return () => {
    window.removeEventListener('online', alCambiar);
    window.removeEventListener('offline', alCambiar);
  };
};

/** ¿El navegador tiene red? Solo informa: la API es la que decide si una validación en línea es posible. */
function useEnLinea() {
  return useSyncExternalStore(
    suscribirRed,
    () => navigator.onLine,
    () => true,
  );
}

/**
 * Pantalla del personal de acceso (RF-15, ScannerScreen en Android), pensada para la puerta de un evento: la
 * cámara ocupa casi toda la pantalla, el resultado se ve de lejos (toda la zona en verde o rojo, con vibración) y
 * lo demás queda en una fila de controles cortos: evento, conexión, envíos pendientes y contadores.
 *
 * Con conexión, la API verifica la firma HMAC (RNF-02), marca el boleto como usado (un solo uso) y registra la
 * validación. Sin conexión (RNF-08, CP-14) se descarga antes el manifiesto del evento, cada escaneo se compara con
 * él y queda pendiente; «Enviar» los manda a la API cuando vuelve la red.
 */
export default function EscanerPage() {
  const { usuario } = useSesion();
  const roles = usuario?.roles ?? [];
  const ciudad = leerPreferencias().ciudad;

  // No existe un endpoint con "mis eventos asignados": se ofrecen los eventos vigentes y la API responde 403
  // si la cuenta no fue designada para el elegido (docs/COHERENCIA_APP_ANDROID.md).
  const publicos = useQuery({
    queryKey: ['validador', 'eventos', ciudad],
    queryFn: ({ signal }) => eventosApi.listar({ ciudad, size: 50 }, signal),
  });
  const propios = useQuery({
    queryKey: ['validador', 'propios'],
    queryFn: ({ signal }) => eventosApi.delOrganizador(signal),
    enabled: tieneRol(roles, 'ORGANIZADOR'),
  });
  const deAdmin = useQuery({
    queryKey: ['validador', 'admin'],
    queryFn: ({ signal }) => administracionApi.eventos({ estado: 'PUBLICADO', size: 100 }, signal),
    enabled: tieneRol(roles, 'ADMIN'),
  });

  const eventos = useMemo(() => {
    const todos = new Map<number, Evento>();
    for (const e of [
      ...(publicos.data?.elementos ?? []),
      ...(propios.data ?? []).filter((x) => x.estado === 'PUBLICADO'),
      ...(deAdmin.data?.elementos ?? []),
    ])
      todos.set(e.id, e);
    return [...todos.values()].sort((a, b) => a.fechaHoraInicio.localeCompare(b.fechaHoraInicio));
  }, [publicos.data, propios.data, deAdmin.data]);

  const [eventoId, setEventoId] = useState<number | null>(leerEventoElegido);
  const elegido = eventos.find((e) => e.id === eventoId) ?? eventos[0] ?? null;

  return (
    <Pagina angosta>
      <h1 className="sr-only">Validar acceso</h1>
      <div className={estilos.pila}>
        {publicos.isPending ? (
          <IndicadorCarga texto="Cargando tus eventos…" />
        ) : publicos.isError ? (
          <Aviso
            tono="error"
            texto={mensajeDeError(publicos.error)}
            textoAccion="Reintentar"
            onAccion={() => void publicos.refetch()}
          />
        ) : eventos.length === 0 ? (
          <>
            <h2 className={estilos.titulo}>Validar acceso</h2>
            <p className={estilos.apoyo}>
              Todavía no tienes eventos asignados. El organizador debe designarte como personal de acceso de su evento.
            </p>
          </>
        ) : (
          <Selector
            etiqueta="Evento"
            opciones={eventos.map((e) => ({ valor: e.id, texto: `${e.nombre} · ${corto(e.fechaHoraInicio)}` }))}
            valor={elegido?.id ?? null}
            onCambio={(id) => {
              setEventoId(id);
              guardarEventoElegido(id);
            }}
          />
        )}
        {elegido && usuario && <Puerta key={elegido.id} evento={elegido} usuarioId={usuario.id} />}
      </div>
    </Pagina>
  );
}

function Puerta({ evento, usuarioId }: { evento: Evento; usuarioId: number }) {
  useMantenerPantalla(true);
  const enLinea = useEnLinea();
  const [sinConexion, setSinConexion] = useState(false);
  const [pendientes, setPendientes] = useState<Pendiente[]>(() => leerPendientes(usuarioId));
  const [bitacora, setBitacora] = useState<Registro[]>(() => leerBitacora(usuarioId));
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [enCurso, setEnCurso] = useState(false);
  const [avisoModo, setAvisoModo] = useState<string | null>(null);
  const [errorModo, setErrorModo] = useState<string | null>(null);
  const [linterna, setLinterna] = useState(false);
  const [conLinterna, setConLinterna] = useState(false);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const [intentoCamara, setIntentoCamara] = useState(0);
  const [escribiendo, setEscribiendo] = useState(false);
  const [verBitacora, setVerBitacora] = useState(false);

  useEffect(() => guardarPendientes(usuarioId, pendientes), [usuarioId, pendientes]);
  useEffect(() => guardarBitacora(usuarioId, bitacora), [usuarioId, bitacora]);

  // Un acceso permitido se cierra solo a los pocos segundos.
  useEffect(() => {
    if (!resultado?.permitido) return;
    const temporizador = window.setTimeout(() => setResultado(null), SEGUNDOS_RESULTADO_PERMITIDO * 1000);
    return () => window.clearTimeout(temporizador);
  }, [resultado]);

  function mostrar(r: Resultado) {
    setResultado(r);
    // Se siente aunque no se mire la pantalla: vibración distinta para permitir o rechazar.
    navigator.vibrate?.(r.permitido ? 120 : [80, 60, 80, 60, 80]);
  }

  async function validar(contenido: string) {
    const qr = contenido.trim();
    if (!qr || resultado || enCurso) return; // ya hay un resultado en pantalla o una validación en curso
    setErrorModo(null);
    const ahora = new Date().toISOString();

    if (sinConexion) {
      const manifiesto = manifiestos.get(evento.id);
      if (!manifiesto) {
        setErrorModo('Descarga primero el manifiesto del evento (con conexión) para validar sin conexión.');
        return;
      }
      const r = validarSinConexion(qr, manifiesto, admitidosSinConexion(pendientes, evento.id));
      setPendientes((lista) => [
        ...lista,
        { eventoId: evento.id, qr, fechaHora: ahora, permitido: r.permitido, titulo: r.titulo },
      ]);
      mostrar(r);
      return;
    }

    setEnCurso(true);
    try {
      const r = resultadoEnLinea(await validacionApi.validar(evento.id, qr));
      setBitacora((lista) => [
        {
          eventoId: evento.id,
          codigo: r.codigo ?? codigoDe(qr) ?? qr.slice(0, 24),
          permitido: r.permitido,
          titulo: r.titulo,
          fechaHora: ahora,
          sinConexion: false,
          sincronizado: true,
        },
        ...lista,
      ]);
      mostrar(r);
    } catch (e) {
      setErrorModo(
        esCodigo(e, 'ACCESO_DENEGADO')
          ? 'No estás designado para este evento. Pide al organizador que te agregue como personal de acceso o elige otro evento.'
          : `${mensajeDeError(e).replace(/\.$/, '')}.` +
              (e instanceof ApiError && e.status === 0 ? ' Si no hay red en el acceso, activa «Sin conexión».' : ''),
      );
    } finally {
      setEnCurso(false);
    }
  }

  async function cambiarConexion(sinRed: boolean) {
    setErrorModo(null);
    if (!sinRed) {
      setSinConexion(false);
      setAvisoModo(null);
      return;
    }
    // El manifiesto se descarga con conexión, antes de quedarse sin red.
    setEnCurso(true);
    try {
      const manifiesto = await validacionApi.manifiesto(evento.id);
      manifiestos.set(evento.id, manifiesto);
      const vigentes = manifiesto.boletos.filter((b) => b.estado === 'VALIDO').length;
      setSinConexion(true);
      setAvisoModo(
        `Listo: ${vigentes === 1 ? '1 boleto guardado' : `${vigentes} boletos guardados`} en este equipo. Puedes seguir sin internet.`,
      );
    } catch (e) {
      setErrorModo(
        esCodigo(e, 'ACCESO_DENEGADO')
          ? 'No estás designado para este evento: no se puede descargar su lista de boletos.'
          : mensajeDeError(e),
      );
    } finally {
      setEnCurso(false);
    }
  }

  async function enviarPendientes() {
    setErrorModo(null);
    setEnCurso(true);
    const cola = pendientes;
    const respuestas: SincronizacionRespuesta[] = [];
    let restantes = cola;
    try {
      for (const id of [...new Set(cola.map((p) => p.eventoId))]) {
        const delEvento = cola.filter((p) => p.eventoId === id).sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
        const respuesta = await validacionApi.sincronizar(
          id,
          delEvento.map((p) => ({ qr: p.qr, fechaHora: p.fechaHora })),
        );
        respuestas.push(respuesta);
        // Lo sincronizado pasa a «Últimos accesos» con el veredicto del servidor y sale de la cola.
        const registros = registrosSincronizados(delEvento, respuesta).reverse();
        setBitacora((lista) => [...registros, ...lista]);
        restantes = restantes.filter((p) => p.eventoId !== id);
        setPendientes(restantes);
        manifiestos.delete(id);
      }
      const r = resumirSincronizacion(cola.length, respuestas);
      setAvisoModo(
        `Enviadas ${r.enviadas}: ${r.permitidas} entraron y ${r.rechazadas} rechazadas` +
          (r.duplicadas > 0 ? ` (${r.duplicadas} ya habían entrado).` : '.'),
      );
    } catch (e) {
      setErrorModo(mensajeDeError(e));
    } finally {
      setEnCurso(false);
    }
  }

  // «Últimos accesos»: primero lo pendiente de enviar, después lo ya resuelto por el servidor.
  const registros: Registro[] = [
    ...pendientes
      .filter((p) => p.eventoId === evento.id)
      .reverse()
      .map((p) => ({
        eventoId: p.eventoId,
        codigo: codigoDe(p.qr) ?? p.qr.slice(0, 24),
        permitido: p.permitido,
        titulo: p.titulo,
        fechaHora: p.fechaHora,
        sinConexion: true,
        sincronizado: false,
      })),
    ...bitacora.filter((r) => r.eventoId === evento.id),
  ];
  const entraron = registros.filter((r) => r.permitido).length;
  const rechazados = registros.length - entraron;

  return (
    <>
      <div className={estilos.estado}>
        <button
          type="button"
          className={[estilos.chip, sinConexion ? estilos.chipSinConexion : ''].join(' ')}
          aria-pressed={sinConexion}
          disabled={enCurso}
          onClick={() => void cambiarConexion(!sinConexion)}
        >
          {sinConexion ? <MdCloudOff aria-hidden="true" /> : <MdCloud aria-hidden="true" />}
          {sinConexion ? 'Sin conexión' : 'Con internet'}
        </button>
        {pendientes.length > 0 && (
          <button
            type="button"
            className={estilos.chip}
            disabled={sinConexion || enCurso}
            onClick={() => void enviarPendientes()}
          >
            <MdCached aria-hidden="true" className={estilos.iconoEnviar} />
            Enviar {pendientes.length}
          </button>
        )}
        <span className={estilos.contadores}>
          <Contador valor={entraron} etiqueta="entraron" tono="exito" />
          <Contador valor={rechazados} etiqueta="rechazados" tono="error" />
        </span>
      </div>
      {!enLinea && !sinConexion && (
        <p className={estilos.textoError} role="status">
          Este equipo no tiene red. Para seguir validando, activa «Sin conexión» cuando vuelva la señal, o valida en
          línea al recuperarla.
        </p>
      )}
      {avisoModo && (
        <p className={estilos.textoExito} role="status">
          {avisoModo}
        </p>
      )}
      {errorModo && (
        <p className={estilos.textoError} role="alert">
          {errorModo}
        </p>
      )}

      <div className={estilos.zona}>
        {errorCamara ? (
          <SinCamara
            mensaje={errorCamara}
            onReintentar={() => {
              setErrorCamara(null);
              setIntentoCamara((n) => n + 1);
            }}
          />
        ) : (
          <>
            <CamaraQr
              key={intentoCamara}
              activa={!resultado && !enCurso}
              linterna={linterna}
              onCodigo={(qr) => void validar(qr)}
              onError={setErrorCamara}
              onLinternaDisponible={setConLinterna}
            />
            {conLinterna && (
              <button
                type="button"
                className={estilos.linterna}
                aria-pressed={linterna}
                aria-label={linterna ? 'Apagar linterna' : 'Encender linterna'}
                onClick={() => setLinterna((l) => !l)}
              >
                {linterna ? <MdFlashlightOn aria-hidden="true" /> : <MdFlashlightOff aria-hidden="true" />}
              </button>
            )}
            <span className={estilos.indicacion} aria-hidden="true">
              Apunta al código del boleto
            </span>
          </>
        )}
        {enCurso && !resultado && (
          <div className={estilos.revisando}>
            <IndicadorCarga texto={sinConexion ? 'Un momento…' : 'Revisando el boleto…'} />
          </div>
        )}
        {resultado && <PanelResultado resultado={resultado} onContinuar={() => setResultado(null)} />}
      </div>

      <div className={estilos.acciones}>
        <BotonTexto
          tono="neutro"
          icono={<MdKeyboard />}
          disabled={!!resultado || enCurso}
          onClick={() => setEscribiendo(true)}
        >
          Escribir código
        </BotonTexto>
        <BotonTexto
          tono="neutro"
          aria-expanded={verBitacora}
          aria-controls="ultimos-accesos"
          onClick={() => setVerBitacora((v) => !v)}
        >
          Últimos accesos
          {verBitacora ? <MdExpandLess aria-hidden="true" /> : <MdExpandMore aria-hidden="true" />}
        </BotonTexto>
      </div>
      {verBitacora && <UltimosAccesos registros={registros.slice(0, 5)} />}

      {escribiendo && (
        <DialogoEscribirCodigo
          onCerrar={() => setEscribiendo(false)}
          onValidar={(codigo) => {
            setEscribiendo(false);
            void validar(codigo);
          }}
        />
      )}
    </>
  );
}

function Contador({ valor, etiqueta, tono }: { valor: number; etiqueta: string; tono: 'exito' | 'error' }) {
  return (
    <span className={estilos.contador}>
      <strong className={tono === 'exito' ? estilos.valorExito : estilos.valorError}>{valor}</strong>
      <span>{etiqueta}</span>
    </span>
  );
}

/**
 * Resultado a toda la zona de la cámara: verde «PUEDE PASAR» o rojo «NO PUEDE PASAR», legible a un metro.
 * Tocar en cualquier parte vuelve a la cámara.
 */
function PanelResultado({ resultado, onContinuar }: { resultado: Resultado; onContinuar: () => void }) {
  const boton = useRef<HTMLButtonElement>(null);
  // El foco pasa a «Siguiente»: con teclado o lector de pantalla se continúa sin buscar el botón.
  useEffect(() => boton.current?.focus(), []);
  const { permitido } = resultado;
  return (
    // El fondo es un atajo táctil; con teclado se usa el botón «Siguiente».
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <section
      className={[estilos.resultado, permitido ? estilos.resultadoOk : estilos.resultadoError].join(' ')}
      role="status"
      aria-live="assertive"
      aria-label={`${permitido ? 'Puede pasar' : 'No puede pasar'}. ${resultado.titulo}`}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('button')) onContinuar();
      }}
    >
      {permitido ? <MdCheckCircle aria-hidden="true" /> : <MdCancel aria-hidden="true" />}
      <p className={estilos.veredicto}>{permitido ? 'PUEDE PASAR' : 'NO PUEDE PASAR'}</p>
      <h2 className={estilos.tituloResultado}>{resultado.titulo}</h2>
      {/* En un acceso permitido el detalle repite el título y el asiento: solo se muestra cuando aporta algo. */}
      {(!permitido || !resultado.asiento) && <p className={estilos.detalle}>{resultado.detalle}</p>}
      {resultado.asiento && (
        <p className={estilos.asiento}>
          <span>Asiento</span>
          <strong>{resultado.asiento}</strong>
        </p>
      )}
      {resultado.codigo && <span className={estilos.codigo}>{resultado.codigo}</span>}
      <button ref={boton} type="button" className={estilos.siguiente} onClick={onContinuar}>
        Siguiente
      </button>
      <p className={estilos.pista}>
        {permitido ? 'Vuelve a la cámara en unos segundos' : 'Toca para seguir con la siguiente persona'}
      </p>
    </section>
  );
}

function SinCamara({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
  return (
    <div className={estilos.sinCamara}>
      <MdCameraAlt aria-hidden="true" />
      <h2>Se necesita la cámara</h2>
      <p>Sirve solo para leer el código del boleto. También puedes escribir el código a mano.</p>
      <Aviso tono="aviso" texto={mensaje} />
      <Boton onClick={onReintentar}>Permitir cámara</Boton>
    </div>
  );
}

function DialogoEscribirCodigo({ onCerrar, onValidar }: { onCerrar: () => void; onValidar: (codigo: string) => void }) {
  const [codigo, setCodigo] = useState('');
  const enviar = (e?: FormEvent) => {
    e?.preventDefault();
    if (codigo.trim()) onValidar(codigo.trim());
  };
  return (
    <Dialogo
      titulo="Escribir el código"
      onCerrar={onCerrar}
      acciones={
        <>
          <BotonTexto onClick={onCerrar}>Cancelar</BotonTexto>
          <BotonTexto onClick={() => enviar()} disabled={!codigo.trim()}>
            Validar
          </BotonTexto>
        </>
      }
    >
      <form onSubmit={enviar} className={estilos.formularioCodigo}>
        <p>
          Si la cámara no lee el boleto, escribe o pega aquí el contenido completo del código QR (el código y la firma,
          separados por un punto).
        </p>
        <Campo
          etiqueta="Contenido del QR"
          valor={codigo}
          onCambio={setCodigo}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          ayuda="Ejemplo: EZ-0001-ABCD.firma"
        />
      </form>
    </Dialogo>
  );
}

function UltimosAccesos({ registros }: { registros: Registro[] }) {
  if (registros.length === 0)
    return (
      <p id="ultimos-accesos" className={estilos.apoyo}>
        Todavía no hay accesos registrados.
      </p>
    );
  return (
    <ul id="ultimos-accesos" className={estilos.bitacora}>
      {registros.map((r, i) => (
        <li key={`${r.codigo}-${r.fechaHora}-${i}`}>
          <span className={r.permitido ? estilos.puntoOk : estilos.puntoError} aria-hidden="true" />
          <div>
            <strong>{r.codigo}</strong>
            <span>
              {r.titulo} · {hora(r.fechaHora)}
            </span>
          </div>
          {!r.sincronizado && <span className={estilos.porEnviar}>por enviar</span>}
        </li>
      ))}
    </ul>
  );
}
