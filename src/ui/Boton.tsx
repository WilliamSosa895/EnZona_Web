import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import estilos from './Boton.module.css';

type Variante = 'normal' | 'destacado' | 'peligro';

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Coral con texto tinta (comprar, confirmar, publicar); normal = azul marino con blanco. */
  variante?: Variante;
  /** Muestra un indicador y bloquea el botón: evita dobles envíos (no sustituye la idempotencia del servidor). */
  cargando?: boolean;
  icono?: ReactNode;
}

/** Botón principal de la marca (píldora de 52 px), equivalente a BotonEnZona en Android. */
export function Boton({
  variante = 'normal',
  cargando = false,
  icono,
  children,
  disabled,
  className,
  ...resto
}: BotonProps) {
  return (
    <button
      type="button"
      {...resto}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={[estilos.boton, estilos[variante], className].filter(Boolean).join(' ')}
    >
      {cargando ? <span className={estilos.girando} aria-hidden="true" /> : icono}
      {children}
    </button>
  );
}

interface SecundarioProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icono?: ReactNode;
}

/** Botón secundario (contorno, píldora de 48 px) para acciones alternas a la principal. */
export function BotonSecundario({ icono, children, className, ...resto }: SecundarioProps) {
  return (
    <button type="button" {...resto} className={[estilos.secundario, className].filter(Boolean).join(' ')}>
      {icono}
      {children}
    </button>
  );
}

/** Enlace con aspecto de botón secundario (navegación). */
export function EnlaceSecundario({ icono, children, className, ...resto }: LinkProps & { icono?: ReactNode }) {
  return (
    <Link {...resto} className={[estilos.secundario, className].filter(Boolean).join(' ')}>
      {icono}
      {children}
    </Link>
  );
}

/** Enlace con aspecto de botón principal. */
export function EnlaceBoton({ variante = 'normal', className, ...resto }: LinkProps & { variante?: Variante }) {
  return <Link {...resto} className={[estilos.boton, estilos[variante], className].filter(Boolean).join(' ')} />;
}

interface TextoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tono?: 'enlace' | 'neutro' | 'peligro';
  icono?: ReactNode;
}

/** Botón de texto (TextButton). */
export function BotonTexto({ tono = 'enlace', icono, children, className, ...resto }: TextoProps) {
  const clase = tono === 'neutro' ? estilos.textoNeutro : tono === 'peligro' ? estilos.textoPeligro : '';
  return (
    <button type="button" {...resto} className={[estilos.texto, clase, className].filter(Boolean).join(' ')}>
      {icono}
      {children}
    </button>
  );
}

interface IconoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Texto accesible obligatorio: el botón solo muestra un icono. */
  etiqueta: string;
  tonal?: boolean;
}

/** Botón de icono de 48 px (IconButton / FilledTonalIconButton). */
export function BotonIcono({ etiqueta, tonal = false, children, className, ...resto }: IconoProps) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      {...resto}
      className={[estilos.icono, tonal ? estilos.iconoTonal : '', className].filter(Boolean).join(' ')}
    >
      {children}
    </button>
  );
}
