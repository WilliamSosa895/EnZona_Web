import { useId, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdArrowBack } from 'react-icons/md';
import { BotonIcono, BotonSecundario } from './Boton';
import estilos from './Estados.module.css';

interface BarraSuperiorProps {
  titulo: string;
  /** Acción de volver; si es true usa el historial del navegador. */
  volver?: (() => void) | true;
  volverHabilitado?: boolean;
  acciones?: ReactNode;
}

/** Barra superior con botón de volver; el título va en una línea con elipsis (BarraSuperiorEnZona). */
export function BarraSuperior({ titulo, volver, volverHabilitado = true, acciones }: BarraSuperiorProps) {
  const navegar = useNavigate();
  const alVolver = volver === true ? () => navegar(-1) : volver;
  return (
    <header className={estilos.barra}>
      {alVolver && (
        <BotonIcono etiqueta="Volver" onClick={alVolver} disabled={!volverHabilitado}>
          <MdArrowBack size={24} />
        </BotonIcono>
      )}
      <h1 className={estilos.barraTitulo}>{titulo}</h1>
      {acciones && <div className={estilos.barraAcciones}>{acciones}</div>}
    </header>
  );
}

interface EstadoVacioProps {
  icono: ReactNode;
  titulo: string;
  texto: string;
  textoAccion?: string;
  onAccion?: () => void;
}

/** Estado vacío: icono, título, explicación y una acción para salir de él. */
export function EstadoVacio({ icono, titulo, texto, textoAccion, onAccion }: EstadoVacioProps) {
  return (
    <div className={estilos.vacio}>
      <span aria-hidden="true">{icono}</span>
      <h2 className={estilos.vacioTitulo}>{titulo}</h2>
      <p className={estilos.vacioTexto}>{texto}</p>
      {textoAccion && onAccion && (
        <BotonSecundario className={estilos.vacioAccion} onClick={onAccion}>
          {textoAccion}
        </BotonSecundario>
      )}
    </div>
  );
}

/** Indicador de carga con texto, centrado. */
export function IndicadorCarga({ texto }: { texto: string }) {
  return (
    <div className={estilos.carga} role="status" aria-live="polite">
      <span className={estilos.girando} aria-hidden="true" />
      {texto}
    </div>
  );
}

interface SelectorProps<T extends string | number> {
  etiqueta: string;
  opciones: { valor: T; texto: string }[];
  valor: T | null;
  onCambio: (valor: T) => void;
  marcador?: string;
  deshabilitado?: boolean;
}

/** Selector desplegable accesible de 48 px (SelectorDesplegable). */
export function Selector<T extends string | number>({
  etiqueta,
  opciones,
  valor,
  onCambio,
  marcador = 'Elegir',
  deshabilitado,
}: SelectorProps<T>) {
  const id = useId();
  return (
    <div className={estilos.selector}>
      <label htmlFor={id} className={estilos.selectorEtiqueta}>
        {etiqueta}
      </label>
      <select
        id={id}
        className={estilos.select}
        value={valor === null ? '' : String(valor)}
        disabled={deshabilitado || opciones.length === 0}
        onChange={(e) => {
          const elegida = opciones.find((o) => String(o.valor) === e.target.value);
          if (elegida) onCambio(elegida.valor);
        }}
      >
        {valor === null && (
          <option value="" disabled>
            {marcador}
          </option>
        )}
        {opciones.map((o) => (
          <option key={String(o.valor)} value={String(o.valor)}>
            {o.texto}
          </option>
        ))}
      </select>
    </div>
  );
}

interface InterruptorProps {
  texto: ReactNode;
  detalle?: ReactNode;
  activo: boolean;
  onCambio: (activo: boolean) => void;
  deshabilitado?: boolean;
  icono?: ReactNode;
}

/** Interruptor (Switch) con texto y detalle; todo el renglón es clicable. */
export function Interruptor({ texto, detalle, activo, onCambio, deshabilitado, icono }: InterruptorProps) {
  return (
    <label className={estilos.interruptor}>
      {icono}
      <span className={estilos.interruptorTexto} style={{ flex: 1 }}>
        {texto}
        {detalle && <span className={estilos.interruptorDetalle}>{detalle}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={activo}
        disabled={deshabilitado}
        onChange={(e) => onCambio(e.target.checked)}
      />
      <span className={estilos.pista} aria-hidden="true" />
    </label>
  );
}
