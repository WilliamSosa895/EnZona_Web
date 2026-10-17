import { lazy, Suspense, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MdAdd, MdDeleteOutline, MdEventBusy, MdEventSeat, MdPayments } from 'react-icons/md';
import { eventosApi } from '@/api/eventos';
import { ApiError } from '@/api/http';
import type { Asiento, Categoria, Evento, EventoSolicitud } from '@/api/tipos';
import { claves } from '@/app/consultas';
import { aEntradaLocal, desdeEntradaLocal, largo, yaPaso } from '@/lib/fechas';
import { aNumero } from '@/lib/formato';
import { esCodigo, mensajeDeError } from '@/lib/errores';
import {
  Aviso,
  BarraSuperior,
  Boton,
  BotonIcono,
  BotonSecundario,
  BotonTexto,
  Campo,
  ChipFiltro,
  Dialogo,
  EstadoVacio,
  IndicadorCarga,
  Interruptor,
  Tarjeta,
} from '@/ui';
import { dentroDelArea } from '@/features/mapa/geo';
import { vendidosDe } from './calculos';
import estilos from './Organizador.module.css';

const MapaSelector = lazy(() => import('@/features/mapa/Mapas').then((m) => ({ default: m.MapaSelector })));

interface TipoForm {
  id: number | null;
  nombre: string;
  precio: string;
  cantidad: string;
  /** Boletos ya vendidos o reservados de este tipo (no se puede bajar de ahí ni cambiar el precio). */
  vendidos: number;
}

interface SeccionForm {
  nombre: string;
  filas: string;
  porFila: string;
}

const entero = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v.trim()) : NaN);
const importeValido = (v: string) => /^\d{1,8}(\.\d{1,2})?$/.test(v.trim());

/**
 * Alta y edición de eventos (RF-08, RF-09, RF-13). Fecha y hora con selectores nativos en la zona del evento,
 * ubicación exacta en el mapa (publicar la exige; un borrador no), tipos de boleto y mapa de asientos. Las
 * reglas son las mismas que valida la API (ReglasEvento y la política de modificación).
 */
export default function FormularioEventoPage() {
  const { id } = useParams();
  const eventoId = id ? Number(id) : null;
  const categorias = useQuery({
    queryKey: claves.categorias,
    queryFn: ({ signal }) => eventosApi.categorias(signal),
    staleTime: 3_600_000,
  });
  const evento = useQuery({
    queryKey: claves.evento(eventoId ?? 0),
    queryFn: ({ signal }) => eventosApi.detalle(eventoId!, signal),
    enabled: eventoId !== null,
  });
  const asientos = useQuery({
    queryKey: claves.asientos(eventoId ?? 0),
    queryFn: ({ signal }) => eventosApi.asientos(eventoId!, signal),
    enabled: !!evento.data?.requiereAsiento,
  });

  const titulo = eventoId === null ? 'Nuevo evento' : 'Editar evento';
  const cargando =
    categorias.isPending ||
    (eventoId !== null && (evento.isPending || (!!evento.data?.requiereAsiento && asientos.isPending)));
  const error = categorias.error ?? evento.error ?? asientos.error;

  if (cargando) return <IndicadorCarga texto="Preparando el formulario…" />;
  if (error)
    return (
      <>
        <BarraSuperior titulo={titulo} volver />
        <EstadoVacio
          icono={<MdEventBusy size={56} />}
          titulo="No se pudo cargar el formulario"
          texto={mensajeDeError(error)}
          textoAccion="Reintentar"
          onAccion={() => {
            void categorias.refetch();
            if (eventoId !== null) void evento.refetch();
          }}
        />
      </>
    );
  if (
    evento.data &&
    (evento.data.estado === 'CANCELADO' || evento.data.estado === 'REALIZADO' || yaPaso(evento.data.fechaHoraInicio))
  )
    return (
      <>
        <BarraSuperior titulo={titulo} volver />
        <EstadoVacio
          icono={<MdEventBusy size={56} />}
          titulo="Este evento ya no se puede modificar"
          texto="Solo se editan los eventos en borrador o publicados que aún no comienzan."
        />
      </>
    );

  return (
    <Formulario
      titulo={titulo}
      categorias={categorias.data ?? []}
      existente={evento.data ?? null}
      asientos={asientos.data ?? []}
    />
  );
}

interface FormularioProps {
  titulo: string;
  categorias: Categoria[];
  existente: Evento | null;
  asientos: Asiento[];
}

function seccionesDe(asientos: Asiento[]): SeccionForm[] {
  const mapa = new Map<string, Map<string, number>>();
  for (const a of [...asientos].sort((x, y) => x.id - y.id)) {
    const filas = mapa.get(a.seccion) ?? new Map<string, number>();
    filas.set(a.fila, (filas.get(a.fila) ?? 0) + 1);
    mapa.set(a.seccion, filas);
  }
  return [...mapa].map(([nombre, filas]) => ({
    nombre,
    filas: String(filas.size),
    porFila: String(Math.max(...filas.values())),
  }));
}

function Formulario({ titulo, categorias, existente, asientos }: FormularioProps) {
  const navegar = useNavigate();
  const consultas = useQueryClient();
  const vendidos = existente ? vendidosDe(existente) : 0;
  const publicado = existente?.estado === 'PUBLICADO';
  // La modalidad (de pago o con asiento) no cambia una vez publicado o con ventas.
  const modalidadFija = publicado || vendidos > 0;
  // El plano solo se regenera en un borrador sin ventas.
  const planoFijo = !!existente && (publicado || vendidos > 0);

  const [nombre, setNombre] = useState(existente?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(existente?.descripcion ?? '');
  const [inicio, setInicio] = useState(aEntradaLocal(existente?.fechaHoraInicio ?? null));
  const [fin, setFin] = useState(aEntradaLocal(existente?.fechaHoraFin ?? null));
  const [lugar, setLugar] = useState(existente?.lugar ?? '');
  const [direccion, setDireccion] = useState(existente?.direccion ?? '');
  const [ciudad, setCiudad] = useState(existente?.ciudad ?? 'Orizaba');
  const [lat, setLat] = useState<number | null>(existente?.latitud ?? null);
  const [lng, setLng] = useState<number | null>(existente?.longitud ?? null);
  const [categoriaId, setCategoriaId] = useState<number | null>(existente?.categoriaId ?? categorias[0]?.id ?? null);
  const [esDePago, setEsDePago] = useState(existente?.esDePago ?? false);
  const [tipos, setTipos] = useState<TipoForm[]>(() =>
    existente?.esDePago && existente.tiposBoleto?.length
      ? existente.tiposBoleto.map((t) => ({
          id: t.id,
          nombre: t.nombre,
          precio: aNumero(t.precio).toFixed(2).replace(/\.00$/, ''),
          cantidad: String(t.cantidadTotal),
          vendidos: t.cantidadTotal - t.disponibles,
        }))
      : [{ id: null, nombre: 'General', precio: '', cantidad: '', vendidos: 0 }],
  );
  const [requiereAsiento, setRequiereAsiento] = useState(existente?.requiereAsiento ?? false);
  const [secciones, setSecciones] = useState<SeccionForm[]>(() =>
    asientos.length ? seccionesDe(asientos) : [{ nombre: 'Luneta', filas: '', porFila: '' }],
  );
  const [aforo, setAforo] = useState(existente ? String(existente.aforo) : '');
  const [intentado, setIntentado] = useState(false);
  const [confirmarFecha, setConfirmarFecha] = useState<EventoSolicitud | null>(null);

  // ---------------------------------------------------------------- validación (mismas reglas que la API)
  const inicioIso = desdeEntradaLocal(inicio);
  const finIso = fin ? desdeEntradaLocal(fin) : null;
  const totalAsientos =
    planoFijo && requiereAsiento
      ? asientos.length
      : secciones.reduce((s, x) => s + (entero(x.filas) || 0) * (entero(x.porFila) || 0), 0);
  const aforoNum = requiereAsiento ? totalAsientos : entero(aforo);
  const sumaTipos = tipos.reduce((s, t) => s + (entero(t.cantidad) || 0), 0);

  const errores = useMemo(() => {
    const e: Record<string, string> = {};
    if (!nombre.trim()) e.nombre = 'Escribe el nombre del evento.';
    else if (nombre.trim().length > 160) e.nombre = 'Máximo 160 caracteres.';
    if (descripcion.length > 5000) e.descripcion = 'Máximo 5000 caracteres.';
    if (!inicioIso) e.inicio = 'Elige la fecha y la hora de inicio.';
    else if (yaPaso(inicioIso)) e.inicio = 'La fecha de inicio debe ser futura.';
    if (fin && !finIso) e.fin = 'La fecha de fin no es válida.';
    else if (finIso && inicioIso && new Date(finIso) < new Date(inicioIso))
      e.fin = 'La fecha de fin no puede ser anterior a la de inicio.';
    if (!lugar.trim()) e.lugar = 'Escribe el nombre del recinto.';
    if (!requiereAsiento && (!Number.isInteger(aforoNum) || aforoNum < 1 || aforoNum > 100_000))
      e.aforo = 'El aforo debe ser un número entre 1 y 100 000.';
    if (existente && Number.isInteger(aforoNum) && aforoNum < vendidos)
      e.aforo = `Ya hay ${vendidos} lugares vendidos o reservados; el aforo no puede ser menor.`;
    if (requiereAsiento && !planoFijo) {
      const nombres = new Set<string>();
      secciones.forEach((s, i) => {
        const clave = s.nombre.trim().toLocaleLowerCase('es-MX');
        if (!clave) e[`seccion${i}`] = 'Escribe el nombre de la sección.';
        else if (nombres.has(clave)) e[`seccion${i}`] = 'Hay dos secciones con ese nombre.';
        nombres.add(clave);
        const f = entero(s.filas);
        const p = entero(s.porFila);
        if (!(f >= 1 && f <= 26)) e[`filas${i}`] = 'De 1 a 26 filas (A–Z).';
        if (!(p >= 1 && p <= 200)) e[`porFila${i}`] = 'De 1 a 200 asientos.';
      });
      if (totalAsientos < 1) e.asientos = 'Define al menos una sección con filas y asientos.';
    }
    if (esDePago) {
      const nombres = new Set<string>();
      tipos.forEach((t, i) => {
        const clave = t.nombre.trim().toLocaleLowerCase('es-MX');
        if (!clave) e[`tipo${i}`] = 'Escribe el nombre del boleto.';
        else if (nombres.has(clave)) e[`tipo${i}`] = 'Hay dos tipos con ese nombre.';
        nombres.add(clave);
        if (!importeValido(t.precio) || Number(t.precio) <= 0)
          e[`precio${i}`] = 'Precio mayor a 0, con hasta 2 decimales.';
        const c = entero(t.cantidad);
        if (!(c >= 1)) e[`cantidad${i}`] = 'Al menos 1 boleto.';
        else if (c < t.vendidos) e[`cantidad${i}`] = `Ya hay ${t.vendidos} vendidos.`;
      });
      if (Number.isInteger(aforoNum) && sumaTipos > aforoNum)
        e.tipos = `La suma de boletos (${sumaTipos}) supera el aforo (${aforoNum}).`;
    }
    return e;
  }, [
    nombre,
    descripcion,
    inicioIso,
    fin,
    finIso,
    lugar,
    requiereAsiento,
    aforoNum,
    existente,
    vendidos,
    planoFijo,
    secciones,
    totalAsientos,
    esDePago,
    tipos,
    sumaTipos,
  ]);

  const valido = Object.keys(errores).length === 0;
  const tieneUbicacion = lat !== null && lng !== null;
  const ver = (clave: string) => (intentado ? (errores[clave] ?? null) : null);

  // ---------------------------------------------------------------- envío
  const guardar = useMutation({
    mutationFn: (datos: EventoSolicitud) =>
      existente ? eventosApi.modificar(existente.id, datos) : eventosApi.crear(datos),
    onSuccess: (e) => {
      consultas.setQueryData(claves.evento(e.id), e);
      void consultas.invalidateQueries({ queryKey: claves.eventosOrganizador });
      void consultas.invalidateQueries({ queryKey: claves.asientos(e.id) });
      void consultas.invalidateQueries({ queryKey: claves.reporte(e.id) });
      void consultas.invalidateQueries({ queryKey: ['eventos'] });
      navegar(`/organizador/eventos/${e.id}`, { replace: true });
    },
  });
  const errorServidor = guardar.error instanceof ApiError ? guardar.error : null;
  const campoServidor = (campo: string) => errorServidor?.errorDeCampo(campo) ?? null;

  function solicitud(publicar: boolean): EventoSolicitud {
    return {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      lugar: lugar.trim(),
      direccion: direccion.trim() || null,
      ciudad: ciudad.trim() || null,
      latitud: lat,
      longitud: lng,
      categoriaId,
      fechaHoraInicio: inicioIso!,
      fechaHoraFin: finIso,
      aforo: aforoNum,
      esDePago,
      requiereAsiento,
      tiposBoleto: esDePago
        ? tipos.map((t) => ({
            id: t.id,
            nombre: t.nombre.trim(),
            precio: Number(t.precio),
            cantidad: entero(t.cantidad),
          }))
        : null,
      secciones:
        requiereAsiento && !planoFijo
          ? secciones.map((s) => ({
              nombre: s.nombre.trim(),
              filas: entero(s.filas),
              asientosPorFila: entero(s.porFila),
            }))
          : null,
      publicar,
    };
  }

  function enviar(publicar: boolean) {
    setIntentado(true);
    if (!valido || (publicar && !tieneUbicacion) || (publicado && !tieneUbicacion)) return;
    const datos = solicitud(publicar);
    // RF-13: cambiar la fecha de un evento con boletos emitidos pide confirmación explícita.
    if (existente && vendidos > 0 && datos.fechaHoraInicio !== existente.fechaHoraInicio) {
      setConfirmarFecha(datos);
      return;
    }
    guardar.mutate(datos);
  }

  const alEnviar = (e: FormEvent) => {
    e.preventDefault();
    enviar(!existente);
  };

  const cambioFecha = existente && inicioIso && inicioIso !== existente.fechaHoraInicio;

  return (
    <>
      <BarraSuperior titulo={titulo} volver />
      {confirmarFecha && existente && (
        <Dialogo
          titulo="¿Cambiar la fecha del evento?"
          onCerrar={() => setConfirmarFecha(null)}
          acciones={
            <>
              <BotonTexto onClick={() => setConfirmarFecha(null)}>Revisar</BotonTexto>
              <Boton
                onClick={() => {
                  guardar.mutate(confirmarFecha);
                  setConfirmarFecha(null);
                }}
              >
                Cambiar fecha y guardar
              </Boton>
            </>
          }
        >
          <p>
            Este evento ya tiene {vendidos} lugares vendidos o confirmados. La nueva fecha (
            {largo(confirmarFecha.fechaHoraInicio)}) afecta a esos asistentes; se les avisará del cambio.
          </p>
        </Dialogo>
      )}
      <form className={estilos.formulario} onSubmit={alEnviar} noValidate>
        <Campo
          etiqueta="Nombre del evento"
          valor={nombre}
          onCambio={setNombre}
          maxLength={160}
          error={ver('nombre') ?? campoServidor('nombre')}
        />
        <Campo
          etiqueta="Descripción"
          valor={descripcion}
          onCambio={setDescripcion}
          lineas={3}
          maxLength={5000}
          error={ver('descripcion')}
        />

        <Tarjeta>
          <h2 className={estilos.tituloTarjeta}>Fecha y hora</h2>
          <p className={estilos.apoyo}>Hora del centro de México (zona del evento).</p>
          <div className={estilos.dosCampos}>
            <Campo
              etiqueta="Inicio"
              type="datetime-local"
              valor={inicio}
              onCambio={setInicio}
              min={aEntradaLocal(new Date().toISOString())}
              error={ver('inicio') ?? campoServidor('fechaHoraInicio')}
            />
            <Campo
              etiqueta="Fin (opcional)"
              type="datetime-local"
              valor={fin}
              onCambio={setFin}
              min={inicio || undefined}
              error={ver('fin')}
            />
          </div>
          {cambioFecha && vendidos > 0 && (
            <Aviso
              tono="aviso"
              texto={`Cambiar la fecha afecta a ${vendidos} asistentes con boleto; se pedirá confirmación al guardar.`}
            />
          )}
        </Tarjeta>

        <Tarjeta>
          <h2 className={estilos.tituloTarjeta}>Ubicación</h2>
          <Campo
            etiqueta="Lugar (nombre del recinto)"
            valor={lugar}
            onCambio={setLugar}
            maxLength={160}
            error={ver('lugar') ?? campoServidor('lugar')}
          />
          <div className={estilos.dosCampos}>
            <Campo etiqueta="Dirección" valor={direccion} onCambio={setDireccion} maxLength={240} />
            <Campo etiqueta="Ciudad" valor={ciudad} onCambio={setCiudad} maxLength={80} />
          </div>
          <div className={estilos.mapa}>
            <Suspense fallback={<IndicadorCarga texto="Cargando el mapa…" />}>
              <MapaSelector
                lat={lat}
                lng={lng}
                onCambio={(a, b) => {
                  setLat(a);
                  setLng(b);
                }}
              />
            </Suspense>
          </div>
          <p className={tieneUbicacion ? estilos.apoyo : estilos.textoError} aria-live="polite">
            {tieneUbicacion
              ? `Ubicación fijada (${lat?.toFixed(5)}, ${lng?.toFixed(5)}). Toca el mapa o arrastra el marcador para ajustarla.`
              : 'Toca el mapa para fijar la ubicación exacta. Para publicar hace falta; un borrador puede guardarse sin ella.'}
          </p>
          {tieneUbicacion && !dentroDelArea(lat, lng) && (
            <Aviso
              tono="aviso"
              texto="La ubicación está fuera del área de Orizaba y alrededores. Revisa que sea correcta."
            />
          )}
          {tieneUbicacion && !publicado && (
            <BotonTexto
              onClick={() => {
                setLat(null);
                setLng(null);
              }}
            >
              Quitar ubicación
            </BotonTexto>
          )}
        </Tarjeta>

        <fieldset className={estilos.grupoChips}>
          <legend className={estilos.tituloTarjeta}>Categoría</legend>
          <div className={estilos.chips}>
            {categorias.map((c) => (
              <ChipFiltro
                key={c.id}
                texto={c.nombre}
                activo={categoriaId === c.id}
                onClick={() => setCategoriaId(c.id)}
              />
            ))}
          </div>
        </fieldset>

        <Tarjeta>
          <Interruptor
            icono={<MdPayments />}
            texto="Evento de pago"
            detalle={esDePago ? 'Se venderán boletos' : 'Solo confirmación de asistencia, sin cobro'}
            activo={esDePago}
            onCambio={setEsDePago}
            deshabilitado={modalidadFija}
          />
          {modalidadFija && (
            <p className={estilos.apoyo}>La modalidad no cambia en un evento publicado o con boletos emitidos.</p>
          )}
          {esDePago && (
            <div className={estilos.tipos}>
              {tipos.map((t, i) => (
                <div key={i} className={estilos.tipo}>
                  <Campo
                    etiqueta="Nombre del boleto"
                    valor={t.nombre}
                    onCambio={(v) => setTipos((l) => l.map((x, j) => (j === i ? { ...x, nombre: v } : x)))}
                    maxLength={80}
                    error={ver(`tipo${i}`)}
                  />
                  <Campo
                    etiqueta="Precio (MXN)"
                    valor={t.precio}
                    onCambio={(v) => setTipos((l) => l.map((x, j) => (j === i ? { ...x, precio: v } : x)))}
                    inputMode="decimal"
                    disabled={t.vendidos > 0}
                    ayuda={t.vendidos > 0 ? 'Con ventas, el precio no cambia.' : 'Precio final, sin cargos ocultos.'}
                    error={ver(`precio${i}`)}
                  />
                  <Campo
                    etiqueta="Cantidad"
                    valor={t.cantidad}
                    onCambio={(v) => setTipos((l) => l.map((x, j) => (j === i ? { ...x, cantidad: v } : x)))}
                    inputMode="numeric"
                    error={ver(`cantidad${i}`)}
                  />
                  {tipos.length > 1 && t.vendidos === 0 && (
                    <BotonIcono
                      etiqueta={`Quitar el boleto ${t.nombre || i + 1}`}
                      onClick={() => setTipos((l) => l.filter((_, j) => j !== i))}
                    >
                      <MdDeleteOutline />
                    </BotonIcono>
                  )}
                </div>
              ))}
              {ver('tipos') && <Aviso texto={errores.tipos} tono="error" />}
              <BotonTexto
                icono={<MdAdd />}
                onClick={() => setTipos((l) => [...l, { id: null, nombre: '', precio: '', cantidad: '', vendidos: 0 }])}
              >
                Agregar tipo de boleto
              </BotonTexto>
              <p className={estilos.apoyo}>
                {sumaTipos} boletos en venta
                {Number.isInteger(aforoNum) && aforoNum > 0 ? ` de un aforo de ${aforoNum}` : ''}.
              </p>
            </div>
          )}
        </Tarjeta>

        <Tarjeta>
          <Interruptor
            icono={<MdEventSeat />}
            texto="¿Este evento requiere asientos?"
            detalle={
              requiereAsiento
                ? 'El asistente elegirá sus butacas en el plano'
                : 'Entrada libre: solo se cuenta el aforo'
            }
            activo={requiereAsiento}
            onCambio={setRequiereAsiento}
            deshabilitado={modalidadFija}
          />
          {requiereAsiento && planoFijo && (
            <Aviso
              tono="aviso"
              texto={`El plano ya no se puede cambiar (${asientos.length} butacas): el evento está publicado o tiene boletos emitidos.`}
            />
          )}
          {requiereAsiento && !planoFijo && (
            <div className={estilos.tipos}>
              {secciones.map((s, i) => (
                <div key={i} className={estilos.tipo}>
                  <Campo
                    etiqueta="Sección"
                    valor={s.nombre}
                    onCambio={(v) => setSecciones((l) => l.map((x, j) => (j === i ? { ...x, nombre: v } : x)))}
                    maxLength={40}
                    ayuda={i === 0 ? 'Ejemplo: Luneta, Platea, Balcón' : undefined}
                    error={ver(`seccion${i}`)}
                  />
                  <Campo
                    etiqueta="Filas"
                    valor={s.filas}
                    onCambio={(v) => setSecciones((l) => l.map((x, j) => (j === i ? { ...x, filas: v } : x)))}
                    inputMode="numeric"
                    error={ver(`filas${i}`)}
                  />
                  <Campo
                    etiqueta="Asientos por fila"
                    valor={s.porFila}
                    onCambio={(v) => setSecciones((l) => l.map((x, j) => (j === i ? { ...x, porFila: v } : x)))}
                    inputMode="numeric"
                    error={ver(`porFila${i}`)}
                  />
                  {secciones.length > 1 && (
                    <BotonIcono
                      etiqueta={`Quitar la sección ${s.nombre || i + 1}`}
                      onClick={() => setSecciones((l) => l.filter((_, j) => j !== i))}
                    >
                      <MdDeleteOutline />
                    </BotonIcono>
                  )}
                </div>
              ))}
              {ver('asientos') && <Aviso texto={errores.asientos} tono="error" />}
              <BotonTexto
                icono={<MdAdd />}
                onClick={() => setSecciones((l) => [...l, { nombre: '', filas: '', porFila: '' }])}
              >
                Agregar sección
              </BotonTexto>
              <p className={estilos.apoyo}>
                {totalAsientos > 0
                  ? `Se generarán ${totalAsientos} butacas. El aforo se ajusta a ese número.`
                  : 'Indica cuántas filas y cuántos asientos tiene cada sección.'}
              </p>
            </div>
          )}
        </Tarjeta>

        {!requiereAsiento && (
          <Campo
            etiqueta="Aforo (lugares totales)"
            valor={aforo}
            onCambio={setAforo}
            inputMode="numeric"
            ayuda={
              existente && vendidos > 0
                ? `Ya hay ${vendidos} lugares entregados; el aforo no puede ser menor.`
                : undefined
            }
            error={ver('aforo') ?? campoServidor('aforo')}
          />
        )}

        {intentado && !valido && <Aviso tono="error" texto="Revisa los campos marcados." anunciar />}
        {guardar.isError && (
          <Aviso
            tono="error"
            anunciar
            titulo={esCodigo(guardar.error, 'POLITICA_MODIFICACION') ? 'Cambio no permitido' : undefined}
            texto={mensajeDeError(guardar.error)}
          />
        )}

        <div className={estilos.accionesFormulario}>
          {existente ? (
            <Boton
              type="submit"
              variante="destacado"
              cargando={guardar.isPending}
              disabled={publicado && !tieneUbicacion}
            >
              Guardar cambios
            </Boton>
          ) : (
            <>
              <Boton type="submit" variante="destacado" cargando={guardar.isPending && guardar.variables?.publicar}>
                Crear y publicar
              </Boton>
              {intentado && valido && !tieneUbicacion && (
                <p className={estilos.textoError}>Publicar está bloqueado hasta fijar la ubicación en el mapa.</p>
              )}
              <BotonSecundario type="button" disabled={guardar.isPending} onClick={() => enviar(false)}>
                Guardar como borrador
              </BotonSecundario>
            </>
          )}
        </div>
      </form>
    </>
  );
}
