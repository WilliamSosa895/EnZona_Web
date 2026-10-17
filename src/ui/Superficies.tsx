import type { HTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MdErrorOutline, MdInfo, MdScience, MdWarningAmber } from 'react-icons/md';
import type { Tono } from './tono';
import estilos from './Superficies.module.css';

const claseTono: Record<Tono, string> = {
  neutro: estilos.neutro,
  marca: estilos.marca,
  destacado: estilos.destacado,
  exito: estilos.exito,
  aviso: estilos.avisoTono,
  error: estilos.error,
};

interface TarjetaProps extends HTMLAttributes<HTMLElement> {
  sinRelleno?: boolean;
  /** Si recibe `onClick`, toda la tarjeta es un botón; con `a`, un enlace. */
  onClick?: () => void;
  a?: string;
  etiquetaAccesible?: string;
}

/** Tarjeta de la marca: superficie blanca con esquinas grandes (TarjetaEnZona). */
export function Tarjeta({ sinRelleno, onClick, a, etiquetaAccesible, className, children, ...resto }: TarjetaProps) {
  const clase = [estilos.tarjeta, sinRelleno ? estilos.sinRelleno : '', className].filter(Boolean).join(' ');
  if (a) {
    return (
      <Link to={a} className={clase} aria-label={etiquetaAccesible}>
        {children}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" className={clase} onClick={onClick} aria-label={etiquetaAccesible}>
        {children}
      </button>
    );
  }
  return (
    <section className={clase} {...resto}>
      {children}
    </section>
  );
}

interface AvisoProps {
  texto: ReactNode;
  tono?: Tono;
  titulo?: string;
  icono?: ReactNode;
  textoAccion?: string;
  onAccion?: () => void;
  /** Anuncia el aviso a lectores de pantalla (errores y resultados). */
  anunciar?: boolean;
}

/** Aviso en línea con tono semántico: icono + texto y acción opcional. */
export function Aviso({ texto, tono = 'neutro', titulo, icono, textoAccion, onAccion, anunciar }: AvisoProps) {
  const iconoFinal =
    icono ?? (tono === 'error' ? <MdErrorOutline /> : tono === 'aviso' ? <MdWarningAmber /> : <MdInfo />);
  const rol = anunciar ? (tono === 'error' ? 'alert' : 'status') : undefined;
  return (
    <div className={[estilos.aviso, claseTono[tono]].join(' ')} role={rol}>
      <span aria-hidden="true">{iconoFinal}</span>
      <div className={estilos.avisoCuerpo}>
        {titulo && <strong className={estilos.avisoTitulo}>{titulo}</strong>}
        <span>{texto}</span>
        {textoAccion && onAccion && (
          <button type="button" className={estilos.avisoAccion} onClick={onAccion}>
            {textoAccion}
          </button>
        )}
      </div>
    </div>
  );
}

/** Marco para controles de demostración (pagos simulados): borde discontinuo y rótulo. */
export function ZonaDemostracion({ children }: { children: ReactNode }) {
  return (
    <section className={estilos.demo} aria-label="Zona de demostración">
      <span className={estilos.demoTitulo}>
        <MdScience aria-hidden="true" /> Zona de demostración
      </span>
      {children}
    </section>
  );
}

interface FilaDatoProps {
  icono: ReactNode;
  valor: ReactNode;
  apoyo?: ReactNode;
  /** Nombre del dato para lectores de pantalla ("Fecha", "Lugar"). */
  etiqueta?: string;
}

/** Fila de dato: icono, valor y, opcionalmente, un texto de apoyo debajo. */
export function FilaDato({ icono, valor, apoyo, etiqueta }: FilaDatoProps) {
  return (
    <div className={estilos.dato}>
      <span aria-hidden="true">{icono}</span>
      <div>
        {etiqueta && <span className="sr-only">{etiqueta}: </span>}
        <div className={estilos.datoValor}>{valor}</div>
        {apoyo && <div className={estilos.datoApoyo}>{apoyo}</div>}
      </div>
    </div>
  );
}

/** Fila de importe para desgloses de pago. */
export function FilaImporte({
  concepto,
  importe,
  destacada,
}: {
  concepto: string;
  importe: string;
  destacada?: boolean;
}) {
  return (
    <div className={[estilos.importe, destacada ? estilos.importeDestacado : ''].join(' ')}>
      <span>{concepto}</span>
      <span>{importe}</span>
    </div>
  );
}

export function Divisor() {
  return <hr className={estilos.divisor} />;
}

/** Etiqueta compacta (chip de solo lectura). Combina color con texto y, si hace falta, icono. */
export function Etiqueta({ texto, tono = 'neutro', icono }: { texto: string; tono?: Tono; icono?: ReactNode }) {
  return (
    <span className={[estilos.etiqueta, claseTono[tono]].join(' ')}>
      {icono && <span aria-hidden="true">{icono}</span>}
      {texto}
    </span>
  );
}
