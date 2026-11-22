import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { administracionApi } from '@/api/administracion';
import { eventosApi } from '@/api/eventos';
import type { Evento, Pagina, Reporte, UsuarioAdmin } from '@/api/tipos';
import { importeMxn, precio } from '@/lib/formato';
import { mensajeDeError } from '@/lib/errores';
import { Aviso, IndicadorCarga } from '@/ui';
import { calcularEstadisticas, type EstadisticasAdmin, type ParDato } from './estadisticas';
import estilos from './Resumen.module.css';

/** Máximo de elementos por página que admite la API. */
const TAMANO_PAGINA = 100;
/** Reportes que se piden a la vez, como en Android: no satura la API ni el pool de conexiones. */
const REPORTES_EN_PARALELO = 4;

async function todasLasPaginas<T>(pedir: (pagina: number) => Promise<Pagina<T>>): Promise<T[]> {
  const primera = await pedir(0);
  const resto = await Promise.all(
    Array.from({ length: Math.max(0, primera.totalPaginas - 1) }, (_, i) => pedir(i + 1)),
  );
  return [primera, ...resto].flatMap((p) => p.elementos);
}

async function cargarEstadisticas(senal: AbortSignal): Promise<EstadisticasAdmin> {
  const [usuarios, eventos] = await Promise.all([
    todasLasPaginas<UsuarioAdmin>((page) => administracionApi.usuarios({ page, size: TAMANO_PAGINA }, senal)),
    todasLasPaginas<Evento>((page) => administracionApi.eventos({ page, size: TAMANO_PAGINA }, senal)),
  ]);
  // Los borradores no tienen ventas: se piden los reportes del resto, de cuatro en cuatro.
  const conReporte = eventos.filter((e) => e.estado !== 'BORRADOR');
  const reportes: Reporte[] = [];
  for (let i = 0; i < conReporte.length; i += REPORTES_EN_PARALELO) {
    const grupo = await Promise.all(
      conReporte.slice(i, i + REPORTES_EN_PARALELO).map((e) => eventosApi.reporte(e.id, senal).catch(() => null)),
    );
    reportes.push(...grupo.filter((r): r is Reporte => r !== null));
  }
  return calcularEstadisticas(usuarios, eventos, reportes);
}

const entero = (n: number) => Math.round(n).toLocaleString('es-MX');
const porciento = (n: number) => `${Math.round(n)} %`;

/**
 * Pestaña «Resumen» de administración (RF-18, EstadisticasAdminScreen en Android): indicadores de la plataforma y
 * gráficas de cuentas, eventos, ingresos y ocupación. Cada gráfica es una lista con sus valores escritos, así se
 * lee igual con lector de pantalla, con el color desactivado o impresa.
 */
export function ResumenAdmin() {
  const consulta = useQuery({
    queryKey: ['admin', 'estadisticas'],
    queryFn: ({ signal }) => cargarEstadisticas(signal),
    staleTime: 60_000,
  });

  if (consulta.isPending) return <IndicadorCarga texto="Calculando estadísticas…" />;
  if (consulta.isError)
    return (
      <Aviso
        tono="error"
        texto={mensajeDeError(consulta.error)}
        textoAccion="Reintentar"
        onAccion={() => void consulta.refetch()}
      />
    );
  const e = consulta.data;

  return (
    <div className={estilos.resumen}>
      <dl className={estilos.indicadores}>
        <Indicador etiqueta="Usuarios" valor={entero(e.usuariosTotal)} />
        <Indicador etiqueta="Eventos" valor={entero(e.eventosTotal)} />
        <Indicador etiqueta="Ingresos" valor={precio(e.ingresosTotales)} />
        <Indicador etiqueta="Boletos emitidos" valor={entero(e.boletosEmitidos)} />
        <Indicador etiqueta="Accesos validados" valor={entero(e.accesosValidados)} />
        <Indicador etiqueta="Ocupación" valor={porciento(e.ocupacionGlobal)} />
      </dl>

      <Seccion titulo="Cuentas">
        <BarraSegmentada
          segmentos={[
            { etiqueta: 'Activas', cantidad: e.usuariosActivos, clase: estilos.activas },
            { etiqueta: 'Pendientes', cantidad: e.usuariosPendientes, clase: estilos.pendientes },
            { etiqueta: 'Bloqueadas', cantidad: e.usuariosBloqueados, clase: estilos.bloqueadas },
          ]}
        />
        <p className={estilos.nota}>
          Organizadores {e.organizadores} · Validadores {e.validadores} · Administradores {e.administradores}
        </p>
      </Seccion>

      <Seccion titulo="Eventos por estado">
        <BarrasHorizontales
          datos={[
            { etiqueta: 'Publicados', valor: e.eventosPublicados },
            { etiqueta: 'Borradores', valor: e.eventosBorrador },
            { etiqueta: 'Realizados', valor: e.eventosRealizados },
            { etiqueta: 'Cancelados', valor: e.eventosCancelados },
          ]}
          formato={entero}
        />
        <p className={estilos.nota}>
          Gratuitos {e.eventosGratuitos} · De pago {e.eventosDePago}
        </p>
      </Seccion>

      <Seccion titulo="Eventos por categoría">
        {e.eventosPorCategoria.length === 0 ? (
          <Vacio texto="Todavía no hay eventos." />
        ) : (
          <BarrasHorizontales datos={e.eventosPorCategoria} formato={entero} />
        )}
      </Seccion>

      <Seccion titulo="Eventos por mes de inicio">
        {e.eventosPorMes.length === 0 ? (
          <Vacio texto="Todavía no hay eventos." />
        ) : (
          <BarrasVerticales datos={e.eventosPorMes} />
        )}
      </Seccion>

      <Seccion titulo="Ingresos por evento">
        {e.ingresosPorEvento.length === 0 ? (
          <Vacio texto="Aún no hay ventas registradas." />
        ) : (
          <BarrasHorizontales datos={e.ingresosPorEvento} formato={precio} />
        )}
        <p className={estilos.nota}>
          {[
            `Total ${importeMxn(e.ingresosTotales)}`,
            e.reembolsado > 0 && `Reembolsado ${importeMxn(e.reembolsado)} · Neto ${importeMxn(e.ingresosNetos)}`,
            e.boletosCancelados > 0 && `${e.boletosCancelados} boletos cancelados`,
            e.boletosEmitidos > 0 && `Asistencia ${porciento(e.asistencia)} de los boletos emitidos`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </Seccion>

      <Seccion titulo="Ocupación de los eventos publicados">
        {e.ocupacionPorEvento.length === 0 ? (
          <Vacio texto="No hay eventos publicados." />
        ) : (
          <BarrasHorizontales datos={e.ocupacionPorEvento} formato={porciento} maximo={100} />
        )}
      </Seccion>
    </div>
  );
}

function Indicador({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className={estilos.indicador}>
      <dt>{etiqueta}</dt>
      <dd>{valor}</dd>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className={estilos.seccion} aria-label={titulo}>
      <h2 className={estilos.tituloSeccion}>{titulo}</h2>
      {children}
    </section>
  );
}

const Vacio = ({ texto }: { texto: string }) => <p className={estilos.nota}>{texto}</p>;

/** Barras horizontales proporcionales al valor mayor (o a `maximo`), con su etiqueta y su valor escritos. */
function BarrasHorizontales({
  datos,
  formato,
  maximo,
}: {
  datos: ParDato[];
  formato: (n: number) => string;
  maximo?: number;
}) {
  const tope = Math.max(maximo ?? 0, ...datos.map((d) => d.valor), 1);
  return (
    <ul className={estilos.horizontales}>
      {datos.map((d) => (
        <li key={d.etiqueta} title={`${d.etiqueta}: ${formato(d.valor)}`}>
          <span className={estilos.etiqueta}>{d.etiqueta}</span>
          <span className={estilos.pista} aria-hidden="true">
            <span
              className={estilos.barra} // Un cero no dibuja marca: una astilla mínima haría creer que hay algo.
              style={{ width: `${Math.min(100, (d.valor / tope) * 100)}%`, minWidth: d.valor > 0 ? 4 : 0 }}
            />
          </span>
          <span className={estilos.valor}>{formato(d.valor)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Barras verticales: los valores arriba y las etiquetas abajo, alineados por columna. */
function BarrasVerticales({ datos }: { datos: ParDato[] }) {
  const tope = Math.max(...datos.map((d) => d.valor), 1);
  return (
    <ul className={estilos.verticales}>
      {datos.map((d) => (
        <li key={d.etiqueta} title={`${d.etiqueta}: ${entero(d.valor)}`}>
          <span className={estilos.valor}>{entero(d.valor)}</span>
          <span className={estilos.columna} aria-hidden="true">
            <span
              className={estilos.barra}
              style={{ height: `${(d.valor / tope) * 100}%`, minHeight: d.valor > 0 ? 4 : 0 }}
            />
          </span>
          <span className={estilos.etiquetaMes}>{d.etiqueta}</span>
        </li>
      ))}
    </ul>
  );
}

interface Segmento {
  etiqueta: string;
  cantidad: number;
  clase: string;
}

/** Una barra dividida en proporción (cuentas activas, pendientes y bloqueadas) con su leyenda. */
function BarraSegmentada({ segmentos }: { segmentos: Segmento[] }) {
  const total = segmentos.reduce((s, x) => s + x.cantidad, 0);
  return (
    <>
      <div className={estilos.segmentada} aria-hidden="true">
        {total > 0 &&
          segmentos
            .filter((s) => s.cantidad > 0)
            .map((s) => (
              <span
                key={s.etiqueta}
                className={s.clase}
                style={{ flexGrow: s.cantidad }}
                title={`${s.etiqueta}: ${s.cantidad}`}
              />
            ))}
      </div>
      <ul className={estilos.leyenda}>
        {segmentos.map((s) => (
          <li key={s.etiqueta}>
            <span className={[estilos.muestra, s.clase].join(' ')} aria-hidden="true" />
            {s.etiqueta} {s.cantidad}
          </li>
        ))}
      </ul>
    </>
  );
}
