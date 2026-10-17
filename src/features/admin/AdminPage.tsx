import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MdSearch } from 'react-icons/md';
import { administracionApi } from '@/api/administracion';
import type { EstadoEvento, EstadoUsuario, Evento, UsuarioAdmin } from '@/api/tipos';
import { claves } from '@/app/consultas';
import { NOMBRE_ROL } from '@/auth/roles';
import { useSesion } from '@/auth/useSesion';
import { corto } from '@/lib/fechas';
import { mensajeDeError } from '@/lib/errores';
import { useDemora } from '@/lib/useDemora';
import { DialogoCancelarEvento } from '@/features/organizador/DialogoCancelarEvento';
import { vendidosDe } from '@/features/organizador/calculos';
import {
  Aviso,
  BotonSecundario,
  BotonTexto,
  Campo,
  ChipFiltro,
  EstadoVacio,
  EtiquetaEstadoEvento,
  IndicadorCarga,
  Pagina,
} from '@/ui';
import estilos from './Admin.module.css';

const TAMANO = 20;

type Pestana = 'usuarios' | 'eventos';

/**
 * Administración de la plataforma (RF-18, AdminScreen en Android): usuarios y eventos. La asignación de roles
 * y el cambio de asientos desde aquí quedaron fuera del alcance de la API (docs/COHERENCIA_APP_ANDROID.md).
 */
export default function AdminPage() {
  const [pestana, setPestana] = useState<Pestana>('usuarios');
  const id = useId();
  const pestanas: { clave: Pestana; texto: string }[] = [
    { clave: 'usuarios', texto: 'Usuarios' },
    { clave: 'eventos', texto: 'Eventos' },
  ];

  // Navegación de pestañas con flechas (patrón WAI-ARIA Tabs).
  function alTeclear(e: KeyboardEvent) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const siguiente = pestana === 'usuarios' ? 'eventos' : 'usuarios';
    setPestana(siguiente);
    document.getElementById(`${id}-${siguiente}`)?.focus();
  }

  return (
    <Pagina titulo="Administración" subtitulo="Usuarios y eventos de la plataforma">
      <div role="tablist" aria-label="Secciones de administración" className={estilos.pestanas}>
        {pestanas.map((p) => (
          <button
            key={p.clave}
            id={`${id}-${p.clave}`}
            type="button"
            role="tab"
            aria-selected={pestana === p.clave}
            aria-controls={`${id}-panel-${p.clave}`}
            tabIndex={pestana === p.clave ? 0 : -1}
            className={[estilos.pestana, pestana === p.clave ? estilos.pestanaActiva : ''].join(' ')}
            onClick={() => setPestana(p.clave)}
            onKeyDown={alTeclear}
          >
            {p.texto}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${id}-panel-${pestana}`} aria-labelledby={`${id}-${pestana}`} className={estilos.panel}>
        {pestana === 'usuarios' ? <Usuarios /> : <Eventos />}
      </div>
    </Pagina>
  );
}

// ---------------------------------------------------------------- usuarios

const ESTADOS_USUARIO: { valor: EstadoUsuario | null; texto: string }[] = [
  { valor: null, texto: 'Todos' },
  { valor: 'ACTIVO', texto: 'Activos' },
  { valor: 'PENDIENTE', texto: 'Pendientes' },
  { valor: 'BLOQUEADO', texto: 'Bloqueados' },
];

function Usuarios() {
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState<EstadoUsuario | null>(null);
  const busqueda = useDemora(q.trim());
  const filtro = { q: busqueda || undefined, estado: estado ?? undefined };
  const usuarios = useInfiniteQuery({
    queryKey: claves.adminUsuarios(filtro),
    queryFn: ({ pageParam, signal }) =>
      administracionApi.usuarios({ ...filtro, page: pageParam, size: TAMANO }, signal),
    initialPageParam: 0,
    getNextPageParam: (u) => (u.pagina + 1 < u.totalPaginas ? u.pagina + 1 : undefined),
  });
  const lista = usuarios.data?.pages.flatMap((p) => p.elementos) ?? [];

  return (
    <>
      <div className={estilos.filtros}>
        <Campo
          etiqueta="Buscar por nombre o correo"
          valor={q}
          onCambio={setQ}
          type="search"
          iconoInicial={<MdSearch />}
        />
        <div className={estilos.chips} role="group" aria-label="Filtrar por estado">
          {ESTADOS_USUARIO.map((e) => (
            <ChipFiltro key={e.texto} texto={e.texto} activo={estado === e.valor} onClick={() => setEstado(e.valor)} />
          ))}
        </div>
      </div>
      {usuarios.isPending && <IndicadorCarga texto="Cargando usuarios…" />}
      {usuarios.isError && <Aviso tono="error" texto={mensajeDeError(usuarios.error)} />}
      {usuarios.isSuccess && lista.length === 0 && (
        <EstadoVacio
          icono={<MdSearch size={56} />}
          titulo="Sin resultados"
          texto="Ningún usuario coincide con el filtro."
        />
      )}
      {usuarios.isSuccess && lista.length > 0 && (
        <p className={estilos.total} aria-live="polite">
          {usuarios.data.pages[0].total === 1 ? '1 usuario' : `${usuarios.data.pages[0].total} usuarios`}
        </p>
      )}
      <ul className={estilos.lista}>
        {lista.map((u) => (
          <li key={u.id}>
            <TarjetaUsuario usuario={u} />
          </li>
        ))}
      </ul>
      {usuarios.hasNextPage && (
        <BotonSecundario onClick={() => void usuarios.fetchNextPage()} disabled={usuarios.isFetchingNextPage}>
          {usuarios.isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
        </BotonSecundario>
      )}
    </>
  );
}

const TEXTO_ESTADO: Record<EstadoUsuario, string> = {
  ACTIVO: 'Activo',
  PENDIENTE: 'Pendiente',
  BLOQUEADO: 'Bloqueado',
};

function TarjetaUsuario({ usuario }: { usuario: UsuarioAdmin }) {
  const { usuario: yo } = useSesion();
  const consultas = useQueryClient();
  const esPropio = yo?.id === usuario.id;
  const bloqueado = usuario.estado === 'BLOQUEADO';
  const cambio = useMutation({
    mutationFn: () => administracionApi.cambiarEstado(usuario.id, bloqueado ? 'ACTIVO' : 'BLOQUEADO'),
    onSuccess: () => void consultas.invalidateQueries({ queryKey: ['admin', 'usuarios'] }),
  });

  return (
    <article className={estilos.tarjeta} aria-label={usuario.nombre}>
      <div className={estilos.cabecera}>
        <div>
          <strong>{usuario.nombre}</strong>
          <span>{usuario.correo}</span>
          {usuario.telefono && <span>{usuario.telefono}</span>}
        </div>
        <span className={[estilos.estado, estilos[`estado${usuario.estado}`]].join(' ')}>
          {TEXTO_ESTADO[usuario.estado]}
        </span>
      </div>
      <ul className={estilos.roles} aria-label="Roles">
        {usuario.roles.map((r) => (
          <li key={r}>{NOMBRE_ROL[r]}</li>
        ))}
      </ul>
      <p className={estilos.apoyo}>
        Registro: {corto(usuario.fechaRegistro)} ·{' '}
        {usuario.correoVerificado ? 'correo verificado' : 'correo sin verificar'}
      </p>
      {esPropio ? (
        <p className={estilos.apoyo}>Es tu propia cuenta: no puedes bloquearte.</p>
      ) : (
        usuario.estado !== 'PENDIENTE' && (
          <BotonTexto
            tono={bloqueado ? 'enlace' : 'peligro'}
            disabled={cambio.isPending}
            onClick={() => cambio.mutate()}
          >
            {cambio.isPending ? 'Guardando…' : bloqueado ? 'Desbloquear cuenta' : 'Bloquear cuenta'}
          </BotonTexto>
        )
      )}
      {cambio.isError && <Aviso tono="error" texto={mensajeDeError(cambio.error)} anunciar />}
    </article>
  );
}

// ---------------------------------------------------------------- eventos

const ESTADOS_EVENTO: { valor: EstadoEvento | null; texto: string }[] = [
  { valor: null, texto: 'Todos' },
  { valor: 'PUBLICADO', texto: 'Publicados' },
  { valor: 'BORRADOR', texto: 'Borradores' },
  { valor: 'REALIZADO', texto: 'Realizados' },
  { valor: 'CANCELADO', texto: 'Cancelados' },
];

function Eventos() {
  const [estado, setEstado] = useState<EstadoEvento | null>(null);
  const filtro = { estado: estado ?? undefined };
  const eventos = useInfiniteQuery({
    queryKey: claves.adminEventos(filtro),
    queryFn: ({ pageParam, signal }) => administracionApi.eventos({ ...filtro, page: pageParam, size: TAMANO }, signal),
    initialPageParam: 0,
    getNextPageParam: (u) => (u.pagina + 1 < u.totalPaginas ? u.pagina + 1 : undefined),
  });
  // La API de eventos solo trae el id del organizador: se resuelve el nombre con la lista de usuarios.
  const usuarios = useQuery({
    queryKey: claves.adminUsuarios({ todos: true }),
    queryFn: ({ signal }) => administracionApi.usuarios({ size: 200 }, signal),
    staleTime: 60_000,
  });
  const nombres = useMemo(
    () => new Map((usuarios.data?.elementos ?? []).map((u) => [u.id, u.nombre])),
    [usuarios.data],
  );
  const lista = eventos.data?.pages.flatMap((p) => p.elementos) ?? [];

  return (
    <>
      <div className={estilos.chips} role="group" aria-label="Filtrar por estado">
        {ESTADOS_EVENTO.map((e) => (
          <ChipFiltro key={e.texto} texto={e.texto} activo={estado === e.valor} onClick={() => setEstado(e.valor)} />
        ))}
      </div>
      {eventos.isPending && <IndicadorCarga texto="Cargando eventos…" />}
      {eventos.isError && <Aviso tono="error" texto={mensajeDeError(eventos.error)} />}
      {eventos.isSuccess && lista.length === 0 && (
        <EstadoVacio icono={<MdSearch size={56} />} titulo="Sin eventos" texto="No hay eventos con ese estado." />
      )}
      <ul className={estilos.lista}>
        {lista.map((e) => (
          <li key={e.id}>
            <TarjetaEvento evento={e} organizador={nombres.get(e.organizadorId) ?? `Usuario #${e.organizadorId}`} />
          </li>
        ))}
      </ul>
      {eventos.hasNextPage && (
        <BotonSecundario onClick={() => void eventos.fetchNextPage()} disabled={eventos.isFetchingNextPage}>
          {eventos.isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
        </BotonSecundario>
      )}
    </>
  );
}

function TarjetaEvento({ evento, organizador }: { evento: Evento; organizador: string }) {
  const consultas = useQueryClient();
  const [cancelando, setCancelando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const cancelable = evento.estado === 'PUBLICADO' || evento.estado === 'BORRADOR';

  return (
    <article className={estilos.tarjeta} aria-label={evento.nombre}>
      {cancelando && (
        <DialogoCancelarEvento
          eventoId={evento.id}
          nombreEvento={evento.nombre}
          administrativa
          onCerrar={() => setCancelando(false)}
          onCancelado={(r) => {
            setCancelando(false);
            setAviso(`Evento cancelado. Se anularon ${r.boletosAnulados} boletos.`);
            void consultas.invalidateQueries({ queryKey: ['admin', 'eventos'] });
            void consultas.invalidateQueries({ queryKey: ['eventos'] });
          }}
        />
      )}
      <div className={estilos.cabecera}>
        <div>
          <strong>{evento.nombre}</strong>
          <span>Organiza: {organizador}</span>
          <span>
            {evento.lugar} · {corto(evento.fechaHoraInicio)} · {vendidosDe(evento)}/{evento.aforo} lugares
          </span>
        </div>
        <EtiquetaEstadoEvento estado={evento.estado} />
      </div>
      {evento.estado === 'CANCELADO' && (
        <p className={estilos.cancelado}>
          Cancelado{evento.fechaCancelacion ? ` el ${corto(evento.fechaCancelacion)}` : ''}
          {evento.motivoCancelacion ? ` · ${evento.motivoCancelacion}` : ''}
        </p>
      )}
      {cancelable && (
        <BotonTexto tono="peligro" onClick={() => setCancelando(true)}>
          Cancelar evento
        </BotonTexto>
      )}
      {aviso && <Aviso tono="exito" texto={aviso} anunciar />}
    </article>
  );
}
