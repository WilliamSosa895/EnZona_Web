import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MdConfirmationNumber, MdQrCode2 } from 'react-icons/md';
import { boletajeApi } from '@/api/boletaje';
import type { Boleto } from '@/api/tipos';
import { claves } from '@/app/consultas';
import { dia, hora, mesCorto } from '@/lib/fechas';
import { mensajeDeError } from '@/lib/errores';
import { Aviso, EstadoVacio, EtiquetaEstadoBoleto, IndicadorCarga, Pagina } from '@/ui';
import { descripcionBoleto, posicionEnOrden, separar } from './agrupar';
import estilos from './Boletos.module.css';

/**
 * Mis boletos (RF-12): los vigentes primero y después los usados, cancelados o expirados. Cada fila muestra
 * evento, fecha, tipo, asiento si aplica y el estado del BOLETO (que no es el estado del pago).
 */
export default function MisBoletosPage() {
  const navegar = useNavigate();
  const consulta = useQuery({ queryKey: claves.misBoletos, queryFn: ({ signal }) => boletajeApi.misBoletos(signal) });

  if (consulta.isPending)
    return (
      <Pagina titulo="Mis boletos">
        <IndicadorCarga texto="Cargando tus boletos…" />
      </Pagina>
    );
  if (consulta.isError)
    return (
      <Pagina titulo="Mis boletos">
        <Aviso
          tono="error"
          texto={mensajeDeError(consulta.error)}
          textoAccion="Reintentar"
          onAccion={() => void consulta.refetch()}
        />
      </Pagina>
    );

  const todos = consulta.data;
  const { vigentes, anteriores } = separar(todos);

  return (
    <Pagina titulo="Mis boletos">
      {todos.length === 0 && (
        <EstadoVacio
          icono={<MdConfirmationNumber size={56} />}
          titulo="Aún no tienes boletos"
          texto="Cuando confirmes asistencia o compres un boleto, aparecerá aquí con su código QR."
          textoAccion="Explorar eventos"
          onAccion={() => navegar('/')}
        />
      )}
      {vigentes.length > 0 && <Grupo titulo="Vigentes" boletos={vigentes} todos={todos} />}
      {anteriores.length > 0 && <Grupo titulo="Anteriores" boletos={anteriores} todos={todos} />}
    </Pagina>
  );
}

function Grupo({ titulo, boletos, todos }: { titulo: string; boletos: Boleto[]; todos: Boleto[] }) {
  const id = `grupo-${titulo.toLowerCase()}`;
  return (
    <section className={estilos.grupo} aria-labelledby={id}>
      <h2 id={id} className={estilos.subtitulo}>
        {titulo} · {boletos.length}
      </h2>
      <ul className={estilos.lista}>
        {boletos.map((b) => (
          <li key={b.id}>
            <FilaBoleto boleto={b} posicion={posicionEnOrden(b, todos)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Fila de boleto: bloque de fecha, datos y estado (TarjetaBoleto en Android). */
function FilaBoleto({ boleto, posicion }: { boleto: Boleto; posicion: { k: number; n: number } | null }) {
  const navegar = useNavigate();
  const vigente = boleto.estado === 'VALIDO';
  const detalle = descripcionBoleto(boleto);
  return (
    <button
      type="button"
      className={[estilos.fila, vigente ? '' : estilos.atenuada].join(' ')}
      onClick={() => navegar(`/boletos/${boleto.id}`)}
    >
      <span className={estilos.bloqueFecha} aria-hidden="true">
        <span className={estilos.bloqueDia}>{dia(boleto.fechaHoraInicio)}</span>
        <span className={estilos.bloqueMes}>{mesCorto(boleto.fechaHoraInicio)}</span>
      </span>
      <span className={estilos.filaTexto}>
        <strong className={estilos.filaNombre}>{boleto.eventoNombre}</strong>
        {posicion && (
          <span className={estilos.posicion}>
            Boleto {posicion.k} de {posicion.n}
          </span>
        )}
        <span className={estilos.filaApoyo}>
          {hora(boleto.fechaHoraInicio)} · {boleto.lugar}
        </span>
        {detalle && <span className={estilos.filaApoyo}>{detalle}</span>}
        <span className={estilos.filaEstado}>
          <EtiquetaEstadoBoleto estado={boleto.estado} />
        </span>
      </span>
      <MdQrCode2
        className={estilos.iconoQr}
        aria-label={vigente ? 'Ver código QR' : undefined}
        aria-hidden={!vigente}
      />
    </button>
  );
}
