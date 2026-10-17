import { Link, useNavigate } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import { MdAdd, MdEvent } from 'react-icons/md';
import { eventosApi } from '@/api/eventos';
import type { Evento } from '@/api/tipos';
import { claves } from '@/app/consultas';
import { useSesion } from '@/auth/useSesion';
import { corto } from '@/lib/fechas';
import { aNumero, precio } from '@/lib/formato';
import { mensajeDeError } from '@/lib/errores';
import { Aviso, EstadoVacio, EtiquetaEstadoEvento, IndicadorCarga, Pagina } from '@/ui';
import { vendidosDe } from './calculos';
import { BarraProgreso, Metrica } from './Metricas';
import estilos from './Organizador.module.css';

/** Panel del organizador: sus eventos con conteos (RF-17, OrganizerHomeScreen en Android). */
export default function MisEventosPage() {
  const navegar = useNavigate();
  const { usuario } = useSesion();
  const eventos = useQuery({
    queryKey: claves.eventosOrganizador,
    queryFn: ({ signal }) => eventosApi.delOrganizador(signal),
  });
  const lista = eventos.data ?? [];
  // Los ingresos salen del reporte de cada evento con ventas posibles (la lista no los trae).
  const reportes = useQueries({
    queries: lista
      .filter((e) => e.esDePago && e.estado !== 'BORRADOR')
      .map((e) => ({
        queryKey: claves.reporte(e.id),
        queryFn: ({ signal }: { signal: AbortSignal }) => eventosApi.reporte(e.id, signal),
        staleTime: 60_000,
      })),
  });
  const ingresos = reportes.reduce((s, r) => s + aNumero(r.data?.ingresos), 0);
  const cargandoIngresos = reportes.some((r) => r.isPending);

  const publicados = lista.filter((e) => e.estado === 'PUBLICADO').length;
  const asistentes = lista.filter((e) => e.estado !== 'CANCELADO').reduce((s, e) => s + vendidosDe(e), 0);

  return (
    <Pagina titulo="Mis eventos" subtitulo={usuario?.nombre}>
      {eventos.isPending && <IndicadorCarga texto="Cargando tus eventos…" />}
      {eventos.isError && (
        <Aviso
          tono="error"
          texto={mensajeDeError(eventos.error)}
          textoAccion="Reintentar"
          onAccion={() => void eventos.refetch()}
        />
      )}
      {eventos.isSuccess && (
        <>
          <div className={estilos.metricas}>
            <Metrica etiqueta="Publicados" valor={String(publicados)} />
            <Metrica etiqueta="Asistentes" valor={String(asistentes)} />
            <Metrica etiqueta="Ingresos" valor={cargandoIngresos ? '…' : precio(ingresos)} />
          </div>
          {lista.length === 0 ? (
            <EstadoVacio
              icono={<MdEvent size={56} />}
              titulo="Aún no has creado eventos"
              texto="Usa «Nuevo evento» para publicar el primero. Puedes guardarlo como borrador y publicarlo después."
              textoAccion="Nuevo evento"
              onAccion={() => navegar('/organizador/eventos/nuevo')}
            />
          ) : (
            <ul className={estilos.lista}>
              {lista.map((e) => (
                <li key={e.id}>
                  <TarjetaEventoOrganizador evento={e} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <Link to="/organizador/eventos/nuevo" className={estilos.fab}>
        <MdAdd aria-hidden="true" />
        Nuevo evento
      </Link>
    </Pagina>
  );
}

function TarjetaEventoOrganizador({ evento }: { evento: Evento }) {
  const vendidos = vendidosDe(evento);
  return (
    <Link to={`/organizador/eventos/${evento.id}`} className={estilos.tarjetaEvento}>
      <span className={estilos.tarjetaCabecera}>
        <strong>{evento.nombre}</strong>
        <EtiquetaEstadoEvento estado={evento.estado} />
      </span>
      <span className={estilos.apoyo}>
        {evento.lugar} · {corto(evento.fechaHoraInicio)}
      </span>
      <BarraProgreso
        titulo="Ocupación"
        detalle={`${vendidos} de ${evento.aforo} lugares · ${evento.disponibles} disponibles`}
        valor={evento.aforo ? vendidos / evento.aforo : 0}
      />
    </Link>
  );
}
