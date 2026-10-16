import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MdAdd, MdArrowDropDown, MdCheck, MdKeyboardArrowRight, MdRemove } from 'react-icons/md';
import logo from '@/assets/enzona_logo.png';
import { Boton, BotonIcono } from './Boton';
import estilos from './Controles.module.css';

// ---------------------------------------------------------------- cantidad

interface SelectorCantidadProps {
  cantidad: number;
  maximo: number;
  onCambio: (cantidad: number) => void;
  etiqueta?: string;
  habilitado?: boolean;
}

/**
 * Selector de cantidad de boletos con botones de 48 px. El máximo lo fija la disponibilidad real del evento
 * (cupo, existencias del tipo y límite por orden de la API), no un límite inventado.
 */
export function SelectorCantidad({
  cantidad,
  maximo,
  onCambio,
  etiqueta = 'Cantidad de boletos',
  habilitado = true,
}: SelectorCantidadProps) {
  return (
    <div className={estilos.cantidad}>
      <div className={estilos.cantidadTexto}>
        <span className={estilos.cantidadTitulo}>{etiqueta}</span>
        <span className={estilos.cantidadDetalle}>
          {maximo <= 0 ? 'Sin disponibilidad' : `Hasta ${maximo} disponibles`}
        </span>
      </div>
      <BotonIcono
        etiqueta="Quitar un boleto"
        tonal
        disabled={!habilitado || cantidad <= 1}
        onClick={() => onCambio(Math.max(1, cantidad - 1))}
      >
        <MdRemove size={22} />
      </BotonIcono>
      <output className={estilos.cantidadValor} aria-live="polite" aria-label={`${cantidad} boletos`}>
        {cantidad}
      </output>
      <BotonIcono
        etiqueta="Agregar un boleto"
        tonal
        disabled={!habilitado || cantidad >= maximo}
        onClick={() => onCambio(Math.min(maximo, cantidad + 1))}
      >
        <MdAdd size={22} />
      </BotonIcono>
    </div>
  );
}

// ---------------------------------------------------------------- barra de acción

interface BarraAccionProps {
  textoBoton: string;
  resumen?: string | null;
  habilitado: boolean;
  onClick: () => void;
  cargando?: boolean;
  destacado?: boolean;
  aviso?: ReactNode;
}

/** Barra inferior fija con el resumen del precio y la única acción principal (BarraAccion). */
export function BarraAccion({
  textoBoton,
  resumen,
  habilitado,
  onClick,
  cargando = false,
  destacado = true,
  aviso,
}: BarraAccionProps) {
  return (
    <>
      <div className={estilos.relleno} aria-hidden="true" />
      <div className={estilos.barraAccion}>
        <div className={estilos.barraAccionInterior}>
          {aviso}
          {resumen && (
            <p className={estilos.resumen} aria-live="polite">
              {resumen}
            </p>
          )}
          <Boton
            variante={destacado ? 'destacado' : 'normal'}
            disabled={!habilitado}
            cargando={cargando}
            onClick={onClick}
          >
            {textoBoton}
          </Boton>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- ajustes

export function TituloSeccion({ children }: { children: ReactNode }) {
  return <h2 className={estilos.tituloSeccion}>{children}</h2>;
}

export function GrupoAjustes({ children }: { children: ReactNode }) {
  return <div className={estilos.grupo}>{children}</div>;
}

export function Separador() {
  return <hr className={estilos.separador} />;
}

interface FilaAjusteProps {
  icono: ReactNode;
  texto: string;
  descripcion?: string;
  valor?: string;
  color?: string;
  a?: string;
  onClick?: () => void;
  mostrarFlecha?: boolean;
}

/** Fila navegable de ajustes: icono, texto, valor opcional y flecha. */
export function FilaAjuste({ icono, texto, descripcion, valor, color, a, onClick, mostrarFlecha }: FilaAjusteProps) {
  const contenido = (
    <>
      <span aria-hidden="true" style={{ color: color ?? 'var(--on-surface-variant)', display: 'grid' }}>
        {icono}
      </span>
      <span className={estilos.filaTexto} style={color ? { color } : undefined}>
        {texto}
        {descripcion && <span className={estilos.filaDescripcion}>{descripcion}</span>}
      </span>
      {valor && <span className={estilos.filaValor}>{valor}</span>}
      {(mostrarFlecha ?? (a !== undefined || onClick !== undefined)) && (
        <MdKeyboardArrowRight className={estilos.flecha} aria-hidden="true" />
      )}
    </>
  );
  if (a)
    return (
      <Link to={a} className={estilos.fila}>
        {contenido}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" className={estilos.fila} onClick={onClick}>
        {contenido}
      </button>
    );
  return <div className={estilos.fila}>{contenido}</div>;
}

// ---------------------------------------------------------------- chips de filtro

interface ChipFiltroProps {
  texto: string;
  activo: boolean;
  onClick: () => void;
}

/** Chip de filtro (FilterChip): palomita cuando está activo. */
export function ChipFiltro({ texto, activo, onClick }: ChipFiltroProps) {
  return (
    <button
      type="button"
      className={[estilos.chip, activo ? estilos.chipActivo : ''].join(' ')}
      aria-pressed={activo}
      onClick={onClick}
    >
      {activo && <MdCheck aria-hidden="true" />}
      {texto}
    </button>
  );
}

interface ChipMenuProps<T extends string | number> {
  etiqueta: string;
  /** Texto de la opción activa; null si el filtro está apagado (el chip muestra la etiqueta). */
  valorTexto: string | null;
  opciones: { valor: T | null; texto: string }[];
  seleccion: T | null;
  onElegir: (valor: T | null) => void;
}

/** Chip desplegable: muestra la opción activa en el propio chip para que el filtro sea visible. */
export function ChipMenu<T extends string | number>({
  etiqueta,
  valorTexto,
  opciones,
  seleccion,
  onElegir,
}: ChipMenuProps<T>) {
  const [abierto, setAbierto] = useState(false);
  const idMenu = useId();
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false);
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', escape);
    contenedor.current?.querySelector<HTMLButtonElement>('[role="menuitemradio"]')?.focus();
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', escape);
    };
  }, [abierto]);

  return (
    <div className={estilos.menuContenedor} ref={contenedor}>
      <button
        type="button"
        className={[estilos.chip, valorTexto ? estilos.chipActivo : ''].join(' ')}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={idMenu}
        aria-label={`${etiqueta}: ${valorTexto ?? 'sin filtro'}`}
        onClick={() => setAbierto((v) => !v)}
      >
        {valorTexto && <MdCheck aria-hidden="true" />}
        {valorTexto ?? etiqueta}
        <MdArrowDropDown aria-hidden="true" />
      </button>
      {abierto && (
        <ul className={estilos.menu} id={idMenu} role="menu" aria-label={etiqueta}>
          {opciones.map((o) => (
            <li key={String(o.valor)} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={o.valor === seleccion}
                className={estilos.menuOpcion}
                onClick={() => {
                  onElegir(o.valor);
                  setAbierto(false);
                }}
              >
                {o.texto}
                {o.valor === seleccion && <MdCheck aria-label="Seleccionado" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- marca y estructura

export function Logo({ alto = 40 }: { alto?: number }) {
  return (
    <img src={logo} alt="EnZona" className={estilos.logo} style={{ height: alto }} width={alto * 3.47} height={alto} />
  );
}

export function Avatar({ nombre }: { nombre: string }) {
  return (
    <span className={estilos.avatar} aria-hidden="true">
      {nombre.trim().charAt(0).toLocaleUpperCase('es-MX') || '?'}
    </span>
  );
}

interface PaginaProps {
  children: ReactNode;
  angosta?: boolean;
  titulo?: string;
  subtitulo?: ReactNode;
  acciones?: ReactNode;
}

/** Contenedor de página con ancho máximo y margen lateral; el encabezado es opcional. */
export function Pagina({ children, angosta, titulo, subtitulo, acciones }: PaginaProps) {
  return (
    <div className={[estilos.pagina, angosta ? estilos.angosta : ''].join(' ')}>
      {titulo && (
        <div className={estilos.encabezado} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className={estilos.tituloPagina}>{titulo}</h1>
            {subtitulo && <p className={estilos.subtituloPagina}>{subtitulo}</p>}
          </div>
          {acciones}
        </div>
      )}
      {children}
    </div>
  );
}

/** Columna con separación uniforme entre elementos. */
export function Pila({ children, separacion = 16 }: { children: ReactNode; separacion?: number }) {
  return (
    <div className={estilos.pila} style={{ gap: separacion }}>
      {children}
    </div>
  );
}
