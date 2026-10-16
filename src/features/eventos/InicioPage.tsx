import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { MdArrowDropDown, MdClose, MdMyLocation, MdPlace, MdSearch, MdSearchOff } from 'react-icons/md';
import { eventosApi } from '@/api/eventos';
import { claves } from '@/app/consultas';
import { mensajeDeError } from '@/lib/errores';
import {
  ETIQUETAS_FECHA,
  FILTROS_VACIOS,
  aConsulta,
  filtrosActivos,
  hayFiltros,
  type FiltroFecha,
  type FiltroPrecio,
  type FiltrosInicio,
} from '@/lib/filtros';
import { CIUDAD_POR_DEFECTO, guardarPreferencias, leerPreferencias } from '@/lib/preferencias';
import { obtenerUbicacion, type Coordenadas } from '@/lib/ubicacion';
import { useDemora } from '@/lib/useDemora';
import {
  Aviso,
  BotonIcono,
  BotonSecundario,
  BotonTexto,
  Campo,
  ChipFiltro,
  ChipMenu,
  EstadoVacio,
  IndicadorCarga,
  Logo,
  Pagina,
} from '@/ui';
import { DialogoZona } from './DialogoZona';
import { TarjetaEvento } from './TarjetaEvento';
import estilos from './Eventos.module.css';

const TAMANO_PAGINA = 12;

const FECHAS_URL: Record<string, FiltroFecha> = {
  hoy: 'HOY',
  semana: 'ESTA_SEMANA',
  mes: 'ESTE_MES',
  proximo: 'PROXIMO_MES',
};
const URL_FECHAS = Object.fromEntries(Object.entries(FECHAS_URL).map(([k, v]) => [v, k])) as Record<
  FiltroFecha,
  string
>;

/** Los filtros viven en la URL: al abrir un evento y volver, la búsqueda sigue ahí (y se puede compartir). */
function leerFiltros(p: URLSearchParams): FiltrosInicio {
  const precio: FiltroPrecio =
    p.get('precio') === 'gratis' ? 'GRATIS' : p.get('precio') === 'pago' ? 'DE_PAGO' : 'TODOS';
  const categoria = Number(p.get('cat'));
  return {
    busqueda: p.get('q') ?? '',
    categoriaId: Number.isInteger(categoria) && categoria > 0 ? categoria : null,
    lugar: p.get('lugar'),
    precio,
    fecha: FECHAS_URL[p.get('fecha') ?? ''] ?? 'CUALQUIERA',
  };
}

function escribirFiltros(f: FiltrosInicio): URLSearchParams {
  const p = new URLSearchParams();
  if (f.busqueda) p.set('q', f.busqueda);
  if (f.categoriaId) p.set('cat', String(f.categoriaId));
  if (f.lugar) p.set('lugar', f.lugar);
  if (f.precio !== 'TODOS') p.set('precio', f.precio === 'GRATIS' ? 'gratis' : 'pago');
  if (f.fecha !== 'CUALQUIERA') p.set('fecha', URL_FECHAS[f.fecha]);
  return p;
}

/** Inicio: descubrimiento de eventos por zona o ubicación, con búsqueda y filtros (RF-05, RF-06, RF-07, RF-19). */
export default function InicioPage() {
  const [parametros, setParametros] = useSearchParams();
  const filtros = leerFiltros(parametros);
  const cambiar = (f: FiltrosInicio) => setParametros(escribirFiltros(f), { replace: true });

  const [preferencias, setPreferencias] = useState(leerPreferencias);
  const [coordenadas, setCoordenadas] = useState<Coordenadas | null>(null);
  const [eligiendoZona, setEligiendoZona] = useState(false);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);
  const [avisoUbicacion, setAvisoUbicacion] = useState<string | null>(null);
  const busqueda = useDemora(filtros.busqueda);

  const categorias = useQuery({
    queryKey: claves.categorias,
    queryFn: ({ signal }) => eventosApi.categorias(signal),
    staleTime: 3_600_000,
  });

  const consulta = useMemo(
    () => aConsulta({ ...filtros, busqueda }, { ciudad: preferencias.ciudad, ...(coordenadas ?? {}) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- la consulta depende de los valores, no de la identidad del objeto
    [busqueda, filtros.categoriaId, filtros.precio, filtros.fecha, preferencias.ciudad, coordenadas],
  );

  const eventos = useInfiniteQuery({
    queryKey: claves.eventos(consulta),
    queryFn: ({ pageParam, signal }) =>
      eventosApi.listar({ ...consulta, page: pageParam, size: TAMANO_PAGINA }, signal),
    initialPageParam: 0,
    getNextPageParam: (ultima) => (ultima.pagina + 1 < ultima.totalPaginas ? ultima.pagina + 1 : undefined),
  });

  const cargados = useMemo(() => eventos.data?.pages.flatMap((p) => p.elementos) ?? [], [eventos.data]);
  const total = eventos.data?.pages[0]?.total ?? 0;
  // El lugar (recinto) no es un parámetro de la API: se filtra sobre los eventos ya cargados.
  const lugares = useMemo(
    () => [...new Set(cargados.map((e) => e.lugar))].sort((a, b) => a.localeCompare(b, 'es')),
    [cargados],
  );
  const visibles = filtros.lugar ? cargados.filter((e) => e.lugar === filtros.lugar) : cargados;
  const totalMostrado = filtros.lugar ? visibles.length : total;
  const usandoUbicacion = coordenadas !== null;
  const zona = usandoUbicacion ? 'Cerca de mí' : preferencias.ciudad;

  function elegirCiudad(ciudad: string) {
    const nuevas = { ciudad: ciudad || CIUDAD_POR_DEFECTO, usarUbicacion: false };
    setPreferencias(nuevas);
    guardarPreferencias(nuevas);
    setCoordenadas(null);
    setEligiendoZona(false);
    cambiar({ ...filtros, lugar: null });
  }

  async function usarUbicacion() {
    setBuscandoUbicacion(true);
    setAvisoUbicacion(null);
    try {
      setCoordenadas(await obtenerUbicacion());
      setEligiendoZona(false);
      cambiar({ ...filtros, lugar: null });
    } catch (e) {
      setAvisoUbicacion((e as Error).message);
      setEligiendoZona(false);
    } finally {
      setBuscandoUbicacion(false);
    }
  }

  const resumen =
    totalMostrado === 1
      ? '1 evento'
      : hayFiltros(filtros)
        ? `${totalMostrado} eventos encontrados`
        : `${totalMostrado} eventos publicados`;

  return (
    <Pagina>
      {eligiendoZona && (
        <DialogoZona
          zonaActual={preferencias.ciudad}
          usandoUbicacion={usandoUbicacion}
          buscandoUbicacion={buscandoUbicacion}
          onElegir={elegirCiudad}
          onUsarUbicacion={usarUbicacion}
          onCerrar={() => setEligiendoZona(false)}
        />
      )}
      <header className={estilos.encabezado}>
        <Logo alto={40} />
        <h1 className={estilos.titulo}>Eventos cerca de ti</h1>
        <button
          type="button"
          className={estilos.zona}
          onClick={() => setEligiendoZona(true)}
          aria-label={`Zona: ${zona}. Cambiar zona`}
        >
          {usandoUbicacion ? <MdMyLocation aria-hidden="true" /> : <MdPlace aria-hidden="true" />}
          {zona}
          <MdArrowDropDown aria-hidden="true" size={24} />
        </button>
      </header>
      {avisoUbicacion && <Aviso texto={avisoUbicacion} tono="aviso" anunciar />}

      <div className={estilos.busqueda} role="search">
        <div style={{ position: 'relative' }}>
          <Campo
            etiqueta="Buscar evento o lugar"
            valor={filtros.busqueda}
            onCambio={(v) => cambiar({ ...filtros, busqueda: v })}
            iconoInicial={<MdSearch />}
            type="search"
            enterKeyHint="search"
            maxLength={120}
          />
          {filtros.busqueda && (
            <span style={{ position: 'absolute', right: 4, top: 4 }}>
              <BotonIcono etiqueta="Borrar búsqueda" onClick={() => cambiar({ ...filtros, busqueda: '' })}>
                <MdClose size={22} />
              </BotonIcono>
            </span>
          )}
        </div>
      </div>

      <div className={estilos.filtros} role="group" aria-label="Filtros">
        <ChipFiltro
          texto="Gratis"
          activo={filtros.precio === 'GRATIS'}
          onClick={() => cambiar({ ...filtros, precio: filtros.precio === 'GRATIS' ? 'TODOS' : 'GRATIS' })}
        />
        <ChipFiltro
          texto="De pago"
          activo={filtros.precio === 'DE_PAGO'}
          onClick={() => cambiar({ ...filtros, precio: filtros.precio === 'DE_PAGO' ? 'TODOS' : 'DE_PAGO' })}
        />
        <ChipMenu<FiltroFecha>
          etiqueta="Fecha"
          valorTexto={filtros.fecha === 'CUALQUIERA' ? null : ETIQUETAS_FECHA[filtros.fecha]}
          seleccion={filtros.fecha}
          opciones={(Object.keys(ETIQUETAS_FECHA) as FiltroFecha[]).map((f) => ({
            valor: f,
            texto: ETIQUETAS_FECHA[f],
          }))}
          onElegir={(f) => cambiar({ ...filtros, fecha: f ?? 'CUALQUIERA' })}
        />
        <ChipMenu<string>
          etiqueta="Lugar"
          valorTexto={filtros.lugar}
          seleccion={filtros.lugar}
          opciones={[{ valor: null, texto: 'Cualquier lugar' }, ...lugares.map((l) => ({ valor: l, texto: l }))]}
          onElegir={(l) => cambiar({ ...filtros, lugar: l })}
        />
        <ChipMenu<number>
          etiqueta="Tipo"
          valorTexto={categorias.data?.find((c) => c.id === filtros.categoriaId)?.nombre ?? null}
          seleccion={filtros.categoriaId}
          opciones={[
            { valor: null, texto: 'Todos los tipos' },
            ...(categorias.data ?? []).map((c) => ({ valor: c.id, texto: c.nombre })),
          ]}
          onElegir={(c) => cambiar({ ...filtros, categoriaId: c })}
        />
      </div>

      <div className={estilos.resumen}>
        <span aria-live="polite">{eventos.isSuccess ? resumen : ''}</span>
        {hayFiltros(filtros) && (
          <BotonTexto icono={<MdClose />} onClick={() => cambiar(FILTROS_VACIOS)}>
            {filtrosActivos(filtros) > 0 ? `Limpiar filtros (${filtrosActivos(filtros)})` : 'Limpiar búsqueda'}
          </BotonTexto>
        )}
      </div>

      {eventos.isPending && <IndicadorCarga texto="Buscando eventos…" />}
      {eventos.isError && (
        <Aviso
          texto={mensajeDeError(eventos.error)}
          tono="error"
          textoAccion="Reintentar"
          onAccion={() => eventos.refetch()}
          anunciar
        />
      )}

      {eventos.isSuccess && visibles.length > 0 && (
        <ul className={estilos.rejilla} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {visibles.map((evento) => (
            <li key={evento.id}>
              <TarjetaEvento evento={evento} />
            </li>
          ))}
        </ul>
      )}

      {eventos.hasNextPage && (
        <BotonSecundario
          className={estilos.cargarMas}
          onClick={() => eventos.fetchNextPage()}
          disabled={eventos.isFetchingNextPage}
        >
          {eventos.isFetchingNextPage ? 'Cargando…' : 'Ver más eventos'}
        </BotonSecundario>
      )}

      {eventos.isSuccess && visibles.length === 0 && (
        <EstadoVacio
          icono={<MdSearchOff size={56} />}
          titulo={hayFiltros(filtros) ? 'Nada coincide con tu búsqueda' : `No hay eventos publicados en ${zona}`}
          texto={
            hayFiltros(filtros)
              ? 'Prueba con otra palabra o quita algún filtro.'
              : 'El área de estudio de EnZona es Orizaba. Puedes explorar sus eventos o cambiar de zona.'
          }
          textoAccion={
            hayFiltros(filtros)
              ? 'Limpiar búsqueda y filtros'
              : usandoUbicacion || preferencias.ciudad !== CIUDAD_POR_DEFECTO
                ? 'Explorar Orizaba'
                : undefined
          }
          onAccion={() => (hayFiltros(filtros) ? cambiar(FILTROS_VACIOS) : elegirCiudad(CIUDAD_POR_DEFECTO))}
        />
      )}
    </Pagina>
  );
}
