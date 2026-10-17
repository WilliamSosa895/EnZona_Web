import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MdCameraAlt, MdCancel, MdCheckCircle, MdCloudOff, MdKeyboard } from 'react-icons/md';
import { administracionApi } from '@/api/administracion';
import { eventosApi } from '@/api/eventos';
import { validacionApi } from '@/api/validacion';
import type { Evento, MotivoRechazo, ValidacionRespuesta } from '@/api/tipos';
import { tieneRol } from '@/auth/roles';
import { useSesion } from '@/auth/useSesion';
import { corto, hora } from '@/lib/fechas';
import { esCodigo, mensajeDeError } from '@/lib/errores';
import { leerPreferencias } from '@/lib/preferencias';
import { useMantenerPantalla } from '@/features/boletos/useMantenerPantalla';
import { Aviso, Boton, BotonTexto, Campo, IndicadorCarga, Pagina, Selector } from '@/ui';
import { CamaraQr } from './CamaraQr';
import estilos from './Validador.module.css';

const CLAVE_EVENTO = 'enzona.validador.evento';
const CLAVE_BITACORA = 'enzona.validador.bitacora';

const TITULO_RECHAZO: Record<MotivoRechazo, string> = {
  FORMATO_INVALIDO: 'Código no válido',
  BOLETO_INEXISTENTE: 'Boleto no encontrado',
  FIRMA_INVALIDA: 'Boleto falso',
  OTRO_EVENTO: 'Boleto de otro evento',
  EVENTO_CANCELADO: 'Evento cancelado',
  YA_UTILIZADO: 'Boleto ya utilizado',
  CANCELADO: 'Boleto cancelado',
  EXPIRADO: 'Boleto expirado',
};

interface Registro {
  codigo: string;
  permitido: boolean;
  detalle: string;
  hora: string;
}

function leer<T>(clave: string, porDefecto: T): T {
  try {
    const crudo = sessionStorage.getItem(clave);
    return crudo ? (JSON.parse(crudo) as T) : porDefecto;
  } catch {
    return porDefecto;
  }
}

function guardar(clave: string, valor: unknown) {
  try {
    sessionStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* sin almacenamiento: solo dura mientras la página esté abierta */
  }
}

/**
 * Validación de acceso en la puerta (RF-15, ScannerScreen en Android). La API comprueba la firma del QR,
 * marca el boleto como usado una sola vez y registra la validación. La validación sin conexión (RNF-08) es
 * exclusiva de la aplicación Android, que descarga la lista del evento.
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

  const [eventoId, setEventoId] = useState<number | null>(() => leer<number | null>(CLAVE_EVENTO, null));
  const elegido = eventos.find((e) => e.id === eventoId) ?? null;

  return (
    <Pagina titulo="Validar acceso" subtitulo="Escanea el código QR del asistente" angosta>
      <div className={estilos.pila}>
        <Aviso
          icono={<MdCloudOff />}
          texto="La validación sin conexión está disponible en la aplicación Android, que descarga la lista del evento. En la web se valida en línea."
        />
        {publicos.isPending ? (
          <IndicadorCarga texto="Cargando eventos…" />
        ) : publicos.isError ? (
          <Aviso
            tono="error"
            texto={mensajeDeError(publicos.error)}
            textoAccion="Reintentar"
            onAccion={() => void publicos.refetch()}
          />
        ) : (
          <Selector
            etiqueta="Evento en la puerta"
            marcador="Elige el evento"
            opciones={eventos.map((e) => ({ valor: e.id, texto: `${e.nombre} · ${corto(e.fechaHoraInicio)}` }))}
            valor={elegido?.id ?? null}
            onCambio={(id) => {
              setEventoId(id);
              guardar(CLAVE_EVENTO, id);
            }}
          />
        )}
        {elegido ? (
          <Escaner key={elegido.id} evento={elegido} />
        ) : (
          !publicos.isPending && (
            <p className={estilos.apoyo}>
              Elige el evento en el que estás en la puerta. Solo podrás validar los eventos para los que el organizador
              te designó como personal de acceso.
            </p>
          )
        )}
      </div>
    </Pagina>
  );
}

function Escaner({ evento }: { evento: Evento }) {
  const [resultado, setResultado] = useState<ValidacionRespuesta | null>(null);
  const [manual, setManual] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const [bitacora, setBitacora] = useState<Registro[]>(() => leer<Registro[]>(CLAVE_BITACORA, []));
  useMantenerPantalla(true);

  useEffect(() => guardar(CLAVE_BITACORA, bitacora), [bitacora]);

  const validacion = useMutation({
    mutationFn: (qr: string) => validacionApi.validar(evento.id, qr),
    onSuccess: (r, qr) => {
      setResultado(r);
      setCodigo('');
      const permitido = r.resultado === 'PERMITIDO';
      // Vibración distinta para permitir o rechazar, útil con ruido en la puerta.
      navigator.vibrate?.(permitido ? 120 : [80, 60, 80, 60, 80]);
      setBitacora((b) =>
        [
          {
            codigo: r.codigo ?? (qr.split('.')[0].slice(0, 24) || 'Código vacío'),
            permitido,
            detalle: permitido ? 'Permitido' : r.motivo ? TITULO_RECHAZO[r.motivo] : 'Rechazado',
            hora: hora(new Date()),
          },
          ...b,
        ].slice(0, 6),
      );
    },
  });

  function validar(qr: string) {
    if (resultado || validacion.isPending) return; // ya hay un resultado en pantalla
    validacion.mutate(qr.trim());
  }

  function siguiente() {
    setResultado(null);
    validacion.reset();
  }

  const sinPermiso = esCodigo(validacion.error, 'ACCESO_DENEGADO');

  return (
    <>
      {sinPermiso && (
        <Aviso
          tono="error"
          titulo="No estás designado para este evento"
          texto="Pide al organizador que te agregue como personal de acceso, o elige otro evento."
          anunciar
        />
      )}
      {validacion.isError && !sinPermiso && (
        <Aviso
          tono="error"
          texto={mensajeDeError(validacion.error)}
          textoAccion="Entendido"
          onAccion={() => validacion.reset()}
          anunciar
        />
      )}

      {resultado ? (
        <TarjetaResultado resultado={resultado} onContinuar={siguiente} />
      ) : manual || errorCamara ? (
        <form
          className={estilos.manual}
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (codigo.trim()) validar(codigo);
          }}
        >
          <h2 className={estilos.subtitulo}>Captura manual</h2>
          {errorCamara && <Aviso tono="aviso" texto={errorCamara} />}
          <p className={estilos.apoyo}>Útil cuando la cámara falla. Escribe o pega el contenido del QR del boleto.</p>
          <Campo
            etiqueta="Contenido del QR (EZ-0000-XXXX.firma)"
            valor={codigo}
            onCambio={setCodigo}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <Boton type="submit" disabled={!codigo.trim()} cargando={validacion.isPending}>
            Validar código
          </Boton>
          {!errorCamara && (
            <BotonTexto tono="neutro" icono={<MdCameraAlt />} onClick={() => setManual(false)}>
              Volver a la cámara
            </BotonTexto>
          )}
        </form>
      ) : (
        <>
          <CamaraQr activa={!resultado && !validacion.isPending} onCodigo={validar} onError={setErrorCamara} />
          <p className={estilos.centrado}>{validacion.isPending ? 'Validando…' : 'Apunta al código QR del boleto'}</p>
          <BotonTexto tono="neutro" icono={<MdKeyboard />} onClick={() => setManual(true)}>
            Capturar código manualmente
          </BotonTexto>
        </>
      )}

      {bitacora.length > 0 && (
        <section aria-labelledby="titulo-bitacora">
          <h2 id="titulo-bitacora" className={estilos.subtitulo}>
            Últimos accesos
          </h2>
          <ul className={estilos.bitacora}>
            {bitacora.map((r, i) => (
              <li key={`${r.codigo}-${i}`}>
                <span className={r.permitido ? estilos.puntoOk : estilos.puntoError} aria-hidden="true" />
                <div>
                  <strong>{r.codigo}</strong>
                  <span>
                    {r.detalle} · {r.hora}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function TarjetaResultado({ resultado, onContinuar }: { resultado: ValidacionRespuesta; onContinuar: () => void }) {
  const boton = useRef<HTMLButtonElement>(null);
  // El foco pasa a «Escanear siguiente»: con teclado o lector de pantalla se continúa sin buscar el botón.
  useEffect(() => boton.current?.focus(), []);
  const permitido = resultado.resultado === 'PERMITIDO';
  const titulo = permitido
    ? 'Acceso permitido'
    : resultado.motivo
      ? TITULO_RECHAZO[resultado.motivo]
      : 'Acceso rechazado';
  const detalle = permitido
    ? (resultado.tipoBoleto ?? 'Boleto válido')
    : resultado.motivo === 'YA_UTILIZADO' && resultado.fechaUso
      ? `${resultado.mensaje}. Se usó el ${corto(resultado.fechaUso)}.`
      : resultado.mensaje;
  return (
    <section
      className={[estilos.resultado, permitido ? estilos.resultadoOk : estilos.resultadoError].join(' ')}
      role="status"
      aria-live="assertive"
    >
      {permitido ? <MdCheckCircle aria-hidden="true" /> : <MdCancel aria-hidden="true" />}
      <h2>{titulo}</h2>
      <p>{detalle}</p>
      {resultado.asiento && <strong className={estilos.asiento}>{resultado.asiento}</strong>}
      {resultado.codigo && <span className={estilos.codigo}>{resultado.codigo}</span>}
      <Boton ref={boton} onClick={onContinuar}>
        Escanear siguiente
      </Boton>
    </section>
  );
}
